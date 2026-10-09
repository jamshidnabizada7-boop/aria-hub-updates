import { applicantSameOrigin } from '@/lib/applicant-origin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { allowDurable } from '@/lib/security/durable-rate-limit';
import { checkDurableRateLimit } from '@/lib/security/durable-rate-limit';
import { createHash } from 'node:crypto';
import { applicantCookie, applicantFromRequest, APPLICANT_COOKIE, ApplicantError, changeApplicantPassword, currentApplicant, expiredApplicantCookie, forgotApplicantPassword, loginApplicant, registerApplicant, requireApplicantEnabled, resetApplicantPassword, revokeApplicantSession, sendVerification } from '@/lib/applicant-auth';
import { cookies } from 'next/headers';
import { enrollApplicant, revokeAllApplicantSessions } from '@/lib/applicant-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Only trust an ingress header when the deployment explicitly guarantees
// direct origin traffic is blocked and Cloudflare overwrites that header.
const rawIp = (req: Request) => process.env.APPLICANT_TRUST_CLOUDFLARE_HEADERS==='true'
  ? (req.headers.get('cf-connecting-ip') || 'unknown').slice(0,64) : 'unknown';
const json = (data: object, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(_req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (action !== 'me') return json({ error: 'not_found' }, 404);
  if (process.env.APPLICANT_AUTH_ENABLED !== 'true') return json({ user: null, authAvailable: false });
  const user = await currentApplicant();
  return json({ user: user ? { id: user.id, name: user.name, email: user.email } : null, authAvailable: true, notificationsAvailable: process.env.APPLICANT_NOTIFICATIONS_ENABLED === 'true' });
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
    if (['login', 'register', 'enroll', 'forgot-password', 'resend-verification'].includes(action)) {
      const key = createHash('sha256').update(email.trim().toLowerCase().slice(0,200)).digest('hex');
      // Account throttling survives rotating IPs and fails closed if its storage fails.
      if (!(await checkDurableRateLimit(db, 'applicant-account:' + key, 10, 15 * 60000)).allowed)
        return json({ error: 'rate_limited' }, 429);
    }
    const password = String(data.password || '');
    const lang = ['en','fa','ps'].includes(data.lang) ? data.lang : 'fa';
    if (action === 'register') {
      await registerApplicant(email, password, String(data.name || ''), lang);
      return json({ success: true, message: 'If registration succeeds, check your email for a verification link.' });
    }
    if (action === 'enroll') {
      await enrollApplicant(email, password, lang);
      return json({ success: true });
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
    if (action === 'logout-all') {
      const user = await applicantFromRequest(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      await db.$transaction([
        db.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } }),
        db.session.deleteMany({ where: { userId: user.id } }),
      ]);
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
