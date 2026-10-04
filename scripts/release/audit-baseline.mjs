// PHASES 9/10/26/27 data audit — baseline probe (SELECT-only, read-only).
// Verifies connectivity and expected row counts before the per-phase audits.
import pg from 'pg';
import fs from 'fs';

const src = fs.readFileSync('scripts/check-col-parity.mjs', 'utf8');
const url = src.match(/^const SUPA_URL = '(.+?)';$/m)[1];
if (!url) throw new Error('SUPA_URL not found');

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const q = async (label, sql) => {
  const r = await c.query(sql);
  console.log(`--- ${label} ---`);
  console.log(JSON.stringify(r.rows, null, 1));
};

await q('Opportunity status counts', `SELECT status, COUNT(*)::int AS n FROM "Opportunity" GROUP BY status ORDER BY n DESC;`);
await q('OCHA draft count', `SELECT COUNT(*)::int AS n FROM "Opportunity" WHERE "sourceName" = 'ReliefWeb Jobs (OCHA)' AND status = 'draft';`);
await q('ImportSource rows', `SELECT name, "scraperKey", enabled, "autoPublish", "sourceRole" FROM "ImportSource" ORDER BY name;`);
await q('Organization count', `SELECT COUNT(*)::int AS n FROM "Organization";`);
await q('OrganizationAlias count', `SELECT COUNT(*)::int AS n FROM "OrganizationAlias";`);
await q('Observation count', `SELECT COUNT(*)::int AS n FROM "OpportunitySourceObservation";`);
await q('SourceName distribution (published)', `SELECT "sourceName", COUNT(*)::int AS n FROM "Opportunity" WHERE status='published' GROUP BY "sourceName" ORDER BY n DESC;`);

await c.end();
console.log('DONE');
