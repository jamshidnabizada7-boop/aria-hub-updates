import pg from 'pg';
const { Client } = pg;
const local = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
const neon = new Client({ connectionString: process.env.DATABASE_URL });
await local.connect(); await neon.connect();
const tables = (await local.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`)).rows.map(r => r.table_name);
let drift = 0;
for (const t of tables) {
  const l = (await local.query(`SELECT count(*)::int n FROM "${t}"`)).rows[0].n;
  const n = (await neon.query(`SELECT count(*)::int n FROM "${t}"`)).rows[0].n;
  if (l !== n) { console.log(`${t.padEnd(30)} local=${l} neon=${n} diff=${l - n}`); drift += Math.abs(l - n); }
}
console.log(drift === 0 ? 'FULL PARITY' : `total drift: ${drift}`);
await local.end(); await neon.end();
