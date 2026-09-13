#!/usr/bin/env node
/**
 * Read-only duplicate report for the Opportunity table.
 *
 * Run this BEFORE applying the `sourceUrl @unique` migration on a database
 * that may hold duplicates (the constraint fails if any exist). It lists:
 *   1. rows sharing the same sourceUrl (the constraint blocker)
 *   2. same-source rows with identical normalized title+organization
 *      (fuzzy-dedupe leftovers)
 *
 * Usage: bun run scripts/duplicate-report.mjs
 * Requires DATABASE_URL in the environment or .env (postgres:// only).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

function resolveDatabaseUrl() {
  const envUrl = process.env.DATABASE_URL || '';
  if (envUrl.startsWith('postgres')) return envUrl;
  try {
    const raw = readFileSync(join(process.cwd(), '.env'), 'utf8');
    const m = raw.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/m);
    const v = m?.[1]?.trim().replace(/^["']|["']$/g, '') || '';
    if (v.startsWith('postgres')) return v;
  } catch { /* fallthrough */ }
  throw new Error('No PostgreSQL DATABASE_URL found');
}

const pool = new pg.Pool({ connectionString: resolveDatabaseUrl(), max: 1 });

const byUrl = await pool.query(`
  SELECT "sourceUrl", count(*) AS n,
         min(id::text) AS example_keep, max("lastChecked") AS newest
  FROM "Opportunity" WHERE "sourceUrl" IS NOT NULL
  GROUP BY "sourceUrl" HAVING count(*) > 1
  ORDER BY n DESC LIMIT 50`);

const byTitle = await pool.query(`
  SELECT lower(regexp_replace(title, '\\s+', ' ', 'g')) AS title_key,
         coalesce(lower("sourceName"), '') AS src, count(*) AS n
  FROM "Opportunity"
  WHERE status IN ('published','draft')
  GROUP BY 1, 2 HAVING count(*) > 1
  ORDER BY n DESC LIMIT 50`);

console.log(`== sourceUrl duplicates: ${byUrl.rowCount} group(s)`);
for (const r of byUrl.rows) {
  console.log(`  ${r.n}x  ${r.sourceUrl}`);
  const ids = await pool.query(
    `SELECT id::text, title, "importStatus", "lastChecked" FROM "Opportunity"
     WHERE "sourceUrl" = $1 ORDER BY "lastChecked" DESC NULLS LAST`,
    [r.sourceUrl],
  );
  for (const row of ids.rows) {
    console.log(`      keep-newest → ${row.id}  [${row.importStatus}]  ${row.title?.slice(0, 60)}  (checked ${row.lastChecked?.toISOString?.() ?? 'never'})`);
  }
}

console.log(`\n== same-source title duplicates: ${byTitle.rowCount} group(s)`);
for (const r of byTitle.rows.slice(0, 20)) {
  console.log(`  ${r.n}x  [${r.src}]  ${r.title_key.slice(0, 80)}`);
}

if (!byUrl.rowCount && !byTitle.rowCount) {
  console.log('\n✓ No duplicates — safe to apply the sourceUrl unique constraint.');
}
await pool.end();
