/**
 * Employer auth endpoints (Phase 12) — minimal credentials layer.
 * register | login | logout | me
 */
import { NextResponse } from 'next/server';
import {
  EMPLOYER_SESSION_COOKIE, encodeEmployerSession, registerEmployer,
  loginEmployer, getCurrentEmployer,
} from '@/lib/employer-auth';
import { myOrganizations } from '@/lib/employers/membership';
import { db } from '@/lib/db';

/** Tiny in-memory limiter: 5 auth attempts / minute / IP (per cold start). */
const attempts = new Map<string, { count: number; resetAt: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

function ipOf(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

function sessionCookie(payload: { userId: string; email: string }) {
  return {
    name: EMPLOYER_SESSION_COOKIE,
    value: encodeEmployerSession({ ...payload, t: Date.now() }),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  };
}

function employerCookieValue(request: Request): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === EMPLOYER_SESSION_COOKIE) return rest.join('=');
  }
  return undefined;
}

export async function POST(request: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;

  if (action === 'logout') {
    const res = NextResponse.json({ success: true });
    res.cookies.set({ name: EMPLOYER_SESSION_COOKIE, value: '', httpOnly: true, path: '/', maxAge: 0 });
    return res;
  }

  if (limited(ipOf(request))) {
    return NextResponse.json({ error: 'Too many attempts — wait a minute.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const email = String(body.email ?? '');
  const password = String(body.password ?? '');

  try {
    if (action === 'register') {
      const user = await registerEmployer(email, password, typeof body.name === 'string' ? body.name : undefined);
      const res = NextResponse.json({ success: true, user });
      res.cookies.set(sessionCookie({ userId: user.id, email: user.email }));
      return res;
    }
    if (action === 'login') {
      const user = await loginEmployer(email, password);
      const res = NextResponse.json({ success: true, user });
      res.cookies.set(sessionCookie({ userId: user.id, email: user.email }));
      return res;
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Auth failed' }, { status: 400 });
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (action !== 'me') return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
  const employer = await getCurrentEmployer(employerCookieValue(request));
  if (!employer) return NextResponse.json({ user: null, organizations: [] });
  const organizations = await myOrganizations(db, employer.id);
  return NextResponse.json({ user: employer, organizations });
}
