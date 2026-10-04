import { Client } from 'pg';
import fs from 'node:fs';
const src = fs.readFileSync('scripts/check-col-parity.mjs', 'utf8');
const url = src.match(/^const SUPA_URL = .(.+?).;$/m)[1];
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
const rows = await c.query({
  text: `SELECT o.slug, o.status, o."organizationId", o."applyUrlType", o."applyUrlEvidence", o."applyConfidence",
                o."faStatus", o."psStatus", o."verificationStatus", obs."sourceRole", obs."isPrimary", l.province
         FROM "Opportunity" o
         LEFT JOIN "OpportunitySourceObservation" obs ON obs."opportunityId" = o.id
         LEFT JOIN "OpportunityLocation" l ON l."opportunityId" = o.id AND l.province IS NOT NULL
         WHERE o."sourceName" = $1
         ORDER BY o."importedAt" DESC LIMIT 4`,
  values: ['ReliefWeb Jobs (OCHA)'],
});
console.log(JSON.stringify(rows.rows, null, 1));
const orgLink = await c.query({
  text: `SELECT count(*)::int AS linked FROM "Opportunity" o JOIN "Organization" org ON org.id = o."organizationId" WHERE o."sourceName" = $1`,
  values: ['ReliefWeb Jobs (OCHA)'],
});
console.log('linked to canonical org:', orgLink.rows[0].linked);
await c.end();
