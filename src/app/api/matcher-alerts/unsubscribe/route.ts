import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  const rawLang = req.nextUrl.searchParams.get('lang');
  const lang = rawLang === 'fa' || rawLang === 'ps' ? rawLang : 'en';
  const rtl = lang !== 'en';

  const copy = lang === 'fa'
    ? { done: 'اطلاع‌رسانی تطبیق شما لغو شد.', missing: 'این ایمیل در فهرست اطلاع‌رسانی تطبیق نبود.' }
    : lang === 'ps'
      ? { done: 'ستاسو د برابرښت خبرتیاوې لغوه شوې.', missing: 'دا ایمیل د برابرښت خبرتیاوو په لست کې نه و.' }
      : { done: 'Your personalized match alerts are unsubscribed.', missing: 'This email was not subscribed to match alerts.' };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new NextResponse('Invalid link.', { status: 400 });
  }

  try {
    const result = await db.matcherAlertSubscriber.updateMany({
      where: { email },
      data: { status: 'unsubscribed' },
    });
    const message = result.count ? copy.done : copy.missing;
    return new NextResponse(
      `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>ARIA HUB</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;max-width:440px;text-align:center">
<p style="font-weight:900;color:#b7791f;margin:0 0 8px">ARIA HUB</p><p style="color:#0f172a">${message}</p></div></body></html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('[matcher-alerts] unsubscribe failed:', error);
    return new NextResponse('Something went wrong.', { status: 500 });
  }
}
