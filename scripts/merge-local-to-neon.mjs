// Data merge: local curated content -> new Neon
// - Backup Neon demo opportunities to JSON
// - Replace 6 demo opportunities with 14 curated trilingual ones
// - Merge OpportunityCategory by slug (remap categoryId)
// - Merge News (+NewsCategory by slug), insert SuccessStories
import pg from 'pg';
import { writeFileSync } from 'fs';

const NEON = process.env.DATABASE_URL;
const LOCAL = 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';

const neon = new pg.Pool({ connectionString: NEON, max: 2 });
const local = new pg.Pool({ connectionString: LOCAL, max: 2 });

// fetch json columns per table so we can stringify safely
async function jsonCols(pool, table) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND data_type IN ('json','jsonb')`, [table]);
  return new Set(rows.map(r => r.column_name));
}

function prep(row, jsons) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (jsons.has(k) && v !== null && v !== undefined && typeof v === 'object') out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}

async function insertRow(pool, table, row) {
  const keys = Object.keys(row);
  const ph = keys.map((_, i) => `$${i + 1}`).join(',');
  const vals = keys.map(k => row[k]);
  await pool.query(`INSERT INTO "${table}" ("${keys.join('","')}") VALUES (${ph})`, vals);
}

async function main() {
  // 1. Backup + delete demo opportunities in Neon
  const { rows: demo } = await neon.query(`SELECT * FROM "Opportunity"`);
  writeFileSync('/home/z/my-project/download/neon-demo-opportunities-backup.json', JSON.stringify(demo, null, 2));
  console.log(`Backed up ${demo.length} demo opportunities -> download/neon-demo-opportunities-backup.json`);
  await neon.query(`DELETE FROM "Opportunity"`);
  console.log('Deleted demo opportunities in Neon');

  // 2. Category merge (by slug) with remap
  const oppJsons = await jsonCols(neon, 'Opportunity');
  const catJsons = await jsonCols(neon, 'OpportunityCategory');
  const { rows: neonCats } = await neon.query(`SELECT id, slug FROM "OpportunityCategory"`);
  const slugToNeonId = new Map(neonCats.map(c => [c.slug, c.id]));
  const { rows: localCats } = await local.query(`SELECT * FROM "OpportunityCategory"`);
  const localCatIdToTarget = new Map();
  let catsInserted = 0;
  for (const c of localCats) {
    if (slugToNeonId.has(c.slug)) {
      localCatIdToTarget.set(c.id, slugToNeonId.get(c.slug));
    } else {
      await insertRow(neon, 'OpportunityCategory', prep(c, catJsons));
      slugToNeonId.set(c.slug, c.id);
      localCatIdToTarget.set(c.id, c.id);
      catsInserted++;
    }
  }
  console.log(`Categories: ${localCats.length} local, ${catsInserted} new inserted into Neon, rest remapped`);

  // 3. Opportunities (14 curated, trilingual)
  const { rows: opps } = await local.query(`SELECT * FROM "Opportunity" ORDER BY "createdAt"`);
  let oppsInserted = 0;
  for (const o of opps) {
    const row = prep(o, oppJsons);
    row.categoryId = localCatIdToTarget.get(o.categoryId) || null;
    await insertRow(neon, 'Opportunity', row);
    oppsInserted++;
  }
  console.log(`Opportunities inserted: ${oppsInserted}`);

  // 4. News: merge categories by slug, skip news with existing slugs
  const newsJsons = await jsonCols(neon, 'News');
  const ncatJsons = await jsonCols(neon, 'NewsCategory');
  const { rows: neonNCats } = await neon.query(`SELECT id, slug FROM "NewsCategory"`);
  const nSlugToNeonId = new Map(neonNCats.map(c => [c.slug, c.id]));
  const { rows: localNCats } = await local.query(`SELECT * FROM "NewsCategory"`);
  const localNCatMap = new Map();
  let nCatsInserted = 0;
  for (const c of localNCats) {
    if (nSlugToNeonId.has(c.slug)) localNCatMap.set(c.id, nSlugToNeonId.get(c.slug));
    else {
      await insertRow(neon, 'NewsCategory', prep(c, ncatJsons));
      nSlugToNeonId.set(c.slug, c.id);
      localNCatMap.set(c.id, c.id);
      nCatsInserted++;
    }
  }
  const { rows: neonNewsSlugs } = await neon.query(`SELECT slug FROM "News"`);
  const existingSlugs = new Set(neonNewsSlugs.map(r => r.slug));
  const { rows: localNews } = await local.query(`SELECT * FROM "News" ORDER BY "publishedAt" DESC NULLS LAST`);
  let newsInserted = 0, newsSkipped = 0;
  for (const n of localNews) {
    if (existingSlugs.has(n.slug)) { newsSkipped++; continue; }
    const row = prep(n, newsJsons);
    row.categoryId = localNCatMap.get(n.categoryId) || null;
    await insertRow(neon, 'News', row);
    existingSlugs.add(n.slug);
    newsInserted++;
  }
  console.log(`News: ${newsInserted} inserted, ${newsSkipped} skipped (slug exists); categories +${nCatsInserted}`);

  // 5. Success stories
  const ssJsons = await jsonCols(neon, 'SuccessStory');
  const { rows: stories } = await local.query(`SELECT * FROM "SuccessStory"`);
  let ssInserted = 0;
  for (const s of stories) {
    const row = prep(s, ssJsons);
    // new columns added by schema sync: fill sane defaults
    if (row.storyType === undefined || row.storyType === null) row.storyType = 'other';
    if (row.featured === undefined || row.featured === null) row.featured = false;
    await insertRow(neon, 'SuccessStory', row);
    ssInserted++;
  }
  console.log(`Success stories inserted: ${ssInserted}`);

  // 6. Post-verify
  const checks = ['Opportunity', 'OpportunityCategory', 'News', 'NewsCategory', 'SuccessStory'];
  console.log('\n=== POST-MERGE COUNTS (Neon) ===');
  for (const t of checks) {
    const { rows } = await neon.query(`SELECT COUNT(*)::int c FROM "${t}"`);
    console.log(`${t}: ${rows[0].c}`);
  }
  const { rows: sample } = await neon.query(`SELECT title, "titleI18n"->>'fa' AS fa, "aiSummaryI18n"->>'ps' AS ps FROM "Opportunity" LIMIT 3`);
  console.log('\n=== TRILINGUAL SPOT-CHECK (Neon) ===');
  sample.forEach(r => console.log(`- ${r.title}\n  fa: ${String(r.fa).slice(0, 60)}\n  ps: ${String(r.ps).slice(0, 60)}`));

  const { rows: orphan } = await neon.query(`SELECT COUNT(*)::int c FROM "Opportunity" o LEFT JOIN "OpportunityCategory" c ON o."categoryId"=c.id WHERE c.id IS NULL AND o."categoryId" IS NOT NULL`);
  console.log(`\nOrphan opportunities (bad categoryId): ${orphan[0].c}`);

  await neon.end(); await local.end();
  console.log('\nMERGE COMPLETE');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
