#!/usr/bin/env node
/** Patch Neon Opportunity.categoryId from local by row id, remapping the
 *  local category id → slug → Neon category id. */
import pg from 'pg';
const { Client } = pg;

const a = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
const b = new Client({ connectionString: process.argv[2] || process.env.DATABASE_URL });
await a.connect();
await b.connect();

const localCats = (await a.query(`SELECT id, slug FROM "OpportunityCategory"`)).rows;
const neonCats = (await b.query(`SELECT id, slug FROM "OpportunityCategory"`)).rows;
const localIdToSlug = new Map(localCats.map((c) => [c.id, c.slug]));
const neonIdBySlug = new Map(neonCats.map((c) => [c.slug, c.id]));

// rows in Neon whose category is null but local has one
const rows = (await b.query(`
  SELECT n.id, n.slug FROM "Opportunity" n
  WHERE n."categoryId" IS NULL

`)).rows;
// fetch local categories for those ids
let patched = 0, unmapped = 0;
for (const r of rows) {
  const l = await a.query(`SELECT "categoryId" FROM "Opportunity" WHERE id=$1`, [r.id]);
  const localCat = l.rows[0]?.categoryId;
  if (!localCat) continue;
  const slug = localIdToSlug.get(localCat);
  const neonCat = slug ? neonIdBySlug.get(slug) : null;
  if (neonCat) {
    await b.query(`UPDATE "Opportunity" SET "categoryId"=$1 WHERE id=$2`, [neonCat, r.id]);
    patched++;
  } else {
    unmapped++;
    if (unmapped <= 5) console.log('  unmapped:', r.slug.slice(0, 40), 'localCat=', localCat, 'slug=', slug);
  }
}
console.log(`patched categoryId on ${patched} Neon rows; unmapped=${unmapped}`);
const left = (await b.query(`SELECT count(*)::int n FROM "Opportunity" WHERE "categoryId" IS NULL AND "sourceName" IS NOT NULL`)).rows[0];
console.log(`Neon scraped rows still without category: ${left.n}`);
await a.end();
await b.end();
