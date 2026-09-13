import { Client } from 'pg';
const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();
const r = await c.query(`SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE "titleI18n"::text LIKE '%"fa"%')::int AS fa_titles
  FROM "Opportunity" WHERE status='published'`);
console.log('Published opps with fa:', JSON.stringify(r.rows[0]));
const s = await c.query(`SELECT title, "titleI18n"->>'fa' AS fa FROM "Opportunity" WHERE status='published' ORDER BY "updatedAt" DESC LIMIT 3`);
for (const row of s.rows) console.log('-', (row.title||'').slice(0,40), '→ fa:', (row.fa||'NULL').slice(0,50));
const st = await c.query('SELECT state FROM "AutomationState" LIMIT 1');
console.log('STATE:', JSON.stringify(st.rows[0]?.state)?.slice(0,220));
const runs = await c.query('SELECT kind, status, "startedAt" FROM "PipelineRun" ORDER BY "startedAt" DESC LIMIT 5');
for (const r2 of runs.rows) console.log('run:', r2.kind, r2.status, r2.startedAt.toISOString().slice(11,19));
await c.end();
