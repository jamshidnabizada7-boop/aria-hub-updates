/**
 * Phase 10 — Discovery Inbox actions (list / keep-separate / merge /
 * publish / reject / trust / pause) against the isolated localhost *_test DB.
 *
 * The review flag shape is exactly what the Phase 4 resolver records:
 * observation.rawData.matchReview = { candidateId, confidence, reasons[] }.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const {
  listDiscoveryInbox, keepSeparate, mergeInto, publishFromInbox,
  rejectFromInbox, trustSource, pauseSource,
} = await import('../src/lib/import/discovery-actions');
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
const incomingSlug = `disc-incoming-${runId}`;
const candidateSlug = `disc-candidate-${runId}`;
const otherSlug = `disc-other-${runId}`;

describeIf(dbUp)('discovery actions (db)', () => {
  let incomingId = '';
  let candidateId = '';
  let observationId = '';
  let sourceId = '';

  beforeAll(async () => {
    // clean slate for this run
    await db.opportunitySourceObservation.deleteMany({ where: { opportunity: { slug: { startsWith: `disc-${runId}` } } } });
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `disc-${runId}` } } });
    await db.importSource.deleteMany({ where: { name: { contains: `DiscSrc-${runId}` } } });

    const src = await db.importSource.create({
      data: { name: `DiscSrc-${runId}`, type: 'job', scraperKey: 'acbar', baseUrl: 'https://acbar.org', trustScore: 40 },
    });
    sourceId = src.id;

    // canonical candidate: official, published, no deadline yet, fallback apply link
    const candidate = await db.opportunity.create({
      data: {
        slug: candidateSlug, title: 'Programme Officer', description: '',
        status: 'published', sourceName: 'Acted Vacancies',
        sourceUrl: `https://www.acted.org/en/jobs/po-${runId}/`,
        applyUrl: `https://www.acted.org/en/jobs/po-${runId}/`,
        applyUrlType: 'source_article_fallback',
        sourceObservations: { create: { sourceName: 'Acted Vacancies', sourceRole: 'official_careers', sourceUrl: `https://www.acted.org/en/jobs/po-${runId}/`, isPrimary: true } },
      },
    });
    candidateId = candidate.id;

    // incoming aggregator duplicate: full description + real email apply + deadline
    const incoming = await db.opportunity.create({
      data: {
        slug: incomingSlug, title: 'Programme Officer', description: 'Incoming description with real content.',
        status: 'draft', sourceName: 'ACBAR', sourceUrl: `https://www.acbar.org/listing/${runId}`,
        deadline: new Date('2026-12-31T00:00:00Z'),
        applyUrl: 'mailto:jobs@real-org.org', applyUrlType: 'application_email',
        sourceObservations: {
          create: { sourceName: 'ACBAR', sourceRole: 'aggregator', sourceUrl: `https://www.acbar.org/listing/${runId}`, isPrimary: true, importSourceId: sourceId,
            rawData: { matchReview: { candidateId, confidence: 80, reasons: ['same organization', 'same title'] } } },
        },
      },
    });
    incomingId = incoming.id;
    const obs = await db.opportunitySourceObservation.findFirst({ where: { opportunityId: incomingId, sourceName: 'ACBAR' } });
    observationId = obs!.id;
  });

  afterAll(async () => {
    await db.opportunitySourceObservation.deleteMany({ where: { opportunity: { slug: { startsWith: `disc-${runId}` } } } });
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `disc-${runId}` } } });
    await db.auditLog.deleteMany({ where: { action: { startsWith: 'discovery.' }, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
    await db.importSource.deleteMany({ where: { name: { contains: `DiscSrc-${runId}` } } });
  });

  test('list shows the pending match with candidate preview', async () => {
    const items = await listDiscoveryInbox(db, 100);
    const mine = items.find((i: any) => i.opportunity.id === incomingId);
    expect(mine).toBeTruthy();
    expect(mine!.match.confidence).toBe(80);
    expect(mine!.candidate?.id).toBe(candidateId);
    expect(mine!.candidate?.title).toBe('Programme Officer');
    expect(mine!.opportunity.sourceName).toBe('ACBAR');
  });

  test('merge re-points observations, promotes fields, deletes the duplicate', async () => {
    const result = await mergeInto(db, incomingId, candidateId, 'admin@test');
    expect(result.movedObservations).toBeGreaterThanOrEqual(1);
    expect(result.promoted).toContain('deadline');       // candidate had none
    expect(result.promoted).toContain('applyUrl');       // candidate had a fallback
    expect(result.promoted).toContain('description');    // candidate had none

    const gone = await db.opportunity.findUnique({ where: { id: incomingId } });
    expect(gone).toBeNull();                             // duplicate deleted

    const merged = await db.opportunity.findUnique({
      where: { id: candidateId }, include: { sourceObservations: true },
    });
    // observations survive and are auditable on the canonical row
    const acbarObs = merged!.sourceObservations.find((o: any) => o.sourceName === 'ACBAR');
    expect(acbarObs).toBeTruthy();
    expect(acbarObs!.opportunityId).toBe(candidateId);
    // aggregator does NOT outrank the official primary
    const primary = merged!.sourceObservations.filter((o: any) => o.isPrimary);
    expect(primary).toHaveLength(1);
    expect(primary[0].sourceRole).toBe('official_careers');
    // authoritative fields promoted
    expect(merged!.deadline?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
    expect(merged!.applyUrl).toBe('mailto:jobs@real-org.org');
    expect(merged!.applyUrlType).toBe('application_email');
    expect(merged!.description).toBe('Incoming description with real content.');

    // the review flag traveled with the observation and is still resolvable
    expect((acbarObs!.rawData as any)?.matchReview?.candidateId).toBe(candidateId);

    // audit trail
    const audit = await db.auditLog.findFirst({ where: { action: 'discovery.merge', entityId: candidateId } });
    expect(audit).toBeTruthy();
  });

  test('merge refuses self-merge and missing rows', async () => {
    let selfError: unknown = null;
    try { await mergeInto(db, candidateId, candidateId, 'admin@test'); } catch (e) { selfError = e; }
    expect(String(selfError)).toMatch(/itself/);

    let missingError: unknown = null;
    try { await mergeInto(db, 'nope', candidateId, 'admin@test'); } catch (e) { missingError = e; }
    expect(String(missingError)).toMatch(/not found/);
  });

  test('publish / reject set status and clear the review flag', async () => {
    // re-seed one incoming row for this test
    const opp = await db.opportunity.create({
      data: {
        slug: `disc-pub-${runId}`, title: 'Uncertain Job', description: 'x'.repeat(40), status: 'draft',
        sourceName: 'ACBAR', sourceUrl: `https://www.acbar.org/pub/${runId}`,
        sourceObservations: { create: { sourceName: 'ACBAR', sourceRole: 'aggregator', sourceUrl: `https://www.acbar.org/pub/${runId}`,
          rawData: { matchReview: { candidateId, confidence: 75, reasons: ['same title'] } } } },
      },
    });
    await publishFromInbox(db, opp.id, 'admin@test');
    const published = await db.opportunity.findUnique({ where: { id: opp.id }, include: { sourceObservations: true } });
    expect(published!.status).toBe('published');
    expect((published!.sourceObservations[0].rawData as any)?.matchReview).toBeUndefined();
    expect((published!.sourceObservations[0].rawData as any)?.matchReviewResolved?.decision).toBe('published');

    await rejectFromInbox(db, opp.id, 'admin@test');
    const rejected = await db.opportunity.findUnique({ where: { id: opp.id } });
    expect(rejected!.status).toBe('archived');
  });

  test('keep-separate clears the flag with a recorded verdict', async () => {
    const opp = await db.opportunity.create({
      data: {
        slug: otherSlug, title: 'Genuinely Different Job', description: 'x'.repeat(40), status: 'draft',
        sourceName: 'ACBAR', sourceUrl: `https://www.acbar.org/ks/${runId}`,
        sourceObservations: { create: { sourceName: 'ACBAR', sourceRole: 'aggregator', sourceUrl: `https://www.acbar.org/ks/${runId}`,
          rawData: { matchReview: { candidateId, confidence: 72, reasons: ['same organization'] } } } },
      },
    });
    const obs = await db.opportunitySourceObservation.findFirst({ where: { opportunityId: opp.id } });
    await keepSeparate(db, obs!.id, 'admin@test');

    const items = await listDiscoveryInbox(db, 100);
    expect(items.find((i: any) => i.opportunity.id === opp.id)).toBeUndefined();
    const after = await db.opportunitySourceObservation.findUnique({ where: { id: obs!.id } });
    expect((after!.rawData as any)?.matchReviewResolved?.decision).toBe('keep-separate');
  });

  test('trust bumps the score (capped) and pause sets the health state', async () => {
    const next = await trustSource(db, sourceId, 'admin@test');
    expect(next).toBe(50); // 40 + 10
    await db.importSource.update({ where: { id: sourceId }, data: { trustScore: 90 } });
    expect(await trustSource(db, sourceId, 'admin@test')).toBe(95); // cap
    expect(await trustSource(db, 'missing-source', 'admin@test')).toBeNull();

    expect(await pauseSource(db, sourceId, 'admin@test')).toBe(true);
    const src = await db.importSource.findUnique({ where: { id: sourceId } });
    expect(src!.healthStatus).toBe('paused');
  });
});
