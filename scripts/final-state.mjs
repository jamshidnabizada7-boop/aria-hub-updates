import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const { rows: tables } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
let nonEmpty = 0, total = 0;
for (const { table_name } of tables) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int c FROM "${table_name.replace(/"/g,'""')}"`);
  total += rows[0].c;
  if (rows[0].c > 0) nonEmpty++;
}
console.log(`Tables: ${tables.length} | Non-empty: ${nonEmpty} | Total rows: ${total}`);
const { rows: tril } = await pool.query(`SELECT COUNT(*)::int c FROM "Opportunity" WHERE "titleI18n"->>'fa' IS NOT NULL AND "titleI18n"->>'ps' IS NOT NULL`);
console.log(`Opportunities with fa+ps translations: ${tril[0].c}/14`);
await pool.end();
