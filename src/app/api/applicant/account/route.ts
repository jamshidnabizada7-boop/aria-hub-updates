import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applicantEnabled, applicantFromRequest, expiredApplicantCookie } from '@/lib/applicant-auth';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { checkDurableRateLimit } from '@/lib/security/durable-rate-limit';
import { exportApplicantData, requestAccountDeletion } from '@/lib/applicants/account-privacy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
export async function GET(req: Request) {
  try {
    if (!applicantEnabled()) return reply({ error: 'feature_disabled' }, 503);
    const user = await applicantFromRequest(req);
    if (!user) return reply({ error: 'unauthorized' }, 401);
    if (!(await checkDurableRateLimit(db, 'applicant-export:' + user.id, 3, 60000)).allowed) return reply({ error: 'rate_limited' }, 429);
    const res = reply(await exportApplicantData(db, user.id));
    res.headers.set('Content-Disposition', 'attachment; filename="aria-hub-personal-data.json"');
    return res;
  } catch { return reply({ error: 'export_unavailable' }, 503); }
}
export async function DELETE(req: Request) {
  if (!applicantSameOrigin(req)) return reply({ error: 'invalid_origin' }, 403);
  try {
    if (!applicantEnabled() || process.env.APPLICANT_ACCOUNT_DELETION_ENABLED !== 'true') return reply({ error: 'deletion_unavailable' }, 503);
    const user = await applicantFromRequest(req);
    if (!user) return reply({ error: 'unauthorized' }, 401);
    if (!(await checkDurableRateLimit(db, 'applicant-delete:' + user.id, 3, 60000)).allowed) return reply({ error: 'rate_limited' }, 429);
    const body = await req.json().catch(() => null);
    if (body?.confirm !== 'DELETE' || typeof body.password !== 'string' || body.password.length > 128) return reply({ error: 'confirmation_required' }, 400);
    const job = await requestAccountDeletion(db, user.id, body.password);
    const res = reply({ success: true, status: job.status }, 202);
    res.cookies.set(expiredApplicantCookie());
    res.cookies.set({ name: 'aria-employer-session', value: '', path: '/', httpOnly: true, maxAge: 0 });
    return res;
  } catch (e) { return reply({ error: e instanceof Error && e.message === 'invalid_credentials' ? 'invalid_credentials' : 'deletion_unavailable' }, 400); }
}
