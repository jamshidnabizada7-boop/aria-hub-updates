import { NextRequest, NextResponse } from 'next/server';
import { verifyApplicantEmail } from '@/lib/applicant-auth';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lang = ['en','fa','ps'].includes(searchParams.get('lang') || '') ? searchParams.get('lang') : 'fa';
  let ok = false;
  try { ok = await verifyApplicantEmail(searchParams.get('email') || '', searchParams.get('token') || ''); } catch { ok = false; }
  // The reverse proxy may expose an internal HTTP origin to Next. Return to
  // the configured public HTTPS site, never an internal port or caller Host.
  const target = new URL('/' + lang + '/login', process.env.PUBLIC_SITE_URL || 'https://www.myariahub.com');
  target.searchParams.set('verified', ok ? 'yes' : 'invalid');
  return NextResponse.redirect(target, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
