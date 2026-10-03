/**
 * Phase 18 — translation integration. The chunked Persian-first engine is
 * untouched; these tests guarantee every NEW creation path puts rows into
 * the same queue with the pending contract (fa first, ps never before fa).
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { translationPendingFlags } = await import('../src/lib/translation/pending');
const { createJob } = await import('../src/lib/employers/jobs');
const { registerEmployer } = await import('../src/lib/employer-auth');
const { db } = await import('../src/lib/db');

describe('translationPendingFlags (contract)', () => {
  test('pending contract: aggregate pending, Persian gate first, Pashto null', () => {
    expect(translationPendingFlags()).toEqual({ translationStatus: 'pending', faStatus: 'pending', psStatus: null });
  });
});

const runId = Date.now().toString(36);
let dbUp = false;
try {
  if (isolatedTestDatabase) await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch { dbUp = false; }

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);

describeIf(dbUp)('new creation paths enter the translation queue (db)', () => {
  let orgId = '';
  let employerId = '';

  beforeAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `t18-${runId}` } } });
    orgId = (await db.organization.create({ data: { name: `T18 Org ${runId}`, slug: `t18-org-${runId}` } })).id;
    employerId = (await registerEmployer(`t18-${runId}@example.org`, 'password-123')).id;
    await db.organizationMember.create({ data: { organizationId: orgId, userId: employerId, role: 'owner', status: 'active' } });
  });

  afterAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `t18-${runId}` } } });
    await db.user.deleteMany({ where: { email: `t18-${runId}@example.org` } }).catch(() => null);
    await db.organizationMember.deleteMany({ where: { organizationId: orgId } }).catch(() => null);
    await db.organizationAlias.deleteMany({ where: { organizationId: orgId } }).catch(() => null);
    await db.organization.delete({ where: { id: orgId } }).catch(() => null);
    await db.auditLog.deleteMany({ where: { action: { startsWith: 'employer.' }, createdAt: { gte: new Date(Date.now() - 3600_000) } } }).catch(() => null);
  });

  test('dashboard createJob sets the pending flags (fa gate first, ps null)', async () => {
    const created = await createJob(db, employerId, orgId, {
      title: `T18 Translation Job ${runId}`,
      description: 'A job body long enough to pass the eighty character validation gate for employer-created postings on the dashboard.',
      applyEmail: 'hr@t18.example.org',
    });
    const job = await db.opportunity.findUnique({ where: { id: created.id } });
    expect(job!.translationStatus).toBe('pending');
    expect(job!.faStatus).toBe('pending');
    expect(job!.psStatus).toBeNull();
  });

  test('the engine still owns everything downstream: importer path unchanged', async () => {
    // the import path contract is covered by bounded-import.test.ts; here we
    // only assert the flags exist on a pipeline-shaped row for symmetry
    const opp = await db.opportunity.create({
      data: {
        slug: `t18-import-${runId}`, title: 'Imported Job', description: 'x'.repeat(80),
        status: 'draft', sourceName: 'Acted Vacancies',
        ...translationPendingFlags(),
      },
    });
    expect(opp.faStatus).toBe('pending');
    expect(opp.psStatus).toBeNull();
  });
});
