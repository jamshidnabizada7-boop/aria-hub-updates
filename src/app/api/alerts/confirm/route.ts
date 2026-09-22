import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Double opt-in confirmation (GET so it works from an email link).
 * Flips a `pending` subscriber to `active` when email + token match.
 * Returns a tiny standalone HTML page (safe for email clients / no-JS).
 *
 * The confirmation email is sent by the subscribe flow when SMTP is
 * configured; without SMTP the confirm URL is logged server-side so QA
 * can still exercise the full flow.
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim();
  const token = req.nextUrl.searchParams.get('token')?.trim();
  const lang = (req.nextUrl.searchParams.get('lang') || 'en').toLowerCase();

  const rtl = lang === 'fa' || lang === 'ps';
  const copy = {
    en: {
      title: 'Subscription confirmed',
      body: 'You will now receive new-opportunity alerts from ARIA HUB in this language. You can unsubscribe any time from any email.',
      brandNote: 'Jobs, scholarships & opportunities in Afghanistan — updated daily.',
      cta: 'Browse opportunities',
      invalid: 'Invalid or expired confirmation link.',
      wrong: 'Something went wrong. Try again later.',
      already: 'This subscription is already confirmed.',
    },
    fa: {
      title: 'اشتراک شما تأیید شد',
      body: 'از این پس اطلاع‌های فرصت‌های جدید آریا هاب را به همین زبان دریافت می‌کنید. هر زمان بخواهید می‌توانید از پایین هر ایمیل لغو اشتراک کنید.',
      brandNote: 'کارها، بورسیه‌ها و فرصت‌ها در افغانستان — هر روز به‌روز.',
      cta: 'مشاهده فرصت‌ها',
      invalid: 'لینک تأیید نامعتبر یا منقضی است.',
      wrong: 'خطایی رخ داد. بعداً دوباره تلاش کنید.',
      already: 'این اشتراک قبلاً تأیید شده است.',
    },
    ps: {
      title: 'ګډون تصدیق شو',
      body: 'له دې وروسته به تاسو د آریا هاب نوي فرصتونه په همدې ژبه ترلاسه کوئ. کولای شئ هر وخت له بریښنالیک لاندې څخه ګډون لغوه کړئ.',
      brandNote: 'دندې، بورسونه او فرصتونه په افغانستان کې — هره ورځ تازه.',
      cta: 'فرصتونه وګورئ',
      invalid: 'د تصدیق لینک ناسم یا پای ته رسیدلی دی.',
      wrong: 'یوه ستونزه رامنځته شوه. وروسته بیا هڅه وکړئ.',
      already: 'دا ګډون دمخه تصدیق شوی دی.',
    },
  } as const;
  const c = copy[lang === 'fa' ? 'fa' : lang === 'ps' ? 'ps' : 'en'];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !token || !/^[a-f0-9]{48}$/.test(token)) {
    return page(c.invalid, 400);
  }

  try {
    const sub = await db.alertSubscriber.findUnique({ where: { email } });
    if (!sub || sub.confirmToken !== token) {
      return page(c.invalid, 404);
    }
    if (sub.status === 'active') {
      return page(c.already, 200);
    }
    if (sub.status === 'unsubscribed') {
      // Unsubscribed is a hard opt-out — a stale confirm link must NOT resurrect it.
      return page(c.invalid, 409);
    }
    await db.alertSubscriber.update({
      where: { id: sub.id },
      data: { status: 'active' },
    });
    return page(c.title, 200, c.body, c);
  } catch (e) {
    console.error('[alerts] confirm failed:', e);
    return page(c.wrong, 500);
  }

  function page(msg: string, status: number, heading?: string, ctx?: typeof c) {
    const showCta = status === 200 && ctx;
    const html = `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARIA HUB — ${ctx?.title ?? 'ARIA HUB'}</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px">
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;max-width:440px;text-align:center">
<p style="font-weight:900;color:#2563eb;margin:0 0 14px">ARIA <span style="color:#0f172a">HUB</span></p>
<div style="width:52px;height:52px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:${status === 200 ? '#dcfce7' : '#fee2e2'}">
<span style="font-size:26px">${status === 200 ? '✓' : '✕'}</span></div>
<p style="font-weight:800;color:#0f172a;font-size:17px;margin:0 0 8px">${heading ?? (status === 200 ? c.title : msg)}</p>
${heading ? `<p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 6px">${msg}</p><p style="color:#64748b;font-size:12px;line-height:1.6;margin:0 0 4px">${ctx ? ctx.brandNote : ''}</p>` : ''}
${showCta ? `<a href="/${lang}/opportunities" style="display:inline-block;margin-top:16px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:10px">${ctx!.cta}</a>` : ''}
</div></body></html>`;
    return new NextResponse(html, {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
}
