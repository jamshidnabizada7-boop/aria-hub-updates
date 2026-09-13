import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable', max: 1 });
const { rows } = await pool.query(`SELECT slug, status FROM "Opportunity" ORDER BY "createdAt" DESC LIMIT 20`);
rows.forEach(r => console.log(`${r.slug.padEnd(50)} ${r.status}`));
await pool.end();
