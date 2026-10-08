/**
 * Employer authentication (Phase 12) — minimal credentials login on the
 * existing (previously dormant) User model.
 *
 * State of the world when this was built: the repo has NO public user auth —
 * no NextAuth, no login pages, `db.user` never queried (verified in the
 * Phase 0 baseline). AdminUser is admin-only by design. This module adds the
 * smallest viable layer for employers: email + bcrypt password on User,
 * a stateless HMAC-signed session cookie (same pattern as admin-auth.ts),
 * and helpers the dashboard/APIs use.
 *
 * Rules carried over from admin-auth.ts:
 *  - production refuses to boot sessions without a strong secret
 *  - httpOnly / secure / sameSite=lax cookie, server-side expiry check
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export const EMPLOYER_SESSION_COOKIE = 'aria-employer-session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sessionSecret(): string {
  const secret = process.env.EMPLOYER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || '';
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('EMPLOYER_SESSION_SECRET (or ADMIN_SESSION_SECRET) must be set in production');
  }
  return secret || 'dev-only-insecure-employer-secret';
}

export interface EmployerSessionPayload {
  userId: string;
  email: string;
  t: number; // issued at
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

/** Encode the session cookie value (payload.signature, base64url JSON). */
export function encodeEmployerSession(payload: EmployerSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Verify signature + expiry; returns null on any mismatch. */
export function decodeEmployerSession(value: string | undefined | null): EmployerSessionPayload | null {
  if (!value || !value.includes('.')) return null;
  const [body, sig] = value.split('.');
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as EmployerSessionPayload;
    if (!payload.userId || !payload.email) return null;
    if (Date.now() - payload.t > SESSION_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface EmployerUser {
  id: string;
  email: string;
  name: string | null;
}

/** Register: creates the User with a bcrypt hash. Fails on duplicate email. */
export async function registerEmployer(email: string, password: string, name?: string): Promise<EmployerUser> {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 8) throw new Error('Password must be at least 8 characters.');
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing) throw new Error('An account with this email already exists. Sign in instead.');
  const user = await db.user.create({
    data: {
      email: normalized,
      name: name?.trim() || null,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  return { id: user.id, email: user.email!, name: user.name };
}

/** Login: constant-shape failure (no user-enumeration detail). */
export async function loginEmployer(email: string, password: string): Promise<EmployerUser> {
  const normalized = String(email ?? '').trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalized } });
  const recentFailures = await db.$queryRaw<Array<{ n: number }>>`
    SELECT COALESCE(SUM("count"), 0)::int AS n FROM "RateLimitBucket"
    WHERE "key" = ${`bf:${normalized}`} AND "windowStart" > now() - interval '15 minutes'
  `;
  if ((recentFailures[0]?.n ?? 0) >= 10) throw new Error('Too many failed attempts. Try again later.');
  // PHASE 7: disabled accounts are indistinguishable from bad credentials
  // (no user-enumeration signal), and brute-force attempts are durably
  // counted per email so they survive serverless restarts.
  if (!user?.passwordHash || user.disabled) throw new Error('Invalid email or password.');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await db.$executeRaw`
      INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "updatedAt")
      VALUES (${`bf:${normalized}`}, now(), 1, now())
      ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    `.catch(() => null);
    throw new Error('Invalid email or password.');
  }
  return { id: user.id, email: user.email!, name: user.name };
}

/** Resolve the signed cookie to the current employer (or null). */
export async function getCurrentEmployer(cookieValue: string | undefined | null): Promise<EmployerUser | null> {
  const payload = decodeEmployerSession(cookieValue);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  // PHASE 7: sessions fail closed for disabled accounts.
  if (!user?.email || user.disabled || user.updatedAt.getTime() > payload.t) return null;
  return { id: user.id, email: user.email, name: user.name };
}

/** Pull the employer session straight off a Request (API routes). */
export async function employerFromRequest(request: Request): Promise<EmployerUser | null> {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === EMPLOYER_SESSION_COOKIE) return getCurrentEmployer(rest.join('='));
  }
  return null;
}

// ─── PHASE 7: account management ─────────────────────────────────────────────

/** Change password for the CURRENT session holder (verifies the old one). */
export async function changeEmployerPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) throw new Error('Account has no password set.');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new Error('Current password is incorrect.');
  if (typeof newPassword !== 'string' || newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
}

/**
 * Create a password-reset token for an email (if the account exists).
 * Always succeeds without revealing whether the account exists.
 * Tokens are single-use, expire in 60 minutes, and are stored hashed.
 */
export async function createPasswordResetToken(email: string): Promise<{ sent: boolean; token?: string }> {
  const normalized = String(email ?? '').trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user?.passwordHash) return { sent: false };
  const token = randomBytes(32).toString('base64url');
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: createHmac('sha256', sessionSecret()).update(token).digest('base64url'),
      passwordResetExpires: new Date(Date.now() + 60 * 60_000),
    },
  });
  return { sent: true, token };
}

/** Complete a reset with a token: sets the new password, invalidates it. */
export async function resetEmployerPassword(token: string, newPassword: string): Promise<void> {
  if (typeof newPassword !== 'string' || newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
  const hashed = createHmac('sha256', sessionSecret()).update(String(token)).digest('base64url');
  const user = await db.user.findFirst({
    where: { passwordResetToken: hashed, passwordResetExpires: { gt: new Date() } },
  });
  if (!user) throw new Error('Reset link is invalid or has expired.');
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
}

/** Admin/operations: disable an account (blocks login, sessions fail closed). */
export async function disableEmployerAccount(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { disabled: true } });
}

/** PHASE 7: change password by session (verifies current). */
export async function changeEmployerPasswordSession(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await changeEmployerPassword(userId, currentPassword, newPassword);
}

/** PHASE 7: expire all reset tokens for a user (used after a reset). */
export async function clearPasswordResetToken(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { passwordResetToken: null, passwordResetExpires: null },
  });
}
