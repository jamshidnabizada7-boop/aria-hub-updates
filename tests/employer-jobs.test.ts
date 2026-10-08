/**
 * Phase 13 — employer dashboard job operations with ownership enforcement.
 * The critical guarantee: a recruiter/owner of organization A can NEVER read
 * (beyond their orgs), edit, close, extend or duplicate organization B's jobs.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const {
  listOrgJobs, createJob, updateJob, setJobClosed, extendJobDeadline, duplicateJob,
} = await import('../src/lib/employers/jobs');
const { registerEmployer } = await import('../src/lib/employer-auth');
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

describeIf(dbUp)('employer job operations (db)', () => {
  let orgA = '';
  let orgB = '';
  let ownerA = '';
  let recruiterA = '';
  let ownerB = '';
  let viewerA = '';
  let jobIdA = '';

  const jobInput = {
    title: `Employer Job ${runId}`,
    description: 'A complete employer-authored job description with enough content to pass validation checks.',
    deadline: '2026-12-31T00:00:00.000Z',
    location: 'Kabul',
    applyEmail: 'jobs@employera.example.org',
  };

  beforeAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { contains: `employer-job-${runId}` } } });
    await db.auditLog.deleteMany({ where: { action: { startsWith: 'employer.' }, createdAt: { gte: new Date(Date.now() - 3600_000) } } }).catch(() => null);
    for (const slug of [`Employer Org A ${runId}`, `Employer Org B ${runId}`]) {
      const stale = await db.organization.findUnique({ where: { slug: slug.toLowerCase() } });
      if (stale) {
        await db.opportunity.updateMany({ where: { organizationId: stale.id }, data: { organizationId: null } });
        await db.organizationAlias.deleteMany({ where: { organizationId: stale.id } });
        await db.organization.delete({ where: { id: stale.id } });
      }
    }

    orgA = (await db.organization.create({ data: { name: `Employer Org A ${runId}`, slug: `employer-org-a-${runId}` } })).id;
    orgB = (await db.organization.create({ data: { name: `Employer Org B ${runId}`, slug: `employer-org-b-${runId}` } })).id;

    ownerA = (await registerEmployer(`owner-a-${runId}@example.org`, 'password-123')).id;
    recruiterA = (await registerEmployer(`recruiter-a-${runId}@example.org`, 'password-123')).id;
    viewerA = (await registerEmployer(`viewer-a-${runId}@example.org`, 'password-123')).id;
    ownerB = (await registerEmployer(`owner-b-${runId}@example.org`, 'password-123')).id;

    await db.organizationMember.create({ data: { organizationId: orgA, userId: ownerA, role: 'owner', status: 'active' } });
    await db.organizationMember.create({ data: { organizationId: orgA, userId: recruiterA, role: 'recruiter', status: 'active' } });
    await db.organizationMember.create({ data: { organizationId: orgA, userId: viewerA, role: 'viewer', status: 'active' } });
    await db.organizationMember.create({ data: { organizationId: orgB, userId: ownerB, role: 'owner', status: 'active' } });
  });

  afterAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { contains: `employer-job-${runId}` } } });
    await db.auditLog.deleteMany({ where: { action: { startsWith: 'employer.' }, createdAt: { gte: new Date(Date.now() - 3600_000) } } }).catch(() => null);
    await db.user.deleteMany({ where: { email: { endsWith: `-${runId}@example.org` } } }).catch(() => null);
    for (const id of [orgA, orgB]) {
      await db.organizationMember.deleteMany({ where: { organizationId: id } }).catch(() => null);
      await db.organizationAlias.deleteMany({ where: { organizationId: id } }).catch(() => null);
      await db.organization.delete({ where: { id } }).catch(() => null);
    }
  });

  test('recruiter creates a draft job; viewer and strangers cannot', async () => {
    const created = await createJob(db, recruiterA, orgA, jobInput);
    expect(created.status).toBe('draft');
    jobIdA = created.id;

    let err: unknown = null;
    try { await createJob(db, viewerA, orgA, jobInput); } catch (e) { err = e; }
    expect(String(err)).toMatch(/recruiter access/);

    err = null;
    try { await createJob(db, ownerB, orgA, jobInput); } catch (e) { err = e; }
    expect(String(err)).toMatch(/recruiter access/);
  });

  test('list is scoped to the organization', async () => {
    const mine = await listOrgJobs(db, orgA);
    expect(mine.pending.some((j: any) => j.id === jobIdA)).toBe(true);
    const theirs = await listOrgJobs(db, orgB);
    expect(theirs.pending).toHaveLength(0);
    expect(theirs.active).toHaveLength(0);
  });

  test('cross-org mutations always fail — the ownership wall', async () => {
    let err: unknown = null;
    try { await updateJob(db, ownerB, jobIdA, { title: 'Hacked title here' }); } catch (e) { err = e; }
    expect(String(err)).toMatch(/do not have access/);

    err = null;
    try { await setJobClosed(db, ownerB, jobIdA, true); } catch (e) { err = e; }
    expect(String(err)).toMatch(/do not have access/);

    err = null;
    try { await extendJobDeadline(db, ownerB, jobIdA, '2027-01-01'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/do not have access/);

    err = null;
    try { await duplicateJob(db, ownerB, jobIdA); } catch (e) { err = e; }
    expect(String(err)).toMatch(/do not have access/);

    // B's own list is untouched
    const theirs = await listOrgJobs(db, orgB);
    expect(theirs.pending).toHaveLength(0);
  });

  test('viewer can neither edit nor close; recruiter can', async () => {
    let err: unknown = null;
    try { await updateJob(db, viewerA, jobIdA, { title: 'Viewer edit attempt' }); } catch (e) { err = e; }
    expect(String(err)).toMatch(/do not have access/);

    await updateJob(db, recruiterA, jobIdA, { title: `Employer Job ${runId} v2`, salary: '1000 USD' });
    const job = await db.opportunity.findUnique({ where: { id: jobIdA } });
    expect(job!.title).toBe(`Employer Job ${runId} v2`);
    expect(job!.salary).toBe('1000 USD');
  });

  test('close → expired (hidden), reopen → draft, extend sets deadline, duplicate copies', async () => {
    await setJobClosed(db, ownerA, jobIdA, true);
    expect((await db.opportunity.findUnique({ where: { id: jobIdA } }))!.status).toBe('expired');

    await setJobClosed(db, ownerA, jobIdA, false);
    expect((await db.opportunity.findUnique({ where: { id: jobIdA } }))!.status).toBe('draft');

    await extendJobDeadline(db, ownerA, jobIdA, '2027-03-01T00:00:00.000Z');
    expect((await db.opportunity.findUnique({ where: { id: jobIdA } }))!.deadline!.toISOString().slice(0, 10)).toBe('2027-03-01');

    const copy = await duplicateJob(db, ownerA, jobIdA);
    expect(copy.slug).not.toBe((await db.opportunity.findUnique({ where: { id: jobIdA } }))!.slug);
    const copyRow = await db.opportunity.findUnique({ where: { id: copy.id } });
    expect(copyRow!.title).toContain('(copy)');
    expect(copyRow!.status).toBe('draft');
    expect(copyRow!.organizationId).toBe(orgA);
  });

  test('validation: short title/description and missing apply destination are rejected', async () => {
    let err: unknown = null;
    try { await createJob(db, ownerA, orgA, { ...jobInput, title: 'Hi' }); } catch (e) { err = e; }
    expect(String(err)).toMatch(/5-200/);
    err = null;
    try { await createJob(db, ownerA, orgA, { ...jobInput, description: 'too short' }); } catch (e) { err = e; }
    expect(String(err)).toMatch(/80/);
    err = null;
    try { await createJob(db, ownerA, orgA, { ...jobInput, applyEmail: null, applyUrl: null }); } catch (e) { err = e; }
    expect(String(err)).toMatch(/application URL, email, or phone number/);
  });
});
