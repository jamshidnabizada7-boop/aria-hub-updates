import { Client } from 'pg';
const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();

async function count(table, where = '') {
  const q = await c.query(`SELECT COUNT(*)::int AS n FROM "${table}" ${where}`);
  return q.rows[0].n;
}

// Opportunities translation coverage
const oppTotal = await count('Opportunity');
const oppPublished = await count('Opportunity', 'WHERE status = \'published\'');
const r = await c.query(`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE "titleI18n"::text LIKE '%"fa"%' AND "titleI18n"::text <> '{}')::int AS has_fa,
    COUNT(*) FILTER (WHERE "titleI18n"::text LIKE '%"ps"%')::int AS has_ps,
    COUNT(*) FILTER (WHERE "descriptionI18n"::text LIKE '%"fa"%')::int AS desc_fa,
    COUNT(*) FILTER (WHERE "descriptionI18n"::text LIKE '%"ps"%')::int AS desc_ps
  FROM "Opportunity" WHERE status = 'published'`);
console.log('Opportunity (published):', JSON.stringify(r.rows[0]));

// News
const newsRows = await c.query(`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status='published')::int AS published,
    COUNT(*) FILTER (WHERE "titleI18n"::text LIKE '%"fa"%')::int AS fa,
    COUNT(*) FILTER (WHERE "titleI18n"::text LIKE '%"ps"%')::int AS ps
  FROM "News"`);
console.log('News:', JSON.stringify(newsRows.rows[0]));

// VisaProgram / other content tables
const tables = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
console.log('\nAll tables:', tables.rows.map(x => x.table_name).join(', '));

// Sample untranslated opportunities (published)
const sample = await c.query(`
  SELECT id, slug, title, "titleI18n", "descriptionI18n" IS NOT NULL AS has_desc
  FROM "Opportunity" WHERE status='published' AND ("titleI18n"::text NOT LIKE '%"fa"%' OR "titleI18n" IS NULL)
  LIMIT 5`);
console.log('\nSample published opps WITHOUT fa title translation:');
for (const s of sample.rows) console.log(' -', s.slug, '|', (s.title||'').slice(0,60), '| titleI18n:', JSON.stringify(s.titleI18n));
await c.end();
