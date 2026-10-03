/**
 * Phase 2 — organization normalization, resolution, and backfill engine.
 *
 * Pure-function cases run anywhere; db-backed cases run only against an
 * isolated localhost *_test / *_fresh database (same guard as
 * publish-safety.test.ts) so production can never be touched. All db test
 * names are run-scoped so re-runs never collide with leftovers.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { normalizeOrgName, extractAliasCandidates, isLikelyAcronym, isAmbiguousPair } =
  await import('../src/lib/organizations/normalize');
const { domainFromUrl, domainFromEmail, isSubdomainOf, plausibleOfficialDomains, registrableDomain } =
  await import('../src/lib/organizations/domains');
const { collectOrgGroups, detectAmbiguousPairs, runBackfill } =
  await import('../src/lib/organizations/backfill');
const { computeOrgSlug, resolveOrganization } = await import('../src/lib/organizations/resolve');

const { db } = await import('../src/lib/db');
let dbUp = false;
try {
  if (isolatedTestDatabase) {
    await db.$queryRaw`SELECT 1`;
    dbUp = true;
  }
} catch {
  dbUp = false;
}

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);

const runId = Date.now().toString(36);
const oppSlugs = [`test-org-bf-1-${runId}`, `test-org-bf-2-${runId}`, `test-org-bf-3-${runId}`];

describe('normalizeOrgName', () => {
  test('case/punctuation/whitespace/diacritics are equalized', () => {
    expect(normalizeOrgName('  Norwegian—Refugee   Council ')).toBe('norwegian refugee council');
    expect(normalizeOrgName('Café Foundation, Ltd.')).toBe('cafe foundation');
  });

  test('parenthetical content is dropped from the matching key', () => {
    expect(normalizeOrgName('International Rescue Committee (IRC)')).toBe('international rescue committee');
    expect(normalizeOrgName('IRC (International Rescue Committee)')).toBe('irc');
  });

  test('trailing legal suffixes are stripped for matching only', () => {
    expect(normalizeOrgName('Watan Co. Ltd')).toBe('watan');
    // parenthetical "(TS)" is dropped from the matching key by design
    expect(normalizeOrgName('Roshan Telecom (TS) PLC')).toBe('roshan telecom');
  });

  test('it is conservative — no over-merging traps', () => {
    // plan's example pair: distinct keys, must NOT normalize together
    expect(normalizeOrgName('CARE')).toBe('care');
    expect(normalizeOrgName('CARE International')).toBe('care international');
    // WHO keeps its full name
    expect(normalizeOrgName('World Health Organization')).toBe('world health organization');
    // ampersand becomes "and"
    expect(normalizeOrgName('Save the Children & Partners')).toBe('save the children and partners');
  });

  test('empty/junk input yields an empty key', () => {
    expect(normalizeOrgName(null)).toBe('');
    expect(normalizeOrgName('   ')).toBe('');
    expect(normalizeOrgName('(---)')).toBe('');
  });
});

describe('alias candidates & acronyms', () => {
  test('isLikelyAcronym accepts real acronyms and rejects names', () => {
    expect(isLikelyAcronym('IRC')).toBe(true);
    expect(isLikelyAcronym('UNICEF')).toBe(true);
    expect(isLikelyAcronym('AIHRC')).toBe(true);
    expect(isLikelyAcronym('Norwegian')).toBe(false);
    expect(isLikelyAcronym('AND')).toBe(false);
    expect(isLikelyAcronym('CaRE')).toBe(false);
  });

  test('parenthetical acronyms become alias candidates', () => {
    expect(extractAliasCandidates('International Rescue Committee (IRC)')).toContain('IRC');
    expect(extractAliasCandidates('United Nations Children\u2019s Fund (UNICEF)')).toContain('UNICEF');
    expect(extractAliasCandidates('Norwegian Refugee Council')).toEqual([]);
  });

  test('non-acronym parentheticals terminate and yield the expansion (infinite-loop regression)', () => {
    // this exact shape once hung forever: the shared global regex was reset
    // by replace() inside the exec loop
    expect(extractAliasCandidates('IRC (International Rescue Committee)'))
      .toEqual(['international rescue committee']);
    expect(extractAliasCandidates('CARE (Cooperative for Assistance and Relief Everywhere)'))
      .toContain('cooperative for assistance and relief everywhere');
    expect(normalizeOrgName('IRC (International Rescue Committee)')).toBe('irc');
  });

  test('ambiguous-pair detection flags containment but only reports', () => {
    expect(isAmbiguousPair('care', 'care international', [], [])).toBe('token-containment');
    expect(isAmbiguousPair('irc', 'international rescue committee', ['international rescue committee'], ['irc'])).toBe('acronym-match');
    // generic singleton tokens are not evidence
    expect(isAmbiguousPair('un', 'un women', [], [])).toBeNull();
    expect(isAmbiguousPair('unicef', 'world food programme', [], [])).toBeNull();
  });
});

describe('domain helpers', () => {
  test('domainFromUrl / domainFromEmail normalize hosts', () => {
    expect(domainFromUrl('https://jobs.unicef.org/careers/123')).toBe('jobs.unicef.org'); // full host kept (apex recorded separately)
    expect(domainFromUrl('not a url')).toBe('');
    expect(domainFromUrl('ftp://files.example.org')).toBe('');
    expect(domainFromEmail('recruitment@nrc.no')).toBe('nrc.no');
    expect(domainFromEmail('broken-email')).toBe('');
  });

  test('subdomain relations and registrable roots', () => {
    expect(isSubdomainOf('jobs.unicef.org', 'unicef.org')).toBe(true);
    expect(isSubdomainOf('unicef.org', 'jobs.unicef.org')).toBe(false);
    expect(isSubdomainOf('evil-unicef.org', 'unicef.org')).toBe(false);
    expect(registrableDomain('careers.bbc.co.uk')).toBe('bbc.co.uk');
  });

  test('plausibleOfficialDomains drops aggregators, mail providers, junk', () => {
    const kept = plausibleOfficialDomains([
      'https://www.nrc.no/path', 'jobs.acbar.org', 'recruit@gmail.com',
      'http://192.168.1.4/x', 'localhost', '', 'careers.example.org',
    ]);
    expect(kept).toContain('nrc.no');
    expect(kept).not.toContain('acbar.org');
    expect(kept).not.toContain('gmail.com');
    expect(kept).not.toContain('192.168.1.4');
  });
});

describe('collectOrgGroups & detectAmbiguousPairs (pure)', () => {
  const rows = [
    { id: '1', organization: 'Norwegian Refugee Council' },
    { id: '2', organization: 'norwegian refugee council ' },
    { id: '3', organization: 'Norwegian Refugee Council (NRC)' },
    { id: '4', organization: 'CARE International' },
    { id: '5', organization: 'CARE' },
    { id: '6', organization: null },
    { id: '7', organization: '' },
  ];

  test('exact-normalized grouping only', () => {
    const groups = collectOrgGroups(rows);
    const nrc = groups.find((g: any) => g.normalizedKey === 'norwegian refugee council');
    expect(nrc?.opportunityIds).toEqual(['1', '2', '3']);
    expect(nrc?.aliasCandidates).toContain('NRC');
    // CARE and CARE International stay separate groups
    const keys = groups.map((g: any) => g.normalizedKey);
    expect(keys).toContain('care');
    expect(keys).toContain('care international');
    expect(groups.find((g: any) => g.normalizedKey === 'care')?.opportunityIds).toEqual(['5']);
  });

  test('CARE vs CARE International is reported, never merged', () => {
    const pairs = detectAmbiguousPairs(collectOrgGroups(rows));
    const flagged = pairs.some(
      (p: any) =>
        (p.a === 'care' && p.b === 'care international') ||
        (p.a === 'care international' && p.b === 'care'),
    );
    expect(flagged).toBe(true);
  });
});

describeIf(dbUp)('resolveOrganization & runBackfill (db)', () => {
  const nrcName = `Test NRC ${runId}`;
  const nrcSlug = `test-nrc-${runId}`;
  const aliasOrgSlug = `test-alias-org-${runId}`;
  const barAlias = `b a r society ${runId}`;
  const waterName = `Kabul Water Works ${runId}`;
  const waterKey = `kabul water works ${runId}`;
  const carePlain = `CARE ${runId}`;
  const careIntl = `CARE International ${runId}`;

  beforeAll(async () => {
    // defense against leftovers from crashed earlier runs of THIS suite
    await db.organizationAlias.deleteMany({ where: { normalized: { in: [barAlias, waterKey, `care ${runId}`, `care international ${runId}`, `test nrc ${runId}`] } } });
    const stale = await db.organization.findMany({ where: { slug: { contains: runId } }, select: { id: true } });
    if (stale.length) {
      const ids = stale.map((o: any) => o.id);
      await db.opportunity.updateMany({ where: { organizationId: { in: ids } }, data: { organizationId: null } });
      await db.organizationAlias.deleteMany({ where: { organizationId: { in: ids } } });
      await db.organization.deleteMany({ where: { id: { in: ids } } });
    }
    await db.opportunity.deleteMany({ where: { slug: { in: oppSlugs } } });
  });

  afterAll(async () => {
    const orgs = await db.organization.findMany({ where: { slug: { contains: runId } }, select: { id: true } });
    const ids = orgs.map((o: any) => o.id);
    if (ids.length) {
      await db.opportunity.updateMany({ where: { organizationId: { in: ids } }, data: { organizationId: null } });
      await db.organizationAlias.deleteMany({ where: { organizationId: { in: ids } } });
      await db.organization.deleteMany({ where: { id: { in: ids } } });
    }
    await db.opportunity.deleteMany({ where: { slug: { in: oppSlugs } } });
  });

  test('computeOrgSlug is deterministic', () => {
    expect(computeOrgSlug('Norwegian Refugee Council')).toBe('norwegian-refugee-council');
    expect(computeOrgSlug('UNICEF')).toBe('unicef');
    expect(computeOrgSlug('   ')).toBe('organization');
  });

  test('deterministic slug + stable re-resolution via primary alias', async () => {
    const first = await resolveOrganization(db, nrcName);
    expect(first.created).toBe(true);
    expect(first.organization!.slug).toBe(nrcSlug);

    const again = await resolveOrganization(db, `  ${nrcName.replace(/ /g, '-')} Ltd. `);
    expect(again.created).toBe(false);
    expect(again.organization!.id).toBe(first.organization!.id);
    expect(again.matchedVia).toBe('alias');

    const none = await resolveOrganization(db, '   ');
    expect(none.organization).toBeNull();
  });

  test('lookup with createIfMissing=false never creates', async () => {
    const miss = await resolveOrganization(db, `Brand New Org ${runId}`, { createIfMissing: false });
    expect(miss.organization).toBeNull();
    const check = await db.organization.findFirst({ where: { name: `Brand New Org ${runId}` } });
    expect(check).toBeNull();
  });

  test('a pre-existing alias row controls the merge (BAR Society → alias org)', async () => {
    const org = await db.organization.create({ data: { name: `Alias Target Org ${runId}`, slug: aliasOrgSlug } });
    await db.organizationAlias.create({
      data: { organizationId: org.id, alias: `B.A.R. Society ${runId}`, normalized: barAlias },
    });
    const hit = await resolveOrganization(db, `B.A.R. Society ${runId} Ltd.`);
    expect(hit.created).toBe(false);
    expect(hit.organization!.id).toBe(org.id);
  });

  test('runBackfill --apply connects opportunities and preserves strings', async () => {
    await db.opportunity.create({
      data: { slug: oppSlugs[0], title: 'BF Job A', description: 'x'.repeat(80), status: 'published', organization: waterName },
    });
    await db.opportunity.create({
      data: { slug: oppSlugs[1], title: 'BF Job B', description: 'x'.repeat(80), status: 'published', organization: `KABUL WATER WORKS ${runId}` },
    });
    await db.opportunity.create({
      data: { slug: oppSlugs[2], title: 'BF Job C', description: 'x'.repeat(80), status: 'published', organization: careIntl },
    });
    await db.opportunity.create({
      data: { slug: `test-org-bf-4-${runId}`, title: 'BF Job D', description: 'x'.repeat(80), status: 'published', organization: carePlain },
    });

    // dry-run default: no writes
    const dry = await runBackfill(db, { limit: 500 });
    expect(dry.dryRun).toBe(true);
    expect(dry.createdOrganizations).toBe(0);
    const carePlainKey = normalizeOrgName(carePlain);
    const careIntlKey = normalizeOrgName(careIntl);
    expect(dry.ambiguousPairs.some((p: any) =>
      p.reason === 'token-containment' &&
      ((p.a === carePlainKey && p.b === careIntlKey) || (p.a === careIntlKey && p.b === carePlainKey)),
    )).toBe(true);

    const result = await runBackfill(db, { apply: true, limit: 500 });
    expect(result.createdOrganizations).toBeGreaterThanOrEqual(1);

    const a = await db.opportunity.findUnique({ where: { slug: oppSlugs[0] } });
    const b = await db.opportunity.findUnique({ where: { slug: oppSlugs[1] } });
    const c = await db.opportunity.findUnique({ where: { slug: oppSlugs[2] } });
    const d = await db.opportunity.findUnique({ where: { slug: `test-org-bf-4-${runId}` } });

    expect(a!.organizationId).toBeTruthy();
    expect(b!.organizationId).toBe(a!.organizationId); // same normalized group → one org
    expect(a!.organization).toBe(waterName); // string preserved verbatim
    expect(b!.organization).toBe(`KABUL WATER WORKS ${runId}`); // string preserved verbatim

    // CARE International must NOT have been merged into the plain CARE group
    expect(c!.organizationId).toBeTruthy();
    expect(d!.organizationId).toBeTruthy();
    expect(c!.organizationId).not.toBe(d!.organizationId);

    // idempotent re-run: these opportunities stay connected, nothing re-created
    const rerun = await runBackfill(db, { apply: true, limit: 500 });
    const stillUnlinked = await db.opportunity.count({
      where: { slug: { in: [...oppSlugs, `test-org-bf-4-${runId}`] }, organizationId: null },
    });
    expect(stillUnlinked).toBe(0);
    expect(rerun.connectedOpportunities).toBe(0);
  }, 120_000); // whole-table scan over the shared DB — bun's 5s default is too tight
});
