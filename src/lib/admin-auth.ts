import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'aria-admin-session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
// Session signing secret. Production REQUIRES ADMIN_SESSION_SECRET — a known
// constant here would let anyone mint admin sessions, so we hard-fail instead
// of booting. Dev falls back to a fresh random secret per process (sessions
// reset on restart; set ADMIN_SESSION_SECRET in .env to keep them stable).
function resolveSessionSecret(): string {
  const fromEnv = process.env.ADMIN_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_SESSION_SECRET must be set to a strong random value in production — refusing to boot with a forgeable session secret.',
    );
  }
  return randomBytes(32).toString('hex');
}
const SESSION_SECRET = resolveSessionSecret();

// Simple signed token: base64(email).hmac — lightweight stateless session.
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Run a dummy bcrypt compare to normalize timing when a user is not found. */
export async function dummyVerify(): Promise<void> {
  await bcrypt.compare('x', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8eVjP3wWwPvJ5XnqXjQ8QcYcQqYcK');
}

export async function createSession(email: string): Promise<string> {
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), t: Date.now() })).toString('base64url');
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifySession(token: string): Promise<{ email: string } | null> {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = await sign(payload);
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.email || typeof data.t !== 'number') return null;
    // Enforce server-side session expiry (the cookie maxAge can be tampered with)
    if (Date.now() - data.t > SESSION_MAX_AGE_MS) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

async function sign(data: string): Promise<string> {
  const { createHmac } = await import('crypto');
  return createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
}

export async function getCurrentAdmin() {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await verifySession(token);
    if (!session) return null;
    
    const user = await db.adminUser.findUnique({
      where: { email: session.email },
      select: { id: true, email: true, name: true, role: true },
    });
    
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error: any) {
    if (error?.message?.includes('DYNAMIC_SERVER_USAGE') || error?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    console.error('getCurrentAdmin error:', error);
    return null;
  }
}

export async function setSessionCookie(email: string) {
  const store = await cookies();
  const token = await createSession(email);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Extract client IP from common proxy headers (best-effort). */
export function getClientIp(req?: Request): string | null {
  if (!req) return null;
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip') || null;
}

/** Write an audit log entry. Best-effort — never throws. */
export async function logAction(opts: {
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
  req?: NextRequest;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        action: opts.action,
        entity: opts.entity ?? null,
        entityId: opts.entityId ?? null,
        details: opts.details ?? null,
        ip: getClientIp(opts.req),
      },
    });
  } catch {
    // Audit logging must never break the main operation.
  }
}

/**
 * Simple in-memory rate limiter (token bucket per key).
 * Returns true if the request is allowed, false if rate-limited.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute

export function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Periodic cleanup of expired buckets to avoid memory growth
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

export { SESSION_COOKIE };
