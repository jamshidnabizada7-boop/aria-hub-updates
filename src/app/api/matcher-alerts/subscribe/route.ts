import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/admin-auth';
import { MatcherProfileSchema } from '@/lib/opportunity-matcher';

const RequestSchema = z.object({
  email: z.string().trim().email().max(200).transform((value) => value.toLowerCase()),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  profile: MatcherProfileSchema,
  website: z.string().max(200).optional().default(''),
});

const COPY = {
  en: {
    subject: 'Confirm your ARIA HUB match alerts',
    heading: 'Confirm personalized opportunity alerts',
    body: 'You asked ARIA HUB to notify you when a strong opportunity match appears for your saved Matcher preferences. Confirm this email to activate those alerts.',
    button: 'Confirm match alerts',
    footer: 'You can unsubscribe at any time. Your Matcher alert profile is stored separately from category alerts.',
  },
  fa: {
    subject: 'تأیید اطلاع‌رسانی تطبیق فرصت در آریا هاب',
    heading: 'اطلاع‌رسانی شخصی فرصت‌ها را تأیید کنید',
    body: 'شما از آریا هاب خواسته‌اید وقتی یک فرصت با تطبیق قوی برای ترجیحات ذخیره‌شده‌تان پیدا شد، به شما ایمیل بفرستد. برای فعال‌سازی، این ایمیل را تأیید کنید.',
    button: 'تأیید اطلاع‌رسانی تطبیق',
    footer: 'هر زمان می‌توانید لغو اشتراک کنید. پروفایل تطبیق شما جدا از اطلاع‌رسانی دسته‌بندی ذخیره می‌شود.',
  },
  ps: {
    subject: 'د آریا هاب د فرصت برابرښت خبرتیاوې تایید کړئ',
    heading: 'شخصي فرصت خبرتیاوې تایید کړئ',
    body: 'تاسو له آریا هاب څخه غوښتنه کړې چې کله ستاسو د خوندي Matcher غوره توبونو لپاره قوي برابر فرصت راشي، ایمیل درولېږي. د فعالولو لپاره دا ایمیل تایید کړئ.',
    button: 'د برابرښت خبرتیاوې تایید کړئ',
    footer: 'هر وخت ګډون لغوه کولای شئ. د Matcher پروفایل د کټګورۍ له خبرتیاوو جلا ساتل کېږي.',
  },
} as const;

function confirmationHtml(lang: 'en' | 'fa' | 'ps', confirmUrl: string): string {
  const c = COPY[lang];
  const rtl = lang !== 'en';
  return `<!doctype html>
<html dir="${rtl ? 'rtl' : 'ltr'}" lang="${lang}"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f8fafc;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <p style="text-align:center;font-weight:900;font-size:18px;color:#b7791f;margin:0 0 18px;">ARIA <span style="color:#0f172a;">HUB</span></p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:26px;text-align:center;">
      <h1 style="font-size:18px;color:#0f172a;margin:0 0 10px;">${c.heading}</h1>
      <p style="color:#334155;font-size:14px;line-height:1.8;margin:0 0 20px;">${c.body}</p>
      <a href="${confirmUrl}" style="display:inline-block;background:#b7791f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:10px;">${c.button}</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px;line-height:1.7;">${c.footer}</p>
  </div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`matcher-alert-subscribe:${ip}`, 5)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    // Honeypot: silently accept bot submissions without persisting.
    if (parsed.data.website.trim()) {
      return NextResponse.json({ success: true, confirmRequired: true });
    }

    const { email, frequency, profile } = parsed.data;
    const lang = profile.lang;
    const confirmToken = randomBytes(24).toString('hex');

    await db.matcherAlertSubscriber.upsert({
      where: { email },
      update: {
        lang,
        profile,
        frequency,
        confirmToken,
        status: 'pending',
        sourceIp: ip,
      },
      create: {
        email,
        lang,
        profile,
        frequency,
        confirmToken,
        status: 'pending',
        sourceIp: ip,
      },
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://www.myariahub.com';
    const confirmUrl = `${baseUrl}/api/matcher-alerts/confirm?email=${encodeURIComponent(email)}&token=${confirmToken}&lang=${lang}`;

    try {
      const { sendHtmlEmail } = await import('@/lib/mailer');
      const mail = await sendHtmlEmail({
        to: email,
        subject: COPY[lang].subject,
        html: confirmationHtml(lang, confirmUrl),
      });
      if (!mail.sent) {
        console.log(`[matcher-alerts] SMTP not configured — confirm URL for ${email}: ${confirmUrl}`);
      }
    } catch (error) {
      console.error('[matcher-alerts] confirmation email failed:', error);
    }

    return NextResponse.json({ success: true, confirmRequired: true });
  } catch (error) {
    console.error('[matcher-alerts] subscribe failed:', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
