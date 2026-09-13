// Quick check of last run + imported rows for a source
import { Client } from 'pg';
const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();
const r = await c.query(
  `SELECT "lastRunStatus", "lastRunStats" FROM "ImportSource" WHERE name = $1`,
  [process.argv[2] || 'Opportunities For Youth'],
);
console.log('run status:', r.rows[0]);
const s = await c.query(
  `SELECT slug, status, deadline::date AS dl, "translationStatus", ("titleI18n"->>'fa') IS NOT NULL AS fa
   FROM "Opportunity" WHERE "sourceName" = $1 ORDER BY "importedAt" DESC LIMIT 6`,
  [process.argv[2] || 'Opportunities For Youth'],
);
console.log('rows:', s.rows.length);
for (const x of s.rows) console.log(` ${x.status} dl=${x.dl?.toISOString().slice(0, 10) ?? '-'} tr=${x.translationStatus} fa=${x.fa} ${x.slug}`);
const d = await c.query(
  `SELECT count(*)::int AS expired FROM "Opportunity" WHERE "sourceName" = $1 AND deadline < NOW()`,
  [process.argv[2] || 'Opportunities For Youth'],
);
console.log('expired rows:', d.rows[0].expired);
await c.end();
