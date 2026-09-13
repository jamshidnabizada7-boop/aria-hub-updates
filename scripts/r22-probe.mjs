// R22 probe: current import sources + opportunity state
import { Client } from 'pg';

const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();

const src = await c.query(
  `SELECT name, type, "scraperKey", "baseUrl", enabled, "autoPublish", "lastRunAt", "lastRunStatus" FROM "ImportSource" ORDER BY name`,
);
console.log('=== IMPORT SOURCES ===');
for (const r of src.rows) {
  console.log(
    `${r.enabled ? '✓' : '✗'} ${r.name} | ${r.type} | key=${r.scraperKey} | auto=${r.autoPublish} | last=${r.lastRunAt ? new Date(r.lastRunAt).toISOString().slice(0, 16) : 'never'} ${r.lastRunStatus || ''}`,
  );
  console.log(`   ${r.baseUrl}`);
}

const byStatus = await c.query(`SELECT status, count(*)::int AS n FROM "Opportunity" GROUP BY status`);
console.log('\n=== OPPORTUNITY BY STATUS ===', byStatus.rows);

const bySource = await c.query(
  `SELECT "sourceName", count(*)::int AS n, count(*) FILTER (WHERE status='published')::int AS pub, count(*) FILTER (WHERE "deadline" >= NOW())::int AS live FROM "Opportunity" WHERE "sourceName" IS NOT NULL GROUP BY 1 ORDER BY n DESC`,
);
console.log('\n=== BY SOURCE ===', bySource.rows);

const dl = await c.query(
  `SELECT count(*) FILTER (WHERE deadline < NOW())::int AS expired, count(*) FILTER (WHERE deadline >= NOW())::int AS live, count(*) FILTER (WHERE deadline IS NULL)::int AS none FROM "Opportunity"`,
);
console.log('\n=== DEADLINES ===', dl.rows[0]);

const tr = await c.query(
  `SELECT count(*)::int AS total,
     count(*) FILTER (WHERE "titleI18n"->>'fa' IS NOT NULL AND "titleI18n"->>'fa' <> '')::int AS fa_title,
     count(*) FILTER (WHERE "titleI18n"->>'ps' IS NOT NULL AND "titleI18n"->>'ps' <> '')::int AS ps_title,
     count(*) FILTER (WHERE "aiSummaryI18n"->>'fa' IS NOT NULL AND "aiSummaryI18n"->>'fa' <> '')::int AS fa_sum,
     count(*) FILTER (WHERE "aiSummaryI18n"->>'ps' IS NOT NULL AND "aiSummaryI18n"->>'ps' <> '')::int AS ps_sum
   FROM "Opportunity"`,
);
console.log('\n=== TRILINGUAL COVERAGE ===', tr.rows[0]);

const recent = await c.query(
  `SELECT slug, "importStatus", "translationStatus", status, deadline, "importedAt" FROM "Opportunity" WHERE "importedAt" > NOW() - INTERVAL '3 days' ORDER BY "importedAt" DESC LIMIT 12`,
);
console.log('\n=== RECENT IMPORTS (last 3d) ===');
for (const r of recent.rows) console.log(` ${r.importStatus}/${r.translationStatus}/${r.status} ${r.slug} dl=${r.deadline ? 'y' : 'n'}`);

await c.end();
