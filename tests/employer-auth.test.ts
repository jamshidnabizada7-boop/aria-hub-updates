/**
 * Phase 12 — employer auth + organization membership & claiming.
 * Auth helpers are tested directly (bcrypt + signed cookie roundtrip);
 * membership/claims run against the isolated localhost *_test DB.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const {
  registerEmployer, loginEmployer, encodeEmployerSession, decodeEmployerSession,
} = await import('../src/lib/employer-auth');
const {
  myOrganizations, claimOrganization, reviewMembership, requireMembership, ROLE_LEVEL,
} = await import('../src/lib/employers/membership');
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

describe('employer auth helpers', () => {
  test('register hashes the password and login verifies it', async () => {
    if (!dbUp) return;
    const email = `employer-${runId}@example.org`;
    const user = await registerEmployer(`  ${email.toUpperCase()}  `, 'super-secret-9', 'Test Employer');
    expect(user.email).toBe(email);
    const stored = await db.user.findUnique({ where: { email } });
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored!.passwordHash).not.toContain('super-secret');

    const bad = await loginEmployer(email, 'wrong-password').catch((e: Error) => e);
    expect(String(bad)).toMatch(/Invalid email or password/);
    const ok = await loginEmployer(email, 'super-secret-9');
    expect(ok.id).toBe(user.id);
  });

  test('register rejects duplicates, weak passwords and junk emails', async () => {
    if (!dbUp) return;
    const email = `employer-${runId}@example.org`;
    let err: unknown = null;
    try { await registerEmployer(email, 'another-pass-1'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/already exists/);
    err = null;
    try { await registerEmployer(`other-${runId}@example.org`, 'short'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/at least 8/);
    err = null;
    try { await registerEmployer('not-an-email', 'long-enough-pass'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/valid email/);
  });

  test('session cookie roundtrip + tamper + expiry', () => {
    const value = encodeEmployerSession({ userId: 'u1', email: 'x@y.org', t: Date.now() });
    expect(decodeEmployerSession(value)?.userId).toBe('u1');
    expect(decodeEmployerSession(value.slice(0, -2) + 'xx')).toBeNull();
    expect(decodeEmployerSession(undefined)).toBeNull();
    const stale = encodeEmployerSession({ userId: 'u1', email: 'x@y.org', t: Date.now() - 31 * 24 * 3600_000 });
    expect(decodeEmployerSession(stale)).toBeNull();
  });
});

describeIf(dbUp)('membership & claiming (db)', () => {
  let orgA = '';
  let orgB = '';
  let employerId = '';
  let outsiderId = '';

  beforeAll(async () => {
    orgA = (await resolveOrganization(db, `Claim Org A ${runId}`)).organization!.id;
    orgB = (await resolveOrganization(db, `Claim Org B ${runId}`)).organization!.id;
    const employer = await registerEmployer(`claimer-${runId}@example.org`, 'password-123', 'Claimer');
    employerId = employer.id;
    const outsider = await registerEmployer(`outsider-${runId}@example.org`, 'password-123', 'Outsider');
    outsiderId = outsider.id;
  });

  afterAll(async () => {
    const emails = [`claimer-${runId}@example.org`, `outsider-${runId}@example.org`, `employer-${runId}@example.org`, `other-${runId}@example.org`];
    await db.user.deleteMany({ where: { email: { in: emails } } }).catch(() => null);
    await db.auditLog.deleteMany({ where: { action: { startsWith: 'membership.' }, createdAt: { gte: new Date(Date.now() - 3600_000) } } }).catch(() => null);
    for (const id of [orgA, orgB]) {
      await db.organizationAlias.deleteMany({ where: { organizationId: id } }).catch(() => null);
      await db.organization.delete({ where: { id } }).catch(() => null);
    }
  });

  test('claim creates a PENDING request and never grants access by itself', async () => {
    const claim = await claimOrganization(db, employerId, orgA, `me@claim-org-a-${runId}.org`);
    expect(claim.status).toBe('pending');

    // no access before approval — the core "never auto-verify" rule
    expect(await requireMembership(db, employerId, orgA, 'viewer')).toBeNull();
    expect(await myOrganizations(db, employerId)).toHaveLength(0);

    // duplicate claim is refused
    let err: unknown = null;
    try { await claimOrganization(db, employerId, orgA, `me@claim-org-a-${runId}.org`); } catch (e) { err = e; }
    expect(String(err)).toMatch(/already exists/);
  });

  test('admin approval activates the owner membership', async () => {
    const member = await db.organizationMember.findFirst({ where: { userId: employerId, organizationId: orgA } });
    await reviewMembership(db, member!.id, true, 'admin@test');
    const orgs = await myOrganizations(db, employerId);
    expect(orgs).toHaveLength(1);
    expect(orgs[0].organizationId).toBe(orgA);
    expect(orgs[0].role).toBe('owner');

    // ownership guard now passes for the member…
    expect((await requireMembership(db, employerId, orgA, 'owner'))!.role).toBe('owner');
    // …but NEVER for another user, and not across organizations
    expect(await requireMembership(db, outsiderId, orgA, 'viewer')).toBeNull();
    expect(await requireMembership(db, employerId, orgB, 'viewer')).toBeNull();
  });

  test('role hierarchy: recruiter cannot act as owner', async () => {
    await db.organizationMember.create({
      data: { organizationId: orgB, userId: employerId, role: 'recruiter', status: 'active' },
    });
    expect((await requireMembership(db, employerId, orgB, 'recruiter'))!.role).toBe('recruiter');
    expect(await requireMembership(db, employerId, orgB, 'owner')).toBeNull();
    expect(ROLE_LEVEL.owner).toBeGreaterThan(ROLE_LEVEL.recruiter);
    expect(ROLE_LEVEL.recruiter).toBeGreaterThan(ROLE_LEVEL.viewer);
  });

  test('only pending rows can be reviewed; rejection suspends', async () => {
    const claim = await claimOrganization(db, outsiderId, orgA, 'evidence@somewhere.org');
    const member = await db.organizationMember.findUnique({ where: { id: claim.id } });
    await reviewMembership(db, member!.id, false, 'admin@test');
    const rejected = await db.organizationMember.findUnique({ where: { id: claim.id } });
    expect(rejected!.status).toBe('suspended');
    expect(await requireMembership(db, outsiderId, orgA, 'viewer')).toBeNull();

    const active = await db.organizationMember.findFirst({ where: { userId: employerId, organizationId: orgA } });
    let err: unknown = null;
    try { await reviewMembership(db, active!.id, true, 'admin@test'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/Only pending/);
  });
});
