import { Client } from 'pg';
const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();
const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='Page'");
console.log('Page columns:', cols.rows.map(r=>r.column_name).join(', '));
const rows = await c.query('SELECT slug, status, title, "titleI18n", LEFT(content,60) AS c_head, "contentI18n" IS NOT NULL AS has_ci FROM "Page" ORDER BY slug');
for (const r of rows.rows) console.log(`- ${r.slug} [${r.status}] title="${(r.title||'').slice(0,40)}" titleI18n=${JSON.stringify(r.titleI18n)?.slice(0,80)} contentI18n=${r.has_ci}`);
await c.end();
