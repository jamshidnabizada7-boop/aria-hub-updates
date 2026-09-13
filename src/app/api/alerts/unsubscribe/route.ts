import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * One-click unsubscribe (GET so it works from an email link).
 * Marks the subscriber unsubscribed; re-subscribing re-activates them.
 * Returns a tiny standalone HTML confirmation (safe for email clients).
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new NextResponse('<p style="font-family:sans-serif">Invalid link.</p>', {
      status: 400,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
  try {
    const updated = await db.alertSubscriber.updateMany({
      where: { email },
      data: { status: 'unsubscribed' },
    });
    const msg =
      updated.count > 0
        ? 'You are unsubscribed. You can re-subscribe any time on myariahub.com.'
        : 'This address was not on our list.';
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8"><title>ARIA HUB</title></head>
       <body style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;display:grid;place-items:center;min-height:100vh;margin:0">
       <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;max-width:420px;text-align:center">
       <p style="font-weight:900;color:#2563eb;margin:0 0 8px">ARIA HUB</p>
       <p style="color:#0f172a">${msg}</p></div></body></html>`,
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  } catch (e) {
    console.error('[alerts] unsubscribe failed:', e);
    return new NextResponse('<p style="font-family:sans-serif">Something went wrong. Try again later.</p>', {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
}
