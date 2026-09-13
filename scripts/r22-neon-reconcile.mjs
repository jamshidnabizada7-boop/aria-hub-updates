#!/usr/bin/env node
/**
 * R22 Neon reconcile — insert missing Opportunity rows (and any missing
 * ImportRun rows) into Neon with categoryId remapped BY SLUG (local and Neon
 * category ids diverge since R17's slug-based merge; db-import.mjs is
 * id-preserving so those rows 23503'd and were skipped).
 *
 * Idempotent: only rows missing in Neon (by id) are inserted.
 */
import pg from 'pg';
const { Client } = pg;

const LOCAL = 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';
const NEON = process.argv[2] || process.env.DATABASE_URL;

const a = new Client({ connectionString: LOCAL });
const b = new Client({ connectionString: NEON });
await a.connect();
await b.connect();

// category maps
const localCats = (await a.query(`SELECT id, slug FROM "OpportunityCategory"`)).rows;
const neonCats = (await b.query(`SELECT id, slug FROM "OpportunityCategory"`)).rows;
const localBySlug = new Map(localCats.map((c) => [c.slug, c.id]));
const neonIdBySlug = new Map(neonCats.map((c) => [c.slug, c.id]));
console.log(`categories: local=${localCats.length} neon=${neonCats.length}`);

// columns of Opportunity
const cols = (await b.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name='Opportunity' AND table_schema='public'`)).rows;
const colNames = cols.map((c) => c.column_name);
const jsonCols = new Set(cols.filter((c) => c.data_type === 'json' || c.data_type === 'jsonb').map((c) => c.column_name));

const localRows = (await a.query(`SELECT * FROM "Opportunity"`)).rows;
const neonIds = new Set((await b.query(`SELECT id FROM "Opportunity"`)).rows.map((r) => r.id));
const neonSlugs = new Set((await b.query(`SELECT slug FROM "Opportunity"`)).rows.map((r) => r.slug));

let inserted = 0, slugSkipped = 0, failed = 0, catFixed = 0;
for (const row of localRows) {
  if (neonIds.has(row.id)) continue;
  if (neonSlugs.has(row.slug)) { slugSkipped++; continue; }
  // remap category by slug
  let catId = row.categoryId;
  if (catId) {
    const localSlug = localBySlug.get(catId);
    catId = localSlug ? (neonIdBySlug.get(localSlug) || null) : null;
    if (!catId) catFixed++;
  }
  const values = colNames.map((cn) => {
    let v = row[cn];
    if (cn === 'categoryId') v = catId;
    if (jsonCols.has(cn) && v !== null && typeof v === 'object') v = JSON.stringify(v);
    return v;
  });
  const ph = colNames.map((_, i) => `$${i + 1}`).join(',');
  try {
    await b.query(
      `INSERT INTO "Opportunity" (${colNames.map((c) => `"${c}"`).join(',')}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`,
      values,
    );
    inserted++;
    neonSlugs.add(row.slug);
  } catch (e) {
    failed++;
    if (failed <= 3) console.error(`  ✗ ${row.slug}: ${e.message.split('\n')[0]}`);
  }
}
console.log(`Opportunity: inserted=${inserted} slugSkipped=${slugSkipped} categoryDropped=${catFixed} failed=${failed}`);

// ImportRun drift (cosmetic provenance)
const localRuns = (await a.query(`SELECT * FROM "ImportRun"`)).rows;
const neonRunIds = new Set((await b.query(`SELECT id FROM "ImportRun"`)).rows.map((r) => r.id));
const runCols = (await b.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='ImportRun' AND table_schema='public'`)).rows;
const runColNames = runCols.map((c) => c.column_name);
const runJsonCols = new Set(runCols.filter((c) => c.data_type === 'json' || c.data_type === 'jsonb').map((c) => c.column_name));
let runsIn = 0;
for (const r of localRuns) {
  if (neonRunIds.has(r.id)) continue;
  const values = runColNames.map((cn) => {
    let v = r[cn];
    if (runJsonCols.has(cn) && v !== null && typeof v === 'object') v = JSON.stringify(v);
    return v;
  });
  const ph = runColNames.map((_, i) => `$${i + 1}`).join(',');
  try {
    await b.query(`INSERT INTO "ImportRun" (${runColNames.map((c) => `"${c}"`).join(',')}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`, values);
    runsIn++;
  } catch { /* cosmetic */ }
}
console.log(`ImportRun: inserted=${runsIn}`);

// final parity count
const n = (await b.query(`SELECT count(*)::int opp, (SELECT count(*)::int FROM "Opportunity" WHERE status='published') pub FROM "Opportunity"`)).rows[0];
const l = (await a.query(`SELECT count(*)::int opp FROM "Opportunity"`)).rows[0];
console.log(`FINAL: local=${l.opp} neon=${n.opp} (published ${n.pub})`);

await a.end();
await b.end();
