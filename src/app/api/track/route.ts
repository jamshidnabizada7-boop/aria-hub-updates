import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  // Rate limit tracking: 30 per minute per IP (the page fires this on mount)
  if (!rateLimit(`track:${ip}`, 30)) {
    return NextResponse.json({ ok: true });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body.path || '/').slice(0, 200);
    const ua = req.headers.get('user-agent') || '';
    const ref = req.headers.get('referer') || '';
    const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop';
    // Order matters: Edge UA contains "chrome" and "safari"; check edg/firefox first.
    let browser = 'other';
    if (/edg/i.test(ua)) browser = 'edge';
    else if (/firefox/i.test(ua)) browser = 'firefox';
    else if (/chrome|crios/i.test(ua)) browser = 'chrome';
    else if (/safari/i.test(ua)) browser = 'safari';
    await db.visit.create({ data: { path, device, browser, referrer: ref.slice(0, 500) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
