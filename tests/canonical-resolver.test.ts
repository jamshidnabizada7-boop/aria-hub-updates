/**
 * Phase 4 — canonical cross-source deduplication.
 *
 * Verifies the deterministic matching hierarchy (A: org+vacancy number,
 * B: org+vacancy-specific apply URL, C: org+title+deadline+province,
 * D: weak title-only candidates), the never-merge rules, and the
 * official-overrides-aggregator merge policy — against the isolated
 * localhost *_test database only.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { resolveCrossSource, mergeIntoCanonical, scoreCandidate, isVacancySpecificApplyUrl, normalizeApplyUrl, extractVacancyNumber } =
  await import('../src/lib/import/canonical-resolver');
const { resolveOrganization } = await import('../src/lib/organizations/resolve');
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
const orgName = `Canonical Test Org ${runId}`;
const ctxAgg: any = { sourceId: null, sourceName: 'ACBAR', scraperKey: 'acbar', incomingRole: 'aggregator' };
const ctxOfficial: any = { sourceId: null, sourceName: 'Test Org Careers', scraperKey: 'official-html', incomingRole: 'official_careers' };
const oppSlugs: string[] = [];

describe('pure helpers', () => {
  test('normalizeApplyUrl strips protocol/www/tracking and trailing slashes', () => {
    expect(normalizeApplyUrl('HTTPS://www.Org.org/careers/123/?utm_source=x'))
      .toBe('org.org/careers/123');
    expect(normalizeApplyUrl('https://org.org/apply/')).toBe('org.org/apply');
    expect(normalizeApplyUrl('HR@org.org')).toBe('hr@org.org');
    expect(normalizeApplyUrl(null)).toBe('');
  });

  test('isVacancySpecificApplyUrl distinguishes per-job links from generic destinations', () => {
    expect(isVacancySpecificApplyUrl('https://org.org/apply/123')).toBe(true);
    expect(isVacancySpecificApplyUrl('https://org.org/job/senior-programme-officer')).toBe(true);
    expect(isVacancySpecificApplyUrl('https://org.org/careers')).toBe(false);
    expect(isVacancySpecificApplyUrl('https://org.org/')).toBe(false);
    expect(isVacancySpecificApplyUrl('mailto:jobs@org.org')).toBe(false);
  });

  test('extractVacancyNumber reads the known extractedData keys', () => {
    expect(extractVacancyNumber({ extractedData: { vacancyNumber: 'VA-2026-014' } } as any)).toBe('VA-2026-014');
    expect(extractVacancyNumber({ extractedData: { referenceNumber: 42 } } as any)).toBe('42');
    expect(extractVacancyNumber({ extractedData: { other: 'x' } } as any)).toBeNull();
    expect(extractVacancyNumber({} as any)).toBeNull();
  });

  test('scoreCandidate: title equality alone never merges across orgs', () => {
    const incoming = {
      orgKey: 'unicef', titleKey: 'finance officer', deadline: new Date('2026-11-01'),
      provinces: [], vacancyNumber: null, applyUrl: null, applyIsReal: false,
    };
    const [confidence] = scoreCandidate(incoming, 'aggregator', {
      organization: 'World Vision International', title: 'Finance Officer', deadline: new Date('2026-11-01'),
    });
    expect(confidence).toBe(0);
  });
});

describeIf(dbUp)('resolveCrossSource & mergeIntoCanonical (db)', () => {
  const officialSlug = `canon-official-${runId}`;
  const acbarSlug = `canon-acbar-${runId}`;
  const otherOrgSlug = `canon-other-${runId}`;
  const deadline = '2026-12-31T23:59:59.000Z';

  beforeAll(async () => {
    // real ImportSource rows — observations carry an FK to them
    const aggSrc = await db.importSource.upsert({
      where: { name: `Canon Test ACBAR ${runId}` },
      create: { name: `Canon Test ACBAR ${runId}`, type: 'job', scraperKey: 'acbar', baseUrl: 'https://acbar.org' },
      update: {},
    });
    const offSrc = await db.importSource.upsert({
      where: { name: `Canon Test Careers ${runId}` },
      create: { name: `Canon Test Careers ${runId}`, type: 'job', scraperKey: 'official-html', baseUrl: 'https://careers.testorg.org' },
      update: {},
    });
    const jaSrc = await db.importSource.upsert({
      where: { name: `Canon Test Jobs.af ${runId}` },
      create: { name: `Canon Test Jobs.af ${runId}`, type: 'job', scraperKey: 'jobsaf', baseUrl: 'https://jobs.af' },
      update: {},
    });
    ctxAgg.sourceId = aggSrc.id;
    ctxOfficial.sourceId = offSrc.id;

    const slugs = [officialSlug, acbarSlug, otherOrgSlug, `canon-x-${runId}`];
    oppSlugs.push(...slugs);
    await db.opportunitySourceObservation.deleteMany({ where: { opportunity: { slug: { in: slugs } } } });
    await db.opportunity.deleteMany({ where: { slug: { in: slugs } } });
    await db.opportunitySourceObservation.deleteMany({
      where: { opportunity: { slug: { startsWith: `canon-${runId}` } } },
    });
  });

  afterAll(async () => {
    await db.opportunitySourceObservation.deleteMany({
      where: { opportunity: { slug: { startsWith: `canon-${runId}` } } },
    });
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `canon-${runId}` } } });
    const orgs = await db.organization.findMany({ where: { name: { contains: `canonical test org ${runId}` } }, select: { id: true } });
    const ids = orgs.map((o: any) => o.id);
    if (ids.length) {
      await db.opportunity.updateMany({ where: { organizationId: { in: ids } }, data: { organizationId: null } });
      await db.organizationAlias.deleteMany({ where: { organizationId: { in: ids } } });
      await db.organization.deleteMany({ where: { id: { in: ids } } });
    }
    await db.importSource.deleteMany({ where: { name: { contains: `Canon Test ${runId}` } } });
  });

  test('Level A — same organization + same vacancy number merges at 100', async () => {
    const org = (await resolveOrganization(db, orgName)).organization!;
    const existing = await db.opportunity.create({
      data: {
        slug: officialSlug, title: 'Programme Officer', description: 'x'.repeat(80),
        status: 'published', sourceName: 'Test Org Careers', organization: orgName,
        organizationId: org.id, extractedData: { vacancyNumber: 'VA-2026-014' },
      },
    });

    const result = await resolveCrossSource(db, {
      title: 'Programme Officer', organization: orgName, sourceName: 'ACBAR',
      sourceUrl: `https://acbar.org/ad/${runId}`, deadline,
      extractedData: { vacancyNumber: 'va 2026-014' },
    } as any, ctxAgg);

    expect(result.decision).toBe('merge');
    expect(result.confidence).toBe(100);
    expect(result.reasons).toContain('same vacancy number');
    expect(result.candidate?.opportunityId).toBe(existing.id);
  });

  test('Level B — same organization + vacancy-specific apply URL merges at 92', async () => {
    const org = (await resolveOrganization(db, orgName)).organization!;
    await db.opportunity.create({
      data: {
        slug: `canon-b-${runId}`, title: 'Finance Assistant', description: 'x'.repeat(80),
        status: 'published', sourceName: 'Test Org Careers', organization: orgName,
        organizationId: org.id, applyUrl: `https://careers.testorg.org/apply/8842?utm_source=n`,
      },
    });
    oppSlugs.push(`canon-b-${runId}`);

    const result = await resolveCrossSource(db, {
      title: 'Finance Assistant', organization: orgName, sourceName: 'ACBAR',
      sourceUrl: `https://acbar.org/ad/b-${runId}`,
      applyUrl: 'https://careers.testorg.org/apply/8842',
    } as any, ctxAgg);

    expect(result.decision).toBe('merge');
    expect(result.confidence).toBe(92);
  });

  test('generic apply destination (mailto) alone never auto-merges', async () => {
    const org = (await resolveOrganization(db, orgName)).organization!;
    await db.opportunity.create({
      data: {
        slug: `canon-mailto-${runId}`, title: 'Driver', description: 'x'.repeat(80),
        status: 'published', sourceName: 'Test Org Careers', organization: orgName,
        organizationId: org.id, applyUrl: 'mailto:jobs@testorg.org',
      },
    });
    oppSlugs.push(`canon-mailto-${runId}`);

    const result = await resolveCrossSource(db, {
      title: 'Guard', organization: orgName, sourceName: 'ACBAR',
      sourceUrl: `https://acbar.org/ad/m-${runId}`,
      applyUrl: 'mailto:jobs@testorg.org',
    } as any, ctxAgg);

    expect(result.decision).not.toBe('merge');
    expect(result.confidence).toBeLessThan(90);
  });

  test('Level C — organization + title + deadline merges at 90; province conflict downgrades', async () => {
    const org = (await resolveOrganization(db, orgName)).organization!;
    await db.opportunity.create({
      data: {
        slug: `canon-c-${runId}`, title: 'Health Coordinator', description: 'x'.repeat(80),
        status: 'published', sourceName: 'Wazifaha Jobs', organization: orgName,
        organizationId: org.id, deadline: new Date(deadline),
        locations: { create: { province: 'Kabul', source: 'scraper', confidence: 1 } },
      },
    });
    oppSlugs.push(`canon-c-${runId}`);

    const same = await resolveCrossSource(db, {
      title: 'Health Coordinator', organization: orgName, sourceName: 'ACBAR',
      sourceUrl: `https://acbar.org/ad/c-${runId}`, deadline,
      provinces: ['Kabul'],
    } as any, ctxAgg);
    expect(same.decision).toBe('merge');
    expect(same.confidence).toBe(90);
    expect(same.reasons).toContain('same province');

    const conflict = await resolveCrossSource(db, {
      title: 'Health Coordinator', organization: orgName, sourceName: 'ACBAR',
      sourceUrl: `https://acbar.org/ad/c2-${runId}`, deadline,
      provinces: ['Kandahar'],
    } as any, ctxAgg);
    expect(conflict.decision).toBe('review');
    expect(conflict.confidence).toBe(72);
  });

  test('missing deadline on one side keeps candidates in the review band', async () => {
    const org = (await resolveOrganization(db, orgName)).organization!;
    await db.opportunity.create({
      data: {
        slug: `canon-d-${runId}`, title: 'Logistics Officer', description: 'x'.repeat(80),
        status: 'published', sourceName: 'Wazifaha Jobs', organization: orgName,
        organizationId: org.id,
      },
    });
    oppSlugs.push(`canon-d-${runId}`);

    const result = await resolveCrossSource(db, {
      title: 'Logistics Officer', organization: orgName, sourceName: 'ACBAR',
      sourceUrl: `https://acbar.org/ad/d-${runId}`,
    } as any, ctxAgg);
    expect(result.decision).toBe('review');
    expect(result.confidence).toBe(80);
  });

  test('NEVER merge: same title from a different organization', async () => {
    const otherOrg = (await resolveOrganization(db, `Other Org ${runId}`)).organization!;
    await db.opportunity.create({
      data: {
        slug: otherOrgSlug, title: 'Finance Officer', description: 'x'.repeat(80),
        status: 'published', sourceName: 'Opportunity Desk', organization: `Other Org ${runId}`,
        organizationId: otherOrg.id, deadline: new Date(deadline),
      },
    });

    const result = await resolveCrossSource(db, {
      title: 'Finance Officer', organization: orgName, sourceName: 'ACBAR',
      sourceUrl: `https://acbar.org/ad/o-${runId}`, deadline,
    } as any, ctxAgg);
    expect(result.decision).toBe('new');
  });

  test('mergeIntoCanonical: official observation becomes primary and promotes fields', async () => {
    const org = (await resolveOrganization(db, orgName)).organization!;
    // aggregator-born canonical row: deadline-less, fallback apply URL
    const target = await db.opportunity.create({
      data: {
        slug: acbarSlug, title: 'Protection Monitor', description: 'x'.repeat(80),
        status: 'published', sourceName: 'ACBAR', organization: orgName,
        organizationId: org.id, applyUrl: `https://acbar.org/ad/pm-${runId}`,
        sourceUrl: `https://acbar.org/ad/pm-${runId}`,
      },
    });
    await db.opportunitySourceObservation.create({
      data: {
        opportunityId: target.id, sourceName: 'ACBAR', sourceRole: 'aggregator',
        sourceUrl: `https://acbar.org/ad/pm-${runId}`, isPrimary: true,
      },
    });

    const merged = await mergeIntoCanonical(db, {
      title: 'Protection Monitor', organization: orgName, sourceName: 'Test Org Careers',
      sourceUrl: `https://careers.testorg.org/jobs/${runId}`, deadline,
    } as any, ctxOfficial, target.id, {
      applyUrl: `https://careers.testorg.org/apply/${runId}`,
      deadline: new Date(deadline),
      organizationId: org.id,
      contentHash: 'hash-official',
    });

    expect(merged.promoted).toContain('deadline');
    expect(merged.promoted).toContain('applyUrl');
    expect(merged.promoted).toContain('sourceIdentity');
    expect(merged.newPrimary).toBe(true);

    const after = await db.opportunity.findUnique({
      where: { id: target.id },
      include: { sourceObservations: true },
    });
    const official = after!.sourceObservations.find((o: any) => o.sourceRole === 'official_careers');
    const aggregator = after!.sourceObservations.find((o: any) => o.sourceRole === 'aggregator');
    expect(official?.isPrimary).toBe(true);
    expect(aggregator?.isPrimary).toBe(false);
    expect(after!.deadline?.toISOString()).toBe(deadline);
    expect(after!.applyUrl).toBe(`https://careers.testorg.org/apply/${runId}`);
    expect(after!.sourceName).toBe('Test Org Careers'); // official identity promoted
    // observations remain fully auditable: both sightings kept
    expect(after!.sourceObservations).toHaveLength(2);
  });

  test('mergeIntoCanonical: aggregator sighting adds an observation and changes nothing else', async () => {
    const org = (await resolveOrganization(db, orgName)).organization!;
    const official = await db.opportunity.findFirst({
      where: { slug: acbarSlug }, include: { sourceObservations: true },
    });
    const before = JSON.stringify({
      d: official!.deadline, a: official!.applyUrl, s: official!.sourceName,
    });

    const result = await resolveCrossSource(db, {
      title: 'Protection Monitor', organization: orgName, sourceName: 'Jobs.af',
      sourceUrl: `https://jobs.af/job/${runId}`, deadline,
    } as any, { sourceId: ctxAgg.sourceId, sourceName: 'Jobs.af', scraperKey: 'jobsaf', incomingRole: 'aggregator' });
    expect(result.decision).toBe('merge'); // official primary + same title + same deadline

    await mergeIntoCanonical(db, {
      title: 'Protection Monitor', organization: orgName, sourceName: 'Jobs.af',
      sourceUrl: `https://jobs.af/job/${runId}`, deadline,
    } as any, { sourceId: ctxAgg.sourceId, sourceName: 'Jobs.af', scraperKey: 'jobsaf', incomingRole: 'aggregator' },
    official!.id, { applyUrl: null, deadline: new Date(deadline), organizationId: org.id, contentHash: 'hash-ja' });

    const after = await db.opportunity.findUnique({ where: { id: official!.id }, include: { sourceObservations: true } });
    expect(JSON.stringify({ d: after!.deadline, a: after!.applyUrl, s: after!.sourceName })).toBe(before);
    expect(after!.sourceObservations.filter((o: any) => o.sourceName === 'Jobs.af')).toHaveLength(1);
    expect(after!.sourceObservations.find((o: any) => o.sourceRole === 'official_careers')?.isPrimary).toBe(true);
  });
});
