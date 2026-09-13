import { Client } from 'pg';
const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();
const r = await c.query('SELECT * FROM "Language" ORDER BY "order"');
console.log(JSON.stringify(r.rows, null, 1));
await c.end();
