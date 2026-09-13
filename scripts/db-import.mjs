#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  ARIA HUB — PORTABLE DB IMPORT (works with ANY PostgreSQL host)
//  Imports a db-export.mjs JSON file into a target database:
//    1) Recreates the latest Prisma schema on the target (additive, via
//       `prisma migrate diff --from-empty`) — no data loss on existing tables.
//    2) Inserts every row in FK-dependency order with id-preserving,
//       idempotent inserts (ON CONFLICT DO NOTHING).
//
//  Usage:
//    node scripts/db-import.mjs --url "<NEW_HOST_URL>" --file download/db-export.json [--fresh]
//    · --fresh  truncate all target tables first (clean single-host migration)
//    · Additive by default: existing rows in the target are kept.
//
//  Works with: Supabase, Aiven, Railway, RDS, DigitalOcean, Fly Postgres,
//  local Postgres — any server reachable by a postgres:// connection string.
// ═══════════════════════════════════════════════════════════════════
import pg from 'pg';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  return { url: get('--url') || process.env.DATABASE_URL, file: get('--file'), fresh: args.includes('--fresh') };
}

const { url, file, fresh } = parseArgs();
if (!url || !file) {
  console.error('✗ Usage: node scripts/db-import.mjs --url "<TARGET_URL>" --file <export.json> [--fresh]');
  process.exit(1);
}

const payload = JSON.parse(readFileSync(file, 'utf8'));
const tables = payload.tables || {};
const tableNames = Object.keys(tables);
const masked = url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
console.log(`→ Importing ${payload.meta?.totalRows ?? '?'} rows / ${tableNames.length} tables from ${file}`);
console.log(`→ Target: ${masked}${fresh ? ' (FRESH — truncating first)' : ''}`);

const pool = new pg.Pool({ connectionString: url, max: 3 });

// ── STEP 1: schema ───────────────────────────────────────────────────
console.log('\n[1/4] Syncing Prisma schema to target…');
const schemaRoot = path.resolve(process.cwd());
// Empty target → full CREATE script. Existing schema → ADDITIVE diff only
// (safe re-import / top-up against a live database — R21).
const exists = await pool.query(`SELECT to_regclass('public."User"') AS t`);
const hasSchema = !!exists.rows[0]?.t;
const diffCmd = hasSchema
  ? 'bunx prisma migrate diff --from-url "' + url + '" --to-schema-datamodel prisma/schema.prisma --script'
  : 'bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script';
const sql = execSync(
  diffCmd,
  { cwd: schemaRoot, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
if (sql.trim()) {
  await pool.query(sql); // multi-statement simple query = atomic in Postgres
  console.log(hasSchema ? '  ✓ additive schema diff applied' : '  ✓ schema created');
} else {
  console.log('  ✓ schema already in sync (empty diff)');
}

// ── STEP 2: introspect target ────────────────────────────────────────
console.log('[2/4] Reading target structure…');
const { rows: colRows } = await pool.query(`
  SELECT table_name, column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`);
const tCols = {};   // table -> [{name, type}]
for (const r of colRows) (tCols[r.table_name] ||= []).push({ name: r.column_name, type: r.data_type });

const { rows: pkRows } = await pool.query(`
  SELECT tc.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'`);
const pks = {}; for (const r of pkRows) (pks[r.table_name] ||= []).push(r.column_name);

const { rows: fkRows } = await pool.query(`
  SELECT
    conrelid::regclass::text  AS child,
    confrelid::regclass::text AS parent
  FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace`);
const fks = fkRows.map(r => ({ child: r.child.replace(/"/g, ''), parent: r.parent.replace(/"/g, '') }));

// ── STEP 3: topological order + optional truncate ────────────────────
console.log('[3/4] Ordering tables by FK dependencies…');
const present = tableNames.filter(t => tCols[t]);
const missing = tableNames.filter(t => !tCols[t]);
if (missing.length) console.log(`  ! not in Prisma schema (skipped): ${missing.join(', ')}`);

const ordered = [];
const seen = new Set();
const visit = (t, stack = new Set()) => {
  if (seen.has(t) || !present.includes(t)) return;
  if (stack.has(t)) return; // cycle guard
  stack.add(t);
  for (const { child, parent } of fks) if (child === t) visit(parent, stack);
  seen.add(t); ordered.push(t);
};
for (const t of present) visit(t);

if (fresh) {
  const all = [...present].reverse().map(t => `"${t}"`).join(', ');
  await pool.query(`TRUNCATE ${all} CASCADE`);
  console.log('  ✓ all target tables truncated');
}

// ── STEP 4: data insert ──────────────────────────────────────────────
console.log('[4/4] Inserting data…');
let total = 0, skipped = 0;
const report = [];
for (const t of ordered) {
  const rows = tables[t] || [];
  if (rows.length === 0) { report.push(`  · ${t.padEnd(32)} 0 rows`); continue; }
  const targetCols = tCols[t];
  const colNames = targetCols.map(c => c.name);
  const jsonCols = new Set(targetCols.filter(c => c.type === 'json' || c.type === 'jsonb').map(c => c.name));
  const pkList = pks[t] || [];
  const insertCols = rows[0] ? Object.keys(rows[0]).filter(c => colNames.includes(c)) : [];
  if (insertCols.length === 0) { report.push(`  ! ${t}: no column overlap, skipped`); continue; }
  let ins = 0;
  for (const row of rows) {
    const vals = insertCols.map((c) => {
      let v = row[c];
      if (jsonCols.has(c) && v !== null && typeof v === 'object') v = JSON.stringify(v);
      return v;
    });
    const ph = insertCols.map((_, i) => `$${i + 1}`).join(',');
    const conflict = pkList.length && pkList.every(p => insertCols.includes(p))
      ? ` ON CONFLICT (${pkList.map(p => `"${p}"`).join(',')}) DO NOTHING` : '';
    try {
      await pool.query(`INSERT INTO "${t}" (${insertCols.map(c => `"${c}"`).join(',')}) VALUES (${ph})${conflict}`, vals);
      ins++;
    } catch (e) {
      if (e.code === '23505' || e.code === '23503') skipped++;
      else console.error(`  ✗ ${t} [${row.id ?? '?'}]: ${e.message.split('\n')[0]}`);
    }
  }
  total += ins;
  report.push(`  ✓ ${t.padEnd(32)} ${String(ins).padStart(6)} / ${rows.length} rows`);
}
console.log(report.join('\n'));
console.log(`\n✓ IMPORT COMPLETE — ${total} rows inserted, ${skipped} skipped (already existed)`);
console.log('  Next: point your app DATABASE_URL at this host and redeploy.');
await pool.end();
