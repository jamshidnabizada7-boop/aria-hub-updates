/**
 * i18n-audit.mjs — dynamic scanner for missing fa/ps cells across ALL tables.
 *
 * Scans information_schema for every table + column matching '%I18n%' (json/jsonb),
 * pairs it with its sibling base column (xI18n → x), and counts a row as MISSING
 * when the base column (or an existing en member) has content but fa or ps is
 * absent/empty in the JSON. Rows whose base AND en are all empty are skipped
 * (nothing to translate).
 *
 * Usage:
 *   node scripts/i18n-audit.mjs                     # local DB (from .env)
 *   node scripts/i18n-audit.mjs <postgres-url>      # explicit URL
 *   --verbose   per-column detail
 */
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function resolveDatabaseUrl() {
  const argUrl = process.argv.slice(2).find((a) => a.startsWith('postgres'));
  if (argUrl) return argUrl;
  const envUrl = process.env.DATABASE_URL || '';
  if (envUrl.startsWith('postgres')) return envUrl;
  try {
    const raw = readFileSync(join(here, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const v = m[1].trim().replace(/^["']|["']$/g, '');
      if (v.startsWith('postgres')) return v;
    }
  } catch { /* fallthrough */ }
  throw new Error('No PostgreSQL URL found (pass as argv or set DATABASE_URL)');
}

const url = resolveDatabaseUrl();
const pool = new pg.Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 15000 });
const VERBOSE = process.argv.includes('--verbose');

const qi = (id) => `"${id.replace(/"/g, '""')}"`;

try {
  const { rows: cols } = await pool.query(`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name LIKE '%I18n%'
      AND c.data_type IN ('json', 'jsonb')
    ORDER BY c.table_name, c.column_name
  `);

  // discover which sibling base columns exist
  const { rows: allCols } = await pool.query(`
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  `);
  const colExists = (table, col) => allCols.some((r) => r.table_name === table && r.column_name === col);

  let totalCells = 0, totalMissing = 0;
  const report = [];

  for (const { table_name, column_name } of cols) {
    const base = column_name.replace(/I18n$/, '');
    const hasBase = colExists(table_name, base);
    const baseType = hasBase ? allCols.find((r) => r.table_name === table_name && r.column_name === base).data_type : null;
    const t = qi(table_name), c = qi(column_name);
    // text-ify the base column: json → text, arrays → text, else plain
    const baseExpr = !hasBase ? 'NULL'
      : baseType.includes('json') ? `NULLIF(${qi(base)}::text, '')`
      : baseType === 'ARRAY' ? `NULLIF(array_to_string(${qi(base)}, ', '), '')`
      : `NULLIF(${qi(base)}::text, '')`;

    try {
      const { rows } = await pool.query(`
        SELECT
          count(*) FILTER (WHERE (NULLIF(${c}::text, 'null') IS NOT NULL
                AND EXISTS (SELECT 1 FROM jsonb_each_text(${c}::jsonb) e WHERE e.value <> ''))
              OR ${baseExpr} IS NOT NULL)::int AS total,
          count(*) FILTER (WHERE ((NULLIF(${c}::text, 'null') IS NOT NULL
                AND EXISTS (SELECT 1 FROM jsonb_each_text(${c}::jsonb) e WHERE e.value <> ''))
              OR ${baseExpr} IS NOT NULL)
            AND (NOT (${c}::jsonb ->> 'fa' IS NOT NULL AND ${c}::jsonb ->> 'fa' <> '')
              OR NOT (${c}::jsonb ->> 'ps' IS NOT NULL AND ${c}::jsonb ->> 'ps' <> '')))::int AS missing,
          count(*) FILTER (WHERE ${baseExpr} IS NOT NULL
            AND NOT (${c}::jsonb ->> 'fa' IS NOT NULL AND ${c}::jsonb ->> 'fa' <> ''))::int AS fa_missing,
          count(*) FILTER (WHERE ${baseExpr} IS NOT NULL
            AND NOT (${c}::jsonb ->> 'ps' IS NOT NULL AND ${c}::jsonb ->> 'ps' <> ''))::int AS ps_missing
        FROM ${t}
      `);
      const { total, missing, fa_missing, ps_missing } = rows[0];
      totalCells += total;
      totalMissing += missing;
      if (missing > 0 || (VERBOSE && total > 0)) {
        report.push({ table: table_name, column: column_name, hasBase, total, missing, fa_missing, ps_missing });
      }
    } catch (e) {
      console.log(`  ! ${table_name}.${column_name}: ${(e.message || String(e)).slice(0, 100)}`);
    }
  }

  console.log('=== i18n completeness audit ===');
  console.log(`db: ${url.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(`i18n columns scanned: ${cols.length}`);
  console.log(`total fillable i18n cells (rows with base content): ${totalCells}`);
  console.log(`cells missing fa or ps: ${totalMissing} (${totalCells ? ((100 - (totalMissing / totalCells) * 100)).toFixed(1) : 0}% complete)`);
  console.log('');
  if (report.length) {
    console.log('MISSING BREAKDOWN (table.column → missing fa or ps):');
    for (const m of report.sort((a, b) => b.missing - a.missing)) {
      console.log(`  ${m.table}.${m.column} → ${m.missing}/${m.total} missing (fa miss ${m.fa_missing}, ps miss ${m.ps_missing})${m.hasBase ? '' : '  [NO BASE COLUMN]'}`);
    }
  } else {
    console.log('✅ COMPLETE — every fillable i18n cell has fa + ps.');
  }
} finally {
  await pool.end();
}
