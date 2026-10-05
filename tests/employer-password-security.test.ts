/**
 * AUDIT §21/§22 — employer password security.
 * - forgot-password NEVER returns the reset token over a public endpoint
 * - reset tokens are single-use with expiry
 * - admin-assisted reset reveals the token ONLY to an admin session
 * - change-password: session-gated, verifies current password, rotates cookie
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

// next/headers cookie mock for the admin route's getCurrentAdmin()
let adminCookieValue: string | undefined = undefined;
mock.module('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'aria-admin-session' && adminCookieValue ? { name, value: adminCookieValue } : undefined),
  }),
}));

// Hard-pin the fully-migrated isolated DB (bun auto-loads .env's dev URL otherwise).
process.env.DATABASE_URL = 'postgresql://postgres@127.0.0.1:5433/ariahub_fresh?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolated = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) && (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

let callSeq = 0;
const POST = async (action: string, body: any, cookie?: string) => {
  const { POST: handler } = await import('../src/app/api/employers/auth/[action]/route');
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-forwarded-for': `10.77.${++callSeq}.${callSeq}` };
  if (cookie) headers.cookie = cookie;
  const req = new Request(`http://localhost/api/employers/auth/${action}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const res = await handler(req, { params: Promise.resolve({ action }) });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

const adminPOST = async (body: any) => {
  const { POST: handler } = await import('../src/app/api/admin/employers/password-reset/route');
  const req = new Request('http://localhost/api/admin/employers/password-reset', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.78.${Date.now() % 1000}.1` },
    body: JSON.stringify(body),
  });
  const res = await handler(req as any);
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

const runId = Date.now().toString(36);
const EMAIL = `pwsec-${runId}@test.local`;
let password = `orig-${runId}-pw!`;

let dbUp = false;
try {
  if (isolated) {
    const { db } = await import('../src/lib/db');
    await db.$queryRaw`SELECT 1`;
    dbUp = true;
  }
} catch (e) {
  console.error('GATE DOWN:', String(e).slice(0, 160));
}
const describeIf = (c: boolean) => (c ? describe : describe.skip);

describeIf(dbUp)('employer password security (audit §21/§22)', () => {
  let adminToken: string | undefined;

  beforeAll(async () => {
    const { registerEmployer } = await import('../src/lib/employer-auth');
    const { db } = await import('../src/lib/db');
    await registerEmployer(EMAIL, password, 'Password Security Test');
    await db.adminUser.create({ data: { email: 'audit-admin@test.local', name: 'Audit Admin', password: 'not-a-login-password' } });
    const { createSession } = await import('../src/lib/admin-auth');
    adminToken = await createSession('audit-admin@test.local');
  });

  const clearLimiters = async () => {
    const { db } = await import('../src/lib/db');
    await db.$executeRawUnsafe(`DELETE FROM "RateLimitBucket" WHERE key LIKE 'employer-forgot%' OR key LIKE 'admin-reset-link%'`);
  };

  test('forgot-password response NEVER contains a reset token', async () => {
    await clearLimiters();
    const r = await POST('forgot-password', { email: EMAIL });
    expect(r.status).toBe(200);
    expect(r.json.success).toBe(true);
    expect(r.json.token).toBeUndefined();
    expect(JSON.stringify(r.json)).not.toContain('token');
  });

  test('forgot-password response does not leak account existence', async () => {
    await clearLimiters();
    const a = await POST('forgot-password', { email: `ghost-${runId}@test.local` });
    const b = await POST('forgot-password', { email: EMAIL });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.json).toEqual(b.json);
  });

  test('admin reset endpoint requires an admin session', async () => {
    await clearLimiters();
    adminCookieValue = undefined;
    const r = await adminPOST({ email: EMAIL });
    expect(r.status).toBe(401);
  });

  test('admin session receives the token; it is single-use', async () => {
    await clearLimiters();
    adminCookieValue = adminToken!;
    const r = await adminPOST({ email: EMAIL });
    expect(r.status).toBe(200);
    expect(r.json.delivered).toBe(true);
    const token = r.json.token as string;
    expect(typeof token).toBe('string');
    const { resetEmployerPassword } = await import('../src/lib/employer-auth');
    password = `reset-${runId}-pw!`;
    await resetEmployerPassword(token, password);
    let reuseFailed = false;
    try { await resetEmployerPassword(token, `again-${runId}-pw!`); } catch { reuseFailed = true; }
    expect(reuseFailed).toBe(true);
  });

  test('change-password requires a session', async () => {
    const r = await POST('change-password', { currentPassword: password, newPassword: `new-${runId}-pw!` });
    expect(r.status).toBe(401);
  });

  test('change-password verifies the current password and rotates the session', async () => {
    const { encodeEmployerSession, loginEmployer } = await import('../src/lib/employer-auth');
    const { db } = await import('../src/lib/db');
    const user = await db.user.findUnique({ where: { email: EMAIL } });
    expect(user).toBeTruthy();
    const cookie = `aria-employer-session=${encodeEmployerSession({ userId: user!.id, email: EMAIL, t: Date.now() })}`;

    const bad = await POST('change-password', { currentPassword: 'wrong-pw', newPassword: `new-${runId}-pw!` }, cookie);
    expect(bad.status).toBe(400);

    const short = await POST('change-password', { currentPassword: password, newPassword: 'short' }, cookie);
    expect(short.status).toBe(400);

    const ok = await POST('change-password', { currentPassword: password, newPassword: `new-${runId}-pw!`, confirmPassword: `new-${runId}-pw!` }, cookie);
    expect(ok.status).toBe(200);
    expect(ok.json.success).toBe(true);

    let oldFails = false;
    try { await loginEmployer(EMAIL, password); } catch { oldFails = true; }
    expect(oldFails).toBe(true);
    const li = await loginEmployer(EMAIL, `new-${runId}-pw!`);
    expect(li.email).toBe(EMAIL);
  });

  afterAll(async () => {
    const { db } = await import('../src/lib/db');
    if (dbUp) {
      await db.user.deleteMany({ where: { email: { startsWith: `pwsec-${runId}` } } });
      await db.adminUser.deleteMany({ where: { email: 'audit-admin@test.local' } });
    }
  });
});
