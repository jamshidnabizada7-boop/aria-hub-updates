import { Client } from 'pg';
const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();
const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%nav%' OR table_name ILIKE '%menu%' OR table_name ILIKE '%link%'");
console.log('nav-ish tables:', tables.rows.map(r=>r.table_name));
for (const t of tables.rows) {
  const q = await c.query(`SELECT * FROM "${t.table_name}" LIMIT 30`);
  console.log('---', t.table_name, '---');
  console.log(JSON.stringify(q.rows, null, 1).slice(0, 3000));
}
await c.end();
