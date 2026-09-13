import pg from 'pg';

const DBS = {
  OLD: process.env.DATABASE_URL,
  NEW: process.env.DATABASE_URL,
};

for (const [name, url] of Object.entries(DBS)) {
  const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15000 });
  try {
    const { rows } = await pool.query('SELECT version(), current_database(), pg_database_size(current_database()) AS size');
    console.log(`[${name}] OK — ${rows[0].version.split(',')[0]} | db=${rows[0].current_database} | size=${(Number(rows[0].size) / 1024 / 1024).toFixed(1)} MB`);
  } catch (e) {
    console.log(`[${name}] FAIL — ${e.message}`);
  }
  try {
    const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
    console.log(`[${name}] tables: ${rows.map(r => r.table_name).join(', ') || '(none)'}`);
  } catch (e) {
    console.log(`[${name}] table listing FAIL — ${e.message}`);
  }
  await pool.end();
}
