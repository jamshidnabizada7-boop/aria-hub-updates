/**
 * PHASE 7 — employer account completion: change password, forgot/reset
 * password token lifecycle, disabled-account fail-closed sessions.
 * Isolated ariahub_test DB.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const {
  registerEmployer, loginEmployer, changeEmployerPassword,
  createPasswordResetToken, resetEmployerPassword, disableEmployerAccount,
} = await import('../src/lib/employer-auth');
const { db } = await import('../src/lib/db');

let dbUp = false;
try {
  if (isolatedTestDatabase) await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch { dbUp = false; }

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);
const runId = Date.now().toString(36);
const email = `auth7-${runId}@example.org`;

describeIf(dbUp)('employer auth completion (db)', () => {
  let userId = '';

  beforeAll(async () => {
    await db.user.deleteMany({ where: { email: { contains: `auth7-${runId}` } } });
    userId = (await registerEmployer(email, 'old-password-1', 'Auth Seven')).id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { contains: `auth7-${runId}` } } }).catch(() => null);
  });

  test('change password verifies the current one and updates the hash', async () => {
    let err: unknown = null;
    try { await changeEmployerPassword(userId, 'wrong-current', 'new-password-9'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/incorrect/);

    await changeEmployerPassword(userId, 'old-password-1', 'new-password-9');
    const ok = await loginEmployer(email, 'new-password-9');
    expect(ok.id).toBe(userId);
    const stale = await loginEmployer(email, 'old-password-1').catch((e: Error) => e);
    expect(String(stale)).toMatch(/Invalid email or password/);
  });

  test('forgot-password issues a single-use expiring token that completes the reset', async () => {
    const result = await createPasswordResetToken(email);
    expect(result.sent).toBe(true);
    expect(result.token).toBeTruthy();

    await resetEmployerPassword(result.token!, 'reset-password-7');
    const ok = await loginEmployer(email, 'reset-password-7');
    expect(ok.id).toBe(userId);

    // single-use: the same token is now invalid
    let err: unknown = null;
    try { await resetEmployerPassword(result.token!, 'reused-password'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/invalid or has expired/);
  });

  test('unknown email does not issue a token (no enumeration)', async () => {
    const result = await createPasswordResetToken(`nobody-${runId}@example.org`);
    expect(result.sent).toBe(false);
  });

  test('disabled accounts fail login AND fail closed on sessions', async () => {
    await disableEmployerAccount(userId);
    let err: unknown = null;
    try { await loginEmployer(email, 'reset-password-7'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/Invalid email or password/);

    // simulate a still-valid session cookie for the disabled user
    const { encodeEmployerSession, getCurrentEmployer } = await import('../src/lib/employer-auth');
    const cookie = encodeEmployerSession({ userId, email, t: Date.now() });
    expect(await getCurrentEmployer(cookie)).toBeNull();

    await db.user.update({ where: { id: userId }, data: { disabled: false } });
    const { encodeEmployerSession: enc2 } = await import('../src/lib/employer-auth');
    const reenabled = enc2({ userId, email, t: Date.now() });
    expect((await getCurrentEmployer(reenabled))?.id).toBe(userId);
  });

  test('brute-force counter blocks after repeated failures', async () => {
    for (let i = 0; i < 12; i++) {
      await loginEmployer(email, 'totally-wrong-guess').catch(() => null);
    }
    let err: unknown = null;
    try { await loginEmployer(email, 'reset-password-7'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/Too many failed attempts/);
  }, 30_000); // 12 bcrypt compares under parallel-suite load exceed bun's 5s default
});
