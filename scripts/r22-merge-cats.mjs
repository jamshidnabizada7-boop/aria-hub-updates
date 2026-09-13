import pg from 'pg';
const { Client } = pg;
const url = process.argv[2];
const c = new Client({ connectionString: url });
await c.connect();
const MAP = {
  jobs: 'job', scholarships: 'scholarship', fellowships: 'fellowship',
  internships: 'internship', trainings: 'training', conferences: 'conference',
  'exchange-programs': 'exchange-program',
};
for (const [plural, singular] of Object.entries(MAP)) {
  const g = await c.query(`SELECT id FROM "OpportunityCategory" WHERE slug=$1`, [plural]);
  const s = await c.query(`SELECT id FROM "OpportunityCategory" WHERE slug=$1`, [singular]);
  if (!g.rows[0] || !s.rows[0]) { console.log(`skip ${plural}→${singular} (missing)`); continue; }
  const u = await c.query(`UPDATE "Opportunity" SET "categoryId"=$1 WHERE "categoryId"=$2 RETURNING id`, [s.rows[0].id, g.rows[0].id]);
  await c.query(`DELETE FROM "OpportunityCategory" WHERE id=$1`, [g.rows[0].id]);
  console.log(`merged ${plural} → ${singular}: ${u.rowCount} rows moved`);
}
await c.end();
