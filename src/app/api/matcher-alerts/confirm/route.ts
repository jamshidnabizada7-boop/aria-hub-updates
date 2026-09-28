import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const COPY = {
  en: {
    ok: 'Match alerts confirmed',
    body: 'ARIA HUB will email you when a new strong match appears for your saved Matcher preferences.',
    invalid: 'Invalid or expired confirmation link.',
    already: 'These match alerts are already active.',
    cta: 'Open Opportunity Matcher',
  },
  fa: {
    ok: 'اطلاع‌رسانی تطبیق تأیید شد',
    body: 'وقتی یک فرصت جدید با تطبیق قوی برای ترجیحات ذخیره‌شده شما پیدا شود، آریا هاب به شما ایمیل می‌فرستد.',
    invalid: 'لینک تأیید نامعتبر یا منقضی است.',
    already: 'این اطلاع‌رسانی تطبیق قبلاً فعال شده است.',
    cta: 'باز کردن تطبیق‌دهنده فرصت',
  },
  ps: {
    ok: 'د برابرښت خبرتیاوې تایید شوې',
    body: 'کله چې ستاسو د خوندي غوره توبونو لپاره نوی قوي برابر فرصت راشي، آریا هاب به ایمیل درولېږي.',
    invalid: 'د تایید لینک ناسم یا پای ته رسېدلی دی.',
    already: 'دا د برابرښت خبرتیاوې لا دمخه فعالې دي.',
    cta: 'د فرصت Matcher پرانیزئ',
  },
} as const;

function htmlPage(lang: 'en' | 'fa' | 'ps', title: string, body: string, status: number) {
  const c = COPY[lang];
  const rtl = lang !== 'en';
  const html = `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARIA HUB</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px">
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;max-width:460px;text-align:center">
<p style="font-weight:900;color:#b7791f;margin:0 0 14px">ARIA <span style="color:#0f172a">HUB</span></p>
<div style="width:52px;height:52px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:${status === 200 ? '#dcfce7' : '#fee2e2'}"><span style="font-size:26px">${status === 200 ? '✓' : '✕'}</span></div>
<h1 style="font-size:18px;color:#0f172a;margin:0 0 8px">${title}</h1>
<p style="color:#475569;font-size:14px;line-height:1.7;margin:0">${body}</p>
${status === 200 ? `<a href="/${lang}/opportunity-matcher" style="display:inline-block;margin-top:18px;background:#b7791f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:10px">${c.cta}</a>` : ''}
</div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  const token = req.nextUrl.searchParams.get('token')?.trim();
  const rawLang = req.nextUrl.searchParams.get('lang');
  const lang: 'en' | 'fa' | 'ps' = rawLang === 'fa' || rawLang === 'ps' ? rawLang : 'en';
  const c = COPY[lang];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !token || !/^[a-f0-9]{48}$/.test(token)) {
    return htmlPage(lang, c.invalid, c.invalid, 400);
  }

  try {
    const sub = await db.matcherAlertSubscriber.findUnique({ where: { email } });
    if (!sub || sub.confirmToken !== token || sub.status === 'unsubscribed') {
      return htmlPage(lang, c.invalid, c.invalid, 404);
    }
    if (sub.status === 'active') {
      return htmlPage(lang, c.already, c.body, 200);
    }
    await db.matcherAlertSubscriber.update({
      where: { id: sub.id },
      data: { status: 'active' },
    });
    return htmlPage(lang, c.ok, c.body, 200);
  } catch (error) {
    console.error('[matcher-alerts] confirm failed:', error);
    return htmlPage(lang, c.invalid, c.invalid, 500);
  }
}
