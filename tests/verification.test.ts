/**
 * Phase 17 — verification / trust system: the deterministic status mapping
 * plus recomputeVerificationStatus from live observations (isolated *_test DB).
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { computeVerificationStatus, recomputeVerificationStatus, VERIFICATION_STATUSES } =
  await import('../src/lib/verification');
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

describe('computeVerificationStatus (pure mapping table)', () => {
  test('official primary always wins', () => {
    for (const role of ['official_api', 'official_careers', 'official_government']) {
      expect(computeVerificationStatus({ primarySourceRole: role, distinctSourceCount: 1, organizationVerified: false, hasPendingMatchReview: false })).toBe('verified_official');
    }
  });

  test('verified employer requires BOTH employer_submission and an org verification', () => {
    expect(computeVerificationStatus({ primarySourceRole: 'employer_submission', distinctSourceCount: 1, organizationVerified: true, hasPendingMatchReview: false })).toBe('verified_employer');
    expect(computeVerificationStatus({ primarySourceRole: 'employer_submission', distinctSourceCount: 1, organizationVerified: false, hasPendingMatchReview: false })).toBe('single_source');
  });

  test('pending match review outranks multi-source confirmation (uncertain first)', () => {
    expect(computeVerificationStatus({ primarySourceRole: 'aggregator', distinctSourceCount: 3, organizationVerified: false, hasPendingMatchReview: true })).toBe('needs_review');
  });

  test('two distinct sources: aggregator-primary → aggregator_confirmed; else multi_source_confirmed', () => {
    expect(computeVerificationStatus({ primarySourceRole: 'aggregator', distinctSourceCount: 2, organizationVerified: false, hasPendingMatchReview: false })).toBe('aggregator_confirmed');
    expect(computeVerificationStatus({ primarySourceRole: 'employer_submission', distinctSourceCount: 2, organizationVerified: false, hasPendingMatchReview: false })).toBe('multi_source_confirmed');
  });

  test('single source and unknown fallbacks', () => {
    expect(computeVerificationStatus({ primarySourceRole: 'aggregator', distinctSourceCount: 1, organizationVerified: false, hasPendingMatchReview: false })).toBe('single_source');
    expect(computeVerificationStatus({ primarySourceRole: null, distinctSourceCount: 0, organizationVerified: false, hasPendingMatchReview: false })).toBe('needs_review');
    expect(VERIFICATION_STATUSES).toHaveLength(6);
  });
});

describeIf(dbUp)('recomputeVerificationStatus (db)', () => {
  const slugs = [`ver17-official-${runId}`, `ver17-multi-${runId}`];
  const orgSlug = `ver17-org-${runId}`;

  beforeAll(async () => {
    await db.opportunitySourceObservation.deleteMany({ where: { opportunity: { slug: { startsWith: `ver17-${runId}` } } } });
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `ver17-${runId}` } } });
    await db.organizationAlias.deleteMany({ where: { organization: { slug: orgSlug } } });
    await db.organization.deleteMany({ where: { slug: orgSlug } });
  });

  afterAll(async () => {
    await db.opportunitySourceObservation.deleteMany({ where: { opportunity: { slug: { startsWith: `ver17-${runId}` } } } });
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `ver17-${runId}` } } });
    await db.organizationAlias.deleteMany({ where: { organization: { slug: orgSlug } } });
    await db.organization.deleteMany({ where: { slug: orgSlug } });
  });

  test('official primary → verified_official', async () => {
    const org = await db.organization.create({ data: { name: `Ver17 Org ${runId}`, slug: orgSlug } });
    const opp = await db.opportunity.create({
      data: {
        slug: slugs[0], title: 'Official Job', description: 'x'.repeat(80), status: 'published',
        organizationId: org.id,
        sourceObservations: {
          create: { sourceName: 'Acted Vacancies', sourceRole: 'official_careers', sourceUrl: `https://acted.org/${runId}`, isPrimary: true },
        },
      },
    });
    expect(await recomputeVerificationStatus(db, opp.id)).toBe('verified_official');
    expect((await db.opportunity.findUnique({ where: { id: opp.id } }))!.verificationStatus).toBe('verified_official');
  });

  test('aggregator + a second distinct source → aggregator_confirmed; pending review → needs_review', async () => {
    const opp = await db.opportunity.create({
      data: {
        slug: slugs[1], title: 'Multi Job', description: 'x'.repeat(80), status: 'published',
        sourceObservations: {
          create: [
            { sourceName: 'ACBAR', sourceRole: 'aggregator', sourceUrl: `https://acbar.org/${runId}`, isPrimary: true },
            { sourceName: 'Wazifaha Jobs', sourceRole: 'aggregator', sourceUrl: `https://wazifaha.org/${runId}` },
          ],
        },
      },
    });
    expect(await recomputeVerificationStatus(db, opp.id)).toBe('aggregator_confirmed');

    // add a pending matchReview → uncertainty wins until an admin resolves it
    await db.opportunitySourceObservation.updateMany({
      where: { opportunityId: opp.id, sourceName: 'ACBAR' },
      data: { rawData: { matchReview: { candidateId: 'x', confidence: 80, reasons: ['same title'] } } },
    });
    expect(await recomputeVerificationStatus(db, opp.id)).toBe('needs_review');

    // resolving the review restores multi-source trust
    await db.opportunitySourceObservation.updateMany({
      where: { opportunityId: opp.id, sourceName: 'ACBAR' },
      data: { rawData: { matchReviewResolved: { decision: 'keep-separate' }, matchReview: { candidateId: 'x', confidence: 80, reasons: [] } } },
    });
    expect(await recomputeVerificationStatus(db, opp.id)).toBe('aggregator_confirmed');
    expect((await db.opportunity.findUnique({ where: { id: opp.id } }))!.verificationStatus).toBe('aggregator_confirmed');
  });
});
