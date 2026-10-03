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
import { createHmac, timingSafeEqual } from 'node:crypto';
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
  if (!user?.passwordHash) throw new Error('Invalid email or password.');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Invalid email or password.');
  return { id: user.id, email: user.email!, name: user.name };
}

/** Resolve the signed cookie to the current employer (or null). */
export async function getCurrentEmployer(cookieValue: string | undefined | null): Promise<EmployerUser | null> {
  const payload = decodeEmployerSession(cookieValue);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user?.email) return null;
  return { id: user.id, email: user.email, name: user.name };
}
