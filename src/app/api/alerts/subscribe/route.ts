import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';
import { randomBytes } from 'node:crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_CATEGORIES = new Set([
  'jobs',
  'scholarships',
  'internships',
  'fellowships',
  'competitions',
  'conferences',
  'volunteer',
  'exchange-programs',
  'training',
]);

const ALLOWED_LANGS = new Set(['en', 'fa', 'ps']);
const ALLOWED_FREQUENCIES = new Set(['weekly', 'daily']);

/** Strip control chars, collapse whitespace and cap length. */
function clean(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const CONFIRM_COPY = {
  en: {
    subject: 'Confirm your ARIA HUB alerts',
    heading: 'One click to finish',
    body: 'Please confirm your email alerts subscription for new jobs, scholarships and opportunities in Afghanistan. If you did not sign up, you can ignore this email.',
    button: 'Confirm subscription',
    footer: 'You received this because someone subscribed this address on myariahub.com.',
  },
  fa: {
    subject: 'تأیید اشتراک اطلاع‌های آریا هاب',
    heading: 'یک کلیک تا تکمیل',
    body: 'لطفاً اشتراک اطلاع‌های ایمیلی فرصت‌های جدید (کار، بورسیه و برنامه‌ها) در افغانستان را تأیید کنید. اگر شما ثبت‌نام نکرده‌اید، این ایمیل را نادیده بگیرید.',
    button: 'تأیید اشتراک',
    footer: 'این ایمیل را دریافت کرده‌اید چون این نشانی در myariahub.com ثبت شده است.',
  },
  ps: {
    subject: 'د آریا هاب خبرتیا تصدیق کړئ',
    heading: 'یو کلیک پاتې دی',
    body: 'مهرباني وکړئ د افغانستان نوي فرصتونو (دندې، بورسونه او پروګرامونه) د بریښنالیک خبرتیا ګډون تصدیق کړئ. که تاسو ثبت نام نه دی کړی، دا بریښنالیک له پامه غورځوئ.',
    button: 'ګډون تصدیق کړئ',
    footer: 'دا بریښنالیک تاسو ته ځکه رارسیدلی چې دا پته په myariahub.com کې ثبت شوې ده.',
  },
} as const;

function confirmEmailHtml(lang: string, confirmUrl: string): string {
  const c = CONFIRM_COPY[lang === 'fa' ? 'fa' : lang === 'ps' ? 'ps' : 'en'];
  const rtl = lang === 'fa' || lang === 'ps';
  return `<!doctype html>
<html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f8fafc;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <p style="text-align:center;font-weight:900;font-size:18px;color:#2563eb;margin:0 0 18px;">ARIA <span style="color:#0f172a;">HUB</span></p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:26px;text-align:center;">
      <h1 style="font-size:18px;color:#0f172a;margin:0 0 10px;">${c.heading}</h1>
      <p style="color:#334155;font-size:14px;line-height:1.8;margin:0 0 20px;">${c.body}</p>
      <a href="${confirmUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:10px;">${c.button}</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px;line-height:1.7;">${c.footer}</p>
  </div>
</body></html>`;
}

function confirmSubject(lang: string): string {
  return CONFIRM_COPY[lang === 'fa' ? 'fa' : lang === 'ps' ? 'ps' : 'en'].subject;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`alert-subscribe:${ip}`, 5)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again in a few minutes.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot — real users never fill this hidden field; bots do.
    const honeypot = clean(body.website, 200);
    if (honeypot) {
      return NextResponse.json({ success: true });
    }

    const email = clean(body.email, 200).toLowerCase();
    const lang = clean(body.lang, 8);
    const categorySlug = clean(body.categorySlug, 40);
    const frequency = clean(body.frequency, 16);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (!ALLOWED_LANGS.has(lang)) {
      return NextResponse.json({ error: 'invalid_lang' }, { status: 400 });
    }
    if (categorySlug && !ALLOWED_CATEGORIES.has(categorySlug)) {
      return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
    }
    if (!ALLOWED_FREQUENCIES.has(frequency)) {
      return NextResponse.json({ error: 'invalid_frequency' }, { status: 400 });
    }

    // Fresh token every signup so a re-subscribe always yields a working link.
    const confirmToken = randomBytes(24).toString('hex');

    // Idempotent re-subscribe: preferences always update and the subscriber
    // returns to `pending`. With double opt-in the emailed confirm link is
    // the real activation gate (and unsubscribed users can always opt back
    // in deliberately by re-signing up and clicking the fresh link).
    await db.alertSubscriber.upsert({
      where: { email },
      update: {
        lang,
        categorySlug: categorySlug || null,
        frequency,
        confirmToken,
        status: 'pending',
      },
      create: {
        email,
        lang,
        categorySlug: categorySlug || null,
        frequency,
        status: 'pending',
        confirmToken,
        sourceIp: ip,
      },
    });

    // Double opt-in: send the confirmation link when SMTP is configured.
    // Without SMTP the URL is logged so QA can exercise the full flow.
    const confirmUrl = `/api/alerts/confirm?email=${encodeURIComponent(email)}&token=${confirmToken}&lang=${lang}`;
    try {
      const { sendHtmlEmail } = await import('@/lib/mailer');
      const result = await sendHtmlEmail({ to: email, subject: confirmSubject(lang), html: confirmEmailHtml(lang, confirmUrl) });
      if (!result.sent) {
        return NextResponse.json({ error: 'email_delivery_unavailable' }, { status: 503 });
      }
    } catch (mailErr) {
      // Delivery failure must never fail the signup — admin can re-trigger.
      console.error('[alert-subscribe] confirm email failed:', mailErr instanceof Error ? mailErr.name : 'unknown');
      return NextResponse.json({ error: 'email_delivery_unavailable' }, { status: 503 });
    }

    return NextResponse.json({ success: true, confirmRequired: true });
  } catch (e) {
    console.error('[alert-subscribe] error:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
