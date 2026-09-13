import pg from 'pg';
const url = process.env.DATABASE_URL;
const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 });
try {
  await c.connect();
  const opp = await c.query(`SELECT COUNT(*) FILTER (WHERE "titleI18n"::text LIKE '%"fa"%')::int AS fa_titles, COUNT(*)::int AS total FROM "Opportunity"`);
  console.log('NEON OK — Opportunity rows:', opp.rows[0]);
  const page = await c.query(`SELECT slug, "titleI18n" IS NOT NULL AS has_t FROM "Page"`);
  console.log('NEON Pages:', page.rows);
} catch (e) {
  console.log('NEON FAIL:', (e.message || e).slice(0, 160));
} finally { try { await c.end(); } catch {} }
