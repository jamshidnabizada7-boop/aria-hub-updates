import { Client } from 'pg';
const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();
const r = await c.query('SELECT id, "suffixI18n" FROM "Counter"');
for (const row of r.rows) console.log(row.id.slice(-6), JSON.stringify(row.suffixI18n));
await c.end();
