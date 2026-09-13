#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  ARIA HUB — PORTABLE DB EXPORT (works with ANY PostgreSQL host)
//  Exports every table (schema-agnostic, pure data) to one JSON file.
//
//  Usage:
//    node scripts/db-export.mjs [--url "<postgres conn string>"] [--out path.json]
//    · --url defaults to DATABASE_URL env
//    · --out defaults to download/db-export-<timestamp>.json
//
//  Pair with scripts/db-import.mjs to move to a brand-new host:
//    1) node scripts/db-export.mjs --url "<OLD_HOST_URL>"
//    2) node scripts/db-import.mjs --url "<NEW_HOST_URL>" --file <export.json>
// ═══════════════════════════════════════════════════════════════════
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  return { url: get('--url') || process.env.DATABASE_URL, out: get('--out') };
}

const { url, out } = parseArgs();
if (!url) { console.error('✗ No connection string. Pass --url or set DATABASE_URL.'); process.exit(1); }

const pool = new pg.Pool({ connectionString: url, max: 3 });
const masked = url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');

console.log(`→ Exporting from: ${masked}`);
const t0 = Date.now();

const { rows: tblRows } = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name`);
const tables = tblRows.map(r => r.table_name).filter(t => t !== '_prisma_migrations');

const tablesOut = {};
let totalRows = 0;
for (const t of tables) {
  try {
    const { rows } = await pool.query(`SELECT * FROM "${t}"`);
    tablesOut[t] = rows;
    totalRows += rows.length;
    if (rows.length) console.log(`  ✓ ${t.padEnd(32)} ${String(rows.length).padStart(6)} rows`);
  } catch (e) {
    console.error(`  ✗ ${t}: ${e.message.split('\n')[0]}`);
    tablesOut[t] = [];
  }
}

const payload = {
  meta: {
    app: 'ARIA HUB',
    tool: 'scripts/db-export.mjs',
    exportedAt: new Date().toISOString(),
    source: masked,
    tableCount: tables.length,
    totalRows,
  },
  tables: tablesOut,
};

const outFile = out || `download/db-export-${new Date().toISOString().slice(0, 10)}.json`;
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(payload));
const mb = (JSON.stringify(payload).length / 1024 / 1024).toFixed(2);

console.log(`\n✓ EXPORTED ${totalRows} rows across ${tables.length} tables → ${outFile} (${mb} MB) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('  Next: node scripts/db-import.mjs --url "<NEW_HOST_URL>" --file ' + outFile);
await pool.end();
