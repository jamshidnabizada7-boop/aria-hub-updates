/**
 * Alerts digest generator — matches active AlertSubscribers to fresh
 * published opportunities and renders a per-subscriber trilingual email.
 *
 * Modes:
 *   default                 DRY RUN — writes HTML previews to
 *                           logs/alerts-digest/<email>.html + prints a summary.
 *   --send                  Actually sends via SMTP (requires SMTP_HOST,
 *                           SMTP_PORT, SMTP_USER, SMTP_PASS env vars).
 *
 * Scheduling (production, after Neon quota returns):
 *   daily   → cron 0 6 * * *   setsid bun scripts/alerts-digest.ts --send --frequency=daily
 *   weekly  → cron 0 6 * * 1   setsid bun scripts/alerts-digest.ts --send --frequency=weekly
 *
 * Matching rules:
 *   - subscriber.status != 'unsubscribed'
 *   - frequency filter (--frequency or both when omitted)
 *   - window: daily → last 1 day, weekly → last 7 days (from now)
 *   - categorySlug null → all categories; otherwise category.slug OR jobType contains
 *   - only published + unexpired, newest first, max 6 items
 *   - subscribers with 0 matches are skipped (lastDigestAt untouched)
 *   - every emailed subscriber gets lastDigestAt = now
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';

const db = new PrismaClient();

const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://www.myariahub.com';
const MAX_ITEMS = 6;

const SEND = process.argv.includes('--send');
const freqIdx = process.argv.indexOf('--frequency');
const FREQ_FILTER = freqIdx > -1 ? process.argv[freqIdx + 1] : null;

type Lang = 'en' | 'fa' | 'ps';

const L = {
  en: {
    subject: (n: number) => `${n} new opportunit${n === 1 ? 'y' : 'ies'} on ARIA HUB`,
    heading: 'New opportunities picked for you',
    deadline: 'Deadline',
    apply: 'View & apply',
    footer: 'You receive this because you subscribed to ARIA HUB email alerts.',
    unsubscribe: 'Unsubscribe',
    none: '',
  },
  fa: {
    subject: (n: number) => `${n} فرصت جدید در ARIA HUB`,
    heading: 'فرصت‌های جدید انتخاب‌شده برای شما',
    deadline: 'ددلاین',
    apply: 'مشاهده و اقدام',
    footer: 'این ایمیل را دریافت می‌کنید چون در هشدارهای ایمیلی ARIA HUB مشترک شده‌اید.',
    unsubscribe: 'لغو اشتراک',
    none: '',
  },
  ps: {
    subject: (n: number) => `${n} نوي فرصتونه په ARIA HUB کې`,
    heading: 'ستاسو لپاره غوره شوي نوي فرصتونه',
    deadline: 'نېټه',
    apply: 'وګورئ او اقدام وکړئ',
    footer: 'دا برېښنالیک ځکه ترلاسه کوئ چې د ARIA HUB برېښنالیک خبرتیاوو ته غړي یاست.',
    unsubscribe: 'غړیتوب لغوه کړئ',
    none: '',
  },
} as const;

function fmtDate(d: Date, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function renderEmail(
  lang: Lang,
  items: { title: string; organization: string | null; deadline: Date | null; slug: string }[],
  unsubBase: string
): { subject: string; html: string } {
  const t = L[lang];
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
          <a href="${BASE_URL}/${lang}/opportunities/${it.slug}" style="color:#0f172a;font-weight:700;font-size:15px;text-decoration:none;">${it.title}</a>
          ${it.organization ? `<div style="color:#475569;font-size:13px;margin-top:4px;">${it.organization}</div>` : ''}
          ${it.deadline ? `<div style="color:#b45309;font-size:12px;margin-top:4px;">${t.deadline}: ${fmtDate(it.deadline, lang)}</div>` : ''}
          <a href="${BASE_URL}/${lang}/opportunities/${it.slug}" style="display:inline-block;margin-top:8px;background:#2563eb;color:#fff;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:700;text-decoration:none;">${t.apply}</a>
        </td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html dir="${dir}"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f8fafc;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <p style="text-align:center;font-weight:900;font-size:18px;color:#2563eb;margin:0 0 18px;">ARIA <span style="color:#0f172a;">HUB</span></p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:22px;">
      <h1 style="font-size:18px;color:#0f172a;margin:0 0 6px;">${t.heading}</h1>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </div>
    <p style="color:#64748b;font-size:11px;text-align:center;margin-top:16px;">
      ${t.footer}
      <a href="${unsubBase}" style="color:#94a3b8;">${t.unsubscribe}</a>
    </p>
  </div>
</body></html>`;
  return { subject: t.subject(items.length), html };
}

async function main() {
  const now = new Date();
  const subscribers = await db.alertSubscriber.findMany({
    where: {
      // Double opt-in: only confirmed subscribers receive digests.
      // (pending = signed up but never clicked the confirm link)
      status: 'active',
      ...(FREQ_FILTER ? { frequency: FREQ_FILTER } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`alerts-digest: ${subscribers.length} subscriber(s) in scope${SEND ? ' [SEND MODE]' : ' [DRY RUN]'}`);

  let emailed = 0;
  let skippedNoMatch = 0;
  mkdirSync('logs/alerts-digest', { recursive: true });

  for (const sub of subscribers) {
    const days = sub.frequency === 'daily' ? 1 : 7;
    const since = new Date(now.getTime() - days * 24 * 3600 * 1000);
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const where: Record<string, unknown> = {
      status: 'published',
      createdAt: { gte: since },
      OR: [{ deadline: null }, { deadline: { gte: today } }],
    };
    if (sub.categorySlug) {
      where.AND = [
        {
          OR: [
            { category: { slug: sub.categorySlug } },
            { jobType: { contains: sub.categorySlug } },
          ],
        },
      ];
    }

    const items = await db.opportunity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_ITEMS,
      select: { title: true, titleI18n: true, organization: true, deadline: true, slug: true },
    });

    if (items.length === 0) {
      skippedNoMatch++;
      continue;
    }

    const lang: Lang = sub.lang === 'en' ? 'en' : sub.lang === 'ps' ? 'ps' : 'fa';
    // Localize titles when a translation exists (fall back to base title).
    const { getLocalizedContent } = await import('../src/lib/i18n-content');
    const localized = items.map((it) => ({
      title:
        getLocalizedContent(it.title, it.titleI18n as Record<string, string> | null, lang) ||
        it.title,
      organization: it.organization,
      deadline: it.deadline,
      slug: it.slug,
    }));

    const unsubBase = `${BASE_URL}/api/alerts/unsubscribe?email=${encodeURIComponent(sub.email)}`;
    const { subject, html } = renderEmail(lang, localized, unsubBase);

    if (SEND) {
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      if (!host || !user || !pass) {
        console.error('SEND requested but SMTP_HOST/SMTP_USER/SMTP_PASS are missing — aborting before any send.');
        process.exit(1);
      }
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: { user, pass },
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM || `ARIA HUB <${user}>`,
        to: sub.email,
        subject,
        html,
      });
      console.log(`  → sent to ${sub.email} (${items.length} items, ${lang})`);
    } else {
      const safeName = sub.email.replace(/[^a-z0-9._-]/gi, '_');
      writeFileSync(`logs/alerts-digest/${safeName}.html`, html);
      console.log(`  → preview for ${sub.email}: ${items.length} items, ${lang}, subject="${subject}"`);
    }

    await db.alertSubscriber.update({
      where: { id: sub.id },
      data: { lastDigestAt: now },
    });
    emailed++;
  }

  console.log(
    `alerts-digest done: emailed=${emailed} skipped(no match)=${skippedNoMatch} window=${FREQ_FILTER || 'daily+weekly'}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
