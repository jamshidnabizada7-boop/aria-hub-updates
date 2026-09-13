import pg from 'pg';
const { Client } = pg;
const local = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
const neon = new Client({ connectionString: process.env.DATABASE_URL });
await local.connect();
await neon.connect();

const miss = (await local.query(
  `SELECT id, slug, "categoryId" FROM "Opportunity" ORDER BY "importedAt" DESC LIMIT 5`,
)).rows;
console.log('checked', miss.length, 'local rows');
for (const r of miss) {
  const exists = await neon.query(`SELECT id FROM "Opportunity" WHERE id = $1`, [r.id]);
  let cat = 'null';
  if (r.categoryId) {
    const catRow = await neon.query(`SELECT slug FROM "OpportunityCategory" WHERE id = $1`, [r.categoryId]);
    cat = catRow.rows[0] ? 'OK' : 'MISSING:' + r.categoryId;
  }
  const slugClash = await neon.query(`SELECT id FROM "Opportunity" WHERE slug = $1 AND id <> $2`, [r.slug, r.id]);
  console.log(
    r.slug.slice(0, 40).padEnd(42),
    'inNeon=' + (exists.rowCount > 0),
    'cat=' + cat,
    'slugClash=' + (slugClash.rows[0] ? slugClash.rows[0].id.slice(0, 8) : 'no'),
  );
}
await local.end();
await neon.end();
