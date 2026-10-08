import { applicantSameOrigin } from '@/lib/applicant-origin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { allowDurable } from '@/lib/security/durable-rate-limit';
import { applicantCookie, applicantFromRequest, APPLICANT_COOKIE, ApplicantError, changeApplicantPassword, currentApplicant, expiredApplicantCookie, forgotApplicantPassword, loginApplicant, registerApplicant, requireApplicantEnabled, resetApplicantPassword, revokeApplicantSession, sendVerification } from '@/lib/applicant-auth';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const rawIp = (req: Request) => req.headers.get('cf-connecting-ip') || 'unknown';
const json = (data: object, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(_req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (action !== 'me') return json({ error: 'not_found' }, 404);
  if (!process.env.APPLICANT_AUTH_ENABLED || process.env.APPLICANT_AUTH_ENABLED !== 'true') return json({ user: null });
  const user = await currentApplicant();
  return json({ user: user ? { id: user.id, name: user.name, email: user.email } : null });
}
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (!applicantSameOrigin(req)) return json({ error: 'invalid_origin' }, 403);
  try {
    requireApplicantEnabled();
    const ip = rawIp(req);
    if (!(await allowDurable(db, 'applicant-auth', [action, ip], 5, 60000))) return json({ error: 'rate_limited' }, 429);
    if (Number(req.headers.get('content-length') || 0) > 16384) return json({ error: 'too_large' }, 413);
    const data = await req.json().catch(() => ({}));
    const email = String(data.email || '');
    const password = String(data.password || '');
    const lang = ['en','fa','ps'].includes(data.lang) ? data.lang : 'fa';
    if (action === 'register') {
      await registerApplicant(email, password, String(data.name || ''), lang);
      return json({ success: true, message: 'If registration succeeds, check your email for a verification link.' });
    }
    if (action === 'resend-verification') {
      await sendVerification(email, lang);
      return json({ success: true });
    }
    if (action === 'verify') return json({ error: 'use_verification_link' }, 405);
    if (action === 'login') {
      const session = await loginApplicant(email, password);
      const res = json({ success: true });
      res.cookies.set(applicantCookie(session));
      return res;
    }
    if (action === 'forgot-password') {
      await forgotApplicantPassword(email, lang);
      return json({ success: true });
    }
    if (action === 'reset-password') {
      await resetApplicantPassword(String(data.token || ''), password);
      return json({ success: true });
    }
    if (action === 'logout') {
      const jar = await cookies();
      await revokeApplicantSession(jar.get(APPLICANT_COOKIE)?.value);
      const res = json({ success: true });
      res.cookies.set(expiredApplicantCookie());
      return res;
    }
    if (action === 'change-password') {
      const user = await applicantFromRequest(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const session = await changeApplicantPassword(user.id, String(data.currentPassword || ''), String(data.newPassword || ''));
      const res = json({ success: true });
      res.cookies.set(applicantCookie(session));
      return res;
    }
    return json({ error: 'not_found' }, 404);
  } catch (error) {
    if (error instanceof ApplicantError) return json({ error: error.code }, error.status);
    console.error('[applicant-auth] request failure', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'request_failed' }, 500);
  }
}
