/**
 * Phase 20 — discovery speed analytics over seeded observations/runs
 * (isolated *_test DB).
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { computeDiscoveryMetrics } = await import('../src/lib/analytics/discovery-speed');
const { db } = await import('../src/lib/db');

let dbUp = false;
try {
  if (isolatedTestDatabase) await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch { dbUp = false; }

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);
const runId = Date.now().toString(36);
const H = 3600_000;

describeIf(dbUp)('discovery speed metrics (db)', () => {
  const slugs = { fast: `ds20-fast-${runId}`, slow: `ds20-slow-${runId}`, aggOnly: `ds20-agg-${runId}` };

  beforeAll(async () => {
    await db.opportunitySourceObservation.deleteMany({ where: { opportunity: { slug: { startsWith: `ds20-${runId}` } } } });
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `ds20-${runId}` } } });
    await db.importRun.deleteMany({ where: { startedAt: { gte: new Date(Date.now() - H) }, source: { name: { contains: `DS20 ${runId}` } } } });

    const source = await db.importSource.create({
      data: { name: `DS20 ${runId}`, type: 'job', scraperKey: 'acbar', baseUrl: 'https://acbar.org' },
    });

    // fast official: source published 10:00, we saw it 10:30 (30 min), live 11:00 (30 min pub latency)
    const fast = await db.opportunity.create({
      data: { slug: slugs.fast, title: 'Fast Official', description: 'x'.repeat(80), status: 'published', importedAt: new Date(Date.now() - 4 * H) },
    });
    await db.opportunitySourceObservation.create({
      data: { opportunityId: fast.id, sourceName: 'Acted Vacancies', sourceRole: 'official_careers', sourceUrl: `https://acted.org/${runId}`, isPrimary: true,
        sourcePublishedAt: new Date(Date.now() - 5 * H), firstSeenAt: new Date(Date.now() - 4.5 * H) },
    });

    // slow: aggregator saw it first, official later → upgrade + aggregator carried it later? reversed: official first, aggregator later (ariaHubBefore)
    const slow = await db.opportunity.create({
      data: { slug: slugs.slow, title: 'Slow One', description: 'x'.repeat(80), status: 'published', importedAt: new Date(Date.now() - 2 * H), applyConfidence: 92 },
    });
    await db.opportunitySourceObservation.create({
      data: { opportunityId: slow.id, sourceName: 'Acted Vacancies', sourceRole: 'official_careers', sourceUrl: `https://acted.org/s2-${runId}`, isPrimary: true,
        sourcePublishedAt: new Date(Date.now() - 10 * H), firstSeenAt: new Date(Date.now() - 9 * H) },
    });
    await db.opportunitySourceObservation.create({
      data: { opportunityId: slow.id, sourceName: 'ACBAR', sourceRole: 'aggregator', sourceUrl: `https://acbar.org/s2-${runId}`,
        firstSeenAt: new Date(Date.now() - 3 * H) },
    });

    // aggregator-only row
    const agg = await db.opportunity.create({
      data: { slug: slugs.aggOnly, title: 'Aggregator Only', description: 'x'.repeat(80), status: 'published' },
    });
    await db.opportunitySourceObservation.create({
      data: { opportunityId: agg.id, sourceName: 'ACBAR', sourceRole: 'aggregator', sourceUrl: `https://acbar.org/ao-${runId}`, isPrimary: true },
    });

    await db.importRun.create({
      data: { sourceId: source.id, status: 'ok', duplicates: 7, startedAt: new Date(Date.now() - 2 * H), finishedAt: new Date() },
    });
  });

  afterAll(async () => {
    await db.opportunitySourceObservation.deleteMany({ where: { opportunity: { slug: { startsWith: `ds20-${runId}` } } } });
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `ds20-${runId}` } } });
    await db.importRun.deleteMany({ where: { source: { name: { contains: `DS20 ${runId}` } } } });
    await db.importSource.deleteMany({ where: { name: { contains: `DS20 ${runId}` } } });
  });

  test('computes detection/publication latency, mix, upgrades, and the competitor lead', async () => {
    const m = await computeDiscoveryMetrics(db, 30);
    expect(m.detectionLatency.sample).toBeGreaterThanOrEqual(2);
    // fast: 30 min, slow: 60 min → median 45
    expect(m.detectionLatency.medianMinutes).toBe(45);
    expect(m.publicationLatency.sample).toBeGreaterThanOrEqual(2);
    // shared test db: assert relationships, not exact shared-window percentages
    expect(m.officialPercentage).toBeGreaterThan(0);
    expect(m.aggregatorOnlyPercentage).toBeGreaterThanOrEqual(0);
    expect(m.officialSourceUpgrades).toBe(1); // slow row has aggregator + official
    expect(m.ariaHubBeforeAggregators).toBe(1); // official seen first, ACBAR later
    expect(m.duplicatePrevented).toBeGreaterThanOrEqual(7);
    expect(m.applyResolvedDirectly).toBeGreaterThanOrEqual(1);
  });
});
