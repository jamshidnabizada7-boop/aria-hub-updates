// PHASE 9 — Organization ambiguity resolution audit (READ-ONLY, SELECT only).
//
// Reads the 14 ambiguousPairs from release-backups/prod-org-backfill-dry-run.json,
// resolves each normalized key to its Organization row (via OrganizationAlias.normalized,
// fallback: name normalization), and gathers per-org evidence:
//   - identity columns (id, name, slug, website, careersUrl, officialDomains, verified)
//   - opportunity counts by status (linked via Opportunity.organizationId)
//   - sample opportunity titles + applyUrl hosts (apply-domain evidence)
//   - free-text Opportunity.organization usage counts (unlinked display-name evidence)
// Emits scripts/release/out/phase9-org-ambiguities.json. No writes to the DB.
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const src = fs.readFileSync('scripts/check-col-parity.mjs', 'utf8');
const url = src.match(/^const SUPA_URL = '(.+?)';$/m)[1];

const dryRun = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-backups/prod-org-backfill-dry-run.json'), 'utf8'));
const pairs = dryRun.ambiguousPairs;
console.log(`ambiguousPairs in dry-run: ${pairs.length}`);

// Same normalization as src/lib/organizations/normalize.ts (match-only key)
const LEGAL_SUFFIXES = new Set(['inc', 'incorporated', 'ltd', 'limited', 'llc', 'llp', 'lp', 'gmbh', 'plc', 'corp', 'corporation', 'co', 'company', 'pvt', 'pte', 'pty', 'sarl', 'sarlu', 'bv', 'nv', 'oy', 'ab', 'aps', 'kk', 'kg', 'ag', 'sa', 'sas', 'spa', 'srl']);
function normalizeOrgName(raw) {
  if (!raw) return '';
  let s = String(raw).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ')
    .replace(/[(\[{][^)\]}]*[)\]}]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  for (let i = 0; i < 4; i++) {
    const tokens = s.split(' ');
    const last = tokens[tokens.length - 1];
    if (tokens.length > 1 && LEGAL_SUFFIXES.has(last)) { tokens.pop(); s = tokens.join(' ').trim(); } else break;
  }
  return s;
}

const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return null; } };

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

// 1. Alias-key -> org map
const aliasRows = (await c.query(`SELECT a.normalized, a.alias, o.id FROM "OrganizationAlias" a JOIN "Organization" o ON o.id = a."organizationId"`)).rows;
const byAliasKey = new Map(aliasRows.map(r => [r.normalized.toLowerCase(), r.id]));

// 2. All orgs (identity + aggregate counts)
const orgs = (await c.query(`
  SELECT o.id, o.name, o.slug, o.website, o."careersUrl", o."officialDomains", o.verified,
         o."organizationType", o.country, o.active, o."createdAt",
         COALESCE(SUM(CASE WHEN op.status='published' THEN 1 ELSE 0 END),0)::int AS published,
         COALESCE(SUM(CASE WHEN op.status='expired' THEN 1 ELSE 0 END),0)::int AS expired,
         COALESCE(SUM(CASE WHEN op.status='draft' THEN 1 ELSE 0 END),0)::int AS draft
  FROM "Organization" o LEFT JOIN "Opportunity" op ON op."organizationId" = o.id
  GROUP BY o.id`)).rows;
const orgById = new Map(orgs.map(o => [o.id, o]));

// free-text display-name usage (unlinked opportunities)
const freeText = (await c.query(`SELECT lower("organization") AS k, COUNT(*)::int AS n FROM "Opportunity" WHERE "organization" IS NOT NULL AND "organizationId" IS NULL GROUP BY 1`)).rows;
const freeTextMap = new Map(freeText.map(r => [r.k, r.n]));

// 3. Sample opportunities per org
async function samplesFor(orgId, limit = 6) {
  const r = (await c.query(`
    SELECT title, status, "applyUrl", "applyUrlType", deadline
    FROM "Opportunity" WHERE "organizationId" = $1
    ORDER BY CASE status WHEN 'published' THEN 0 WHEN 'expired' THEN 1 ELSE 2 END, "createdAt" DESC
    LIMIT $2`, [orgId, limit])).rows;
  return r.map(x => ({
    title: x.title, status: x.status, deadline: x.deadline,
    applyHost: x.applyUrl ? hostOf(x.applyUrl) : null, applyUrlType: x.applyUrlType,
  }));
}

function resolveOrg(key) {
  const k = String(key).toLowerCase();
  if (byAliasKey.has(k)) return { org: orgById.get(byAliasKey.get(k)), via: 'OrganizationAlias.normalized' };
  const byName = orgs.find(o => normalizeOrgName(o.name) === k);
  if (byName) return { org: byName, via: 'name-normalization' };
  const bySlug = orgs.find(o => o.slug === k || o.slug === k.replace(/\s+/g, '-'));
  if (bySlug) return { org: bySlug, via: 'slug' };
  const like = orgs.find(o => normalizeOrgName(o.name).includes(k) && k.length >= 4);
  if (like) return { org: like, via: `name-contains:${like.name}` };
  return { org: null, via: 'NOT FOUND' };
}

const out = [];
for (const p of pairs) {
  const entry = { a: p.a, b: p.b, reason: p.reason, sides: {} };
  for (const side of ['a', 'b']) {
    const { org, via } = resolveOrg(p[side]);
    if (!org) { entry.sides[side] = { key: p[side], resolved: false, via }; continue; }
    entry.sides[side] = {
      key: p[side], resolved: true, via,
      id: org.id, name: org.name, slug: org.slug, website: org.website, careersUrl: org.careersUrl,
      officialDomains: org.officialDomains, verified: org.verified, organizationType: org.organizationType,
      country: org.country, active: org.active, createdAt: org.createdAt,
      oppCounts: { published: org.published, expired: org.expired, draft: org.draft },
      freeTextUsage: freeTextMap.get(org.name.toLowerCase()) ?? 0,
      samples: await samplesFor(org.id),
    };
  }
  out.push(entry);
  console.log(`\n== ${p.a}  <->  ${p.b}  (${p.reason})`);
  for (const side of ['a', 'b']) {
    const s = entry.sides[side];
    if (!s.resolved) { console.log(`  ${side}: NOT RESOLVED (${s.via})`); continue; }
    console.log(`  ${side}: ${s.name} | slug=${s.slug} | website=${s.website} | careers=${s.careersUrl} | domains=${JSON.stringify(s.officialDomains)} | verified=${s.verified}`);
    console.log(`      opps=${JSON.stringify(s.oppCounts)} freeTextUnlinked=${s.freeTextUsage}`);
    for (const sm of s.samples) console.log(`      [${sm.status}] ${sm.title.slice(0, 80)} -> ${sm.applyHost}`);
  }
}

fs.mkdirSync('scripts/release/out', { recursive: true });
fs.writeFileSync('scripts/release/out/phase9-org-ambiguities.json', JSON.stringify(out, null, 2));
console.log(`\nWrote scripts/release/out/phase9-org-ambiguities.json (${out.length} pairs)`);
await c.end();
