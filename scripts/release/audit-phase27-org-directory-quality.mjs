// PHASE 27 — Organization directory quality audit (READ-ONLY, SELECT only).
// Covers: completeness counts (website/careersUrl/officialDomains), fallback slugs,
// verified flags, cross-org duplicate officialDomains, top-20 orgs by active
// published opportunities with their gaps. Emits
// scripts/release/out/phase27-org-directory-quality.json.
import pg from 'pg';
import fs from 'fs';

const src = fs.readFileSync('scripts/check-col-parity.mjs', 'utf8');
const url = src.match(/^const SUPA_URL = '(.+?)';$/m)[1];
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const orgs = (await c.query(`
  SELECT o.id, o.name, o.slug, o.website, o."careersUrl", o."officialDomains", o.verified,
         o."verificationMethod", o."organizationType", o.country, o.active,
         COALESCE(SUM(CASE WHEN op.status='published' THEN 1 ELSE 0 END),0)::int AS published,
         COALESCE(SUM(CASE WHEN op.status='expired' THEN 1 ELSE 0 END),0)::int AS expired
  FROM "Organization" o LEFT JOIN "Opportunity" op ON op."organizationId" = o.id
  GROUP BY o.id ORDER BY o.name`)).rows;

const totals = {
  orgs: orgs.length,
  missingWebsite: orgs.filter(o => !o.website).length,
  missingCareersUrl: orgs.filter(o => !o.careersUrl).length,
  missingOfficialDomains: orgs.filter(o => !o.officialDomains || (Array.isArray(o.officialDomains) && o.officialDomains.length === 0)).length,
  fallbackSlugs: orgs.filter(o => /^opportunity-/.test(o.slug)).length,
  verified: orgs.filter(o => o.verified).length,
  unverified: orgs.filter(o => !o.verified).length,
  inactive: orgs.filter(o => !o.active).length,
  withOpportunities: orgs.filter(o => o.published + o.expired > 0).length,
  zeroOpportunities: orgs.filter(o => o.published + o.expired === 0).length,
};
console.log('TOTALS:', JSON.stringify(totals, null, 1));

const methods = {};
for (const o of orgs) { const m = o.verificationMethod ?? '(null)'; methods[m] = (methods[m] || 0) + 1; }
console.log('verificationMethod distribution:', JSON.stringify(methods));

// verified org rows detail
const verifiedRows = orgs.filter(o => o.verified).map(o => ({ name: o.name, slug: o.slug, website: o.website, method: o.verificationMethod }));

// cross-org duplicate officialDomains
const domainOwners = new Map();
const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return null; } };
for (const o of orgs) {
  let domains = o.officialDomains;
  if (typeof domains === 'string') { try { domains = JSON.parse(domains); } catch { domains = null; } }
  if (!Array.isArray(domains)) continue;
  for (const d of domains) {
    const key = String(d).toLowerCase().trim();
    if (!key) continue;
    if (!domainOwners.has(key)) domainOwners.set(key, []);
    domainOwners.get(key).push({ org: o.name, slug: o.slug, id: o.id });
  }
}
// also treat website host as a domain signal (bonus: website-host collisions)
const webOwners = new Map();
for (const o of orgs) {
  if (!o.website) continue;
  const h = hostOf(o.website);
  if (!h) continue;
  if (!webOwners.has(h)) webOwners.set(h, []);
  webOwners.get(h).push({ org: o.name, slug: o.slug, id: o.id, website: o.website });
}
const dupDomains = [...domainOwners.entries()].filter(([, owners]) => owners.length > 1)
  .map(([domain, owners]) => ({ domain, owners }));
const dupWebHosts = [...webOwners.entries()].filter(([, owners]) => owners.length > 1)
  .map(([domain, owners]) => ({ domain, owners }));
console.log(`cross-org duplicate officialDomains: ${dupDomains.length}`);
for (const d of dupDomains) console.log('  ', JSON.stringify(d));
console.log(`cross-org duplicate website hosts: ${dupWebHosts.length}`);
for (const d of dupWebHosts) console.log('  ', JSON.stringify(d));

// top-20 orgs by active published opportunities + gaps
const top20 = [...orgs].sort((a, b) => b.published - a.published || b.expired - a.expired).slice(0, 20)
  .map(o => ({
    name: o.name, slug: o.slug, published: o.published, expired: o.expired,
    website: o.website, careersUrl: o.careersUrl,
    officialDomains: o.officialDomains, verified: o.verified,
    gaps: [
      !o.website && 'website', !o.careersUrl && 'careersUrl',
      (!o.officialDomains || (Array.isArray(o.officialDomains) && o.officialDomains.length === 0)) && 'officialDomains',
      !o.verified && 'verified',
    ].filter(Boolean),
  }));
console.log('\nTOP-20 by published:');
for (const t of top20) console.log(`  ${String(t.published).padStart(4)} pub / ${String(t.expired).padStart(3)} exp  ${t.name}  gaps=[${t.gaps.join(',')}]`);

// fallback slug rows detail
const fallbackRows = orgs.filter(o => /^opportunity-/.test(o.slug)).map(o => ({ name: o.name, slug: o.slug, published: o.published, expired: o.expired }));

fs.mkdirSync('scripts/release/out', { recursive: true });
fs.writeFileSync('scripts/release/out/phase27-org-directory-quality.json', JSON.stringify({ totals, methods, verifiedRows, dupDomains, dupWebHosts, top20, fallbackRows }, null, 2));
console.log('\nWrote scripts/release/out/phase27-org-directory-quality.json');
await c.end();
