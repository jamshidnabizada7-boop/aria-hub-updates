/**
 * Phase 3 — source observation model, role resolution, and backfill.
 *
 * DB-backed cases run only against an isolated localhost *_test / *_fresh
 * database (same guard as publish-safety.test.ts). All test names are
 * run-scoped so re-runs never collide with leftovers.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { resolveSourceRole, ensureSourceObservation, backfillSourceObservations, ROLE_TRUST, parseSourcePublishedAt } =
  await import('../src/lib/import/source-observations');
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

describe('resolveSourceRole', () => {
  test('known aggregators map to aggregator', () => {
    expect(resolveSourceRole({ sourceName: 'ACBAR' })).toBe('aggregator');
    expect(resolveSourceRole({ sourceName: 'Jobs.af' })).toBe('aggregator');
    expect(resolveSourceRole({ sourceName: 'Wazifaha Jobs' })).toBe('aggregator');
    expect(resolveSourceRole({ sourceName: 'Opportunities For Youth' })).toBe('aggregator');
    expect(resolveSourceRole({ sourceName: 'Opportunities for Afghans (o4af)' })).toBe('aggregator');
    expect(resolveSourceRole({ sourceName: 'ReliefWeb' })).toBe('aggregator');
  });

  test('employer and community submissions map to employer_submission', () => {
    expect(resolveSourceRole({ sourceName: 'Employer' })).toBe('employer_submission');
    expect(resolveSourceRole({ sourceName: 'Community' })).toBe('employer_submission');
  });

  test('scraperKey and explicit overrides take precedence', () => {
    expect(resolveSourceRole({ sourceName: 'Whatever', scraperKey: 'acbar' })).toBe('aggregator');
    // a future official-org WordPress source overrides the wpApi default
    expect(resolveSourceRole({ sourceName: 'UNICEF News', scraperKey: 'wpApi', explicitRole: 'official_feed' })).toBe('official_feed');
  });

  test('unknown names stay conservative (discovery), empty → discovery', () => {
    expect(resolveSourceRole({ sourceName: 'UNICEF Careers' })).toBe('discovery');
    expect(resolveSourceRole({ sourceName: null })).toBe('discovery');
  });

  test('baseline trust per role', () => {
    expect(ROLE_TRUST.official_careers).toBeGreaterThan(ROLE_TRUST.employer_submission);
    expect(ROLE_TRUST.employer_submission).toBeGreaterThan(ROLE_TRUST.aggregator);
    expect(ROLE_TRUST.aggregator).toBeGreaterThan(ROLE_TRUST.discovery);
  });

  test('parseSourcePublishedAt is safe on junk', () => {
    expect(parseSourcePublishedAt('2026-09-01')).toBeInstanceOf(Date);
    expect(parseSourcePublishedAt('29 September 2026')).toBeInstanceOf(Date);
    expect(parseSourcePublishedAt('not a date')).toBeNull();
    expect(parseSourcePublishedAt(null)).toBeNull();
  });
});

describeIf(dbUp)('ensureSourceObservation & backfill (db)', () => {
  const slugs = [
    `test-obs-acbar-${runId}`,
    `test-obs-employer-${runId}`,
    `test-obs-manual-${runId}`,
  ];
  const oppIds: string[] = [];

  beforeAll(async () => {
    await db.opportunitySourceObservation.deleteMany({
      where: { opportunity: { slug: { in: slugs } } },
    });
    await db.opportunity.deleteMany({ where: { slug: { in: slugs } } });
  });

  afterAll(async () => {
    await db.opportunitySourceObservation.deleteMany({
      where: { opportunity: { slug: { in: slugs } } },
    });
    await db.opportunity.deleteMany({ where: { slug: { in: slugs } } });
  });

  test('ensureSourceObservation creates with isPrimary and is idempotent on re-sight', async () => {
    const opp = await db.opportunity.create({
      data: { slug: slugs[0], title: 'Obs Job A', description: 'x'.repeat(80), status: 'published', sourceName: 'ACBAR', sourceUrl: `https://acbar.org/listing/${runId}` },
    });
    oppIds.push(opp.id);

    const first = await ensureSourceObservation(db, {
      opportunityId: opp.id, sourceName: 'ACBAR', sourceRole: 'aggregator',
      sourceUrl: `https://acbar.org/listing/${runId}`,
      observedApplyUrl: 'https://example.org/apply', seenAt: new Date('2026-10-01T00:00:00Z'),
    });
    expect(first.created).toBe(true);
    expect(first.observation.isPrimary).toBe(true);

    // re-sight the same listing: no duplicate, lastSeenAt moves forward
    const again = await ensureSourceObservation(db, {
      opportunityId: opp.id, sourceName: 'ACBAR', sourceRole: 'aggregator',
      sourceUrl: `https://acbar.org/listing/${runId}`,
      observedApplyUrl: 'https://example.org/apply-v2', seenAt: new Date('2026-10-02T00:00:00Z'),
    });
    expect(again.created).toBe(false);
    expect(again.observation.id).toBe(first.observation.id);

    const rows = await db.opportunitySourceObservation.findMany({ where: { opportunityId: opp.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].isPrimary).toBe(true);
    expect(rows[0].lastSeenAt.toISOString()).toBe('2026-10-02T00:00:00.000Z');
    expect(rows[0].observedApplyUrl).toBe('https://example.org/apply-v2');
    expect(rows[0].trustScore).toBe(ROLE_TRUST.aggregator);
  });

  test('one opportunity can hold several observations with one primary', async () => {
    const opp = await db.opportunity.findUnique({ where: { slug: slugs[0] } });

    const second = await ensureSourceObservation(db, {
      opportunityId: opp!.id, sourceName: 'Wazifaha Jobs', sourceRole: 'aggregator',
      sourceUrl: `https://wazifaha.org/p/${runId}`, seenAt: new Date('2026-10-03T00:00:00Z'),
    });
    expect(second.created).toBe(true);
    expect(second.observation.isPrimary).toBe(false); // first observation stays primary

    // different sourceUrl for the same sourceName is a NEW observation
    const third = await ensureSourceObservation(db, {
      opportunityId: opp!.id, sourceName: 'ACBAR', sourceRole: 'aggregator',
      sourceUrl: `https://acbar.org/other/${runId}`,
    });
    expect(third.created).toBe(true);

    const rows = await db.opportunitySourceObservation.findMany({ where: { opportunityId: opp!.id } });
    expect(rows).toHaveLength(3);
    expect(rows.filter((r: any) => r.isPrimary)).toHaveLength(1);
  });

  test('backfill: dry-run by default, apply writes correct roles, legacy fields untouched', async () => {
    await db.opportunity.create({
      data: { slug: slugs[1], title: 'Obs Job B', description: 'x'.repeat(80), status: 'published', sourceName: 'Employer', applyUrl: 'mailto:hr@company.org' },
    });
    await db.opportunity.create({
      data: { slug: slugs[2], title: 'Obs Job C', description: 'x'.repeat(80), status: 'published' },
    });

    const before = await db.opportunity.findMany({ where: { slug: { in: slugs } } });

    const dry = await backfillSourceObservations(db, {});
    expect(dry.dryRun).toBe(true);
    const dryObservations = await db.opportunitySourceObservation.count({
      where: { opportunity: { slug: { in: [slugs[1], slugs[2]] } } },
    });
    expect(dryObservations).toBe(0); // dry-run wrote nothing for the new rows

    const result = await backfillSourceObservations(db, { apply: true });
    expect(result.created).toBeGreaterThanOrEqual(2);

    const acbarOpp = await db.opportunity.findUnique({ where: { slug: slugs[0] }, include: { sourceObservations: true } });
    const employerOpp = await db.opportunity.findUnique({ where: { slug: slugs[1] }, include: { sourceObservations: true } });
    const manualOpp = await db.opportunity.findUnique({ where: { slug: slugs[2] }, include: { sourceObservations: true } });

    const acbarObs = acbarOpp!.sourceObservations.find((o: any) => o.sourceUrl === `https://acbar.org/listing/${runId}`)!;
    expect(acbarObs.sourceRole).toBe('aggregator');
    expect(acbarObs.isPrimary).toBe(true);
    expect(employerOpp!.sourceObservations).toHaveLength(1);
    expect(employerOpp!.sourceObservations[0].sourceRole).toBe('employer_submission');
    expect(employerOpp!.sourceObservations[0].sourceName).toBe('Employer');
    expect(manualOpp!.sourceObservations).toHaveLength(1);
    expect(manualOpp!.sourceObservations[0].sourceRole).toBe('discovery');
    expect(manualOpp!.sourceObservations[0].sourceName).toBe('Manual');

    // legacy fields unchanged
    const after = await db.opportunity.findMany({ where: { slug: { in: slugs } } });
    const beforeById = new Map(before.map((b: any) => [b.id, b]));
    for (const row of after) {
      const orig = beforeById.get(row.id)!;
      expect(row.sourceName).toBe(orig.sourceName);
      expect(row.sourceUrl).toBe(orig.sourceUrl);
      expect(row.originalUrl).toBe(orig.originalUrl);
      expect(row.applyUrl).toBe(orig.applyUrl);
    }

    // idempotent re-run: updates only
    const rerun = await backfillSourceObservations(db, { apply: true });
    const obsCount = await db.opportunitySourceObservation.count({
      where: { opportunity: { slug: { in: [slugs[1], slugs[2]] } } },
    });
    expect(obsCount).toBe(2);
    // bun runs test files in PARALLEL against the shared *_test DB — other
    // suites may create observation-less rows mid-run, so assert the global
    // re-run created at most a trickle (idempotence for OUR rows is asserted
    // by obsCount above).
    expect(rerun.created).toBeLessThanOrEqual(5);
    expect(rerun.updated).toBeGreaterThanOrEqual(2);
  });
});
