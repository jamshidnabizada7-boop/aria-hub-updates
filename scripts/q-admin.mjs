import { Client } from 'pg';
const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();
const r = await c.query('SELECT email, role FROM "AdminUser" LIMIT 3');
console.log(JSON.stringify(r.rows));
await c.end();
