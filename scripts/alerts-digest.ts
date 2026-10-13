/**
 * Alerts digest generator — matches active AlertSubscribers to fresh
 * published opportunities and renders a per-subscriber trilingual email.
 *
 * Modes:
 *   default                 DRY RUN — writes HTML previews to
 *                           private HTML previews named by subscriber ID.
 *   --send                  Actually sends via SMTP (requires SMTP_HOST,
 *                           SMTP_PORT, SMTP_USER, SMTP_PASS env vars).
 *
 * Scheduling (host cron — the script is CLI-only by design):
 *   daily   → cron 0 6 * * *   setsid bun scripts/alerts-digest.ts --send --frequency=daily
 *   weekly  → cron 0 6 * * 1   setsid bun scripts/alerts-digest.ts --send --frequency=weekly
 *
 * A DB lock (AutomationState row 'digest-lock') prevents overlapping cron
 * firings from double-emailing; per-subscriber lastDigestAt is the second
 * guard. A crashed run's lock expires after 30 minutes.
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
import {sendHtmlEmail,smtpConfigured} from '../src/lib/mailer';
import {digestIsDue,digestAttemptKey} from '../src/lib/alerts/digest-policy';
import { writeFileSync, mkdirSync } from 'node:fs';
import { MatcherProfileSchema, rankOpportunities } from '../src/lib/opportunity-matcher';
import { getLocalizedContent } from '../src/lib/i18n-content';

const db = new PrismaClient();

const DIGEST_LOCK_STALE_MS = 30 * 60 * 1000;

/** Atomic claim: returns false when another digest run is still alive. */
async function acquireDigestLock(): Promise<boolean> {
  const claim = JSON.stringify({ digestRunning: true, digestStartedAt: new Date().toISOString() });
  const stale = new Date(Date.now() - DIGEST_LOCK_STALE_MS).toISOString();
  const n = await db.$executeRaw`
    INSERT INTO "AutomationState" (id, state, "updatedAt")
    VALUES ('digest-lock', ${claim}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
    SET state = "AutomationState".state || ${claim}::jsonb, "updatedAt" = now()
    WHERE COALESCE(("AutomationState".state->>'digestRunning')::boolean, false) = false
       OR ("AutomationState".state->>'digestStartedAt') IS NULL
       OR ("AutomationState".state->>'digestStartedAt')::timestamptz < ${stale}::timestamptz`;
  return n === 1;
}

async function releaseDigestLock(): Promise<void> {
  await db.$executeRaw`
    UPDATE "AutomationState"
    SET state = state || '{"digestRunning":false}'::jsonb
    WHERE id = 'digest-lock'`;
}

const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://www.myariahub.com';
const MAX_ITEMS = 6;
const PREVIEWS=process.env.ALERT_PREVIEW_DIRECTORY||'logs/alerts-digest';

const SEND = process.argv.includes('--send');
const freqIdx = process.argv.indexOf('--frequency');
const FREQ_FILTER = freqIdx > -1 ? process.argv[freqIdx + 1] : null;

type Lang = 'en' | 'fa' | 'ps';
const htmlEsc=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

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
          <a href="${BASE_URL}/${lang}/opportunities/${encodeURIComponent(it.slug)}" style="color:#0f172a;font-weight:700;font-size:15px;text-decoration:none;">${htmlEsc(it.title)}</a>
          ${it.organization ? `<div style="color:#475569;font-size:13px;margin-top:4px;">${htmlEsc(it.organization)}</div>` : ''}
          ${it.deadline ? `<div style="color:#b45309;font-size:12px;margin-top:4px;">${t.deadline}: ${fmtDate(it.deadline, lang)}</div>` : ''}
          <a href="${BASE_URL}/${lang}/opportunities/${encodeURIComponent(it.slug)}" style="display:inline-block;margin-top:8px;background:#2563eb;color:#fff;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:700;text-decoration:none;">${t.apply}</a>
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


/** Durable send reservation: an uncertain SMTP outcome is never replayed. */
async function sendDigest(kind:'category'|'matcher',id:string,to:string,frequency:string,subject:string,html:string){
 const attemptId=digestAttemptKey(kind,id,frequency,new Date());
 const state=JSON.stringify({kind,subscriberId:id,status:'sending',startedAt:new Date().toISOString()});
 const inserted=await db.$executeRaw`INSERT INTO "AutomationState" (id,state,"updatedAt") VALUES (${attemptId},${state}::jsonb,now()) ON CONFLICT (id) DO NOTHING`;
 if(!inserted)return false;
 const delegate=kind==='category'?db.alertSubscriber:db.matcherAlertSubscriber;
 const consent=await delegate.findUnique({where:{id},select:{status:true}});
 if(consent?.status!=='active'){await db.automationState.update({where:{id:attemptId},data:{state:{kind,subscriberId:id,status:'suppressed',reason:'consent_removed'}}});return false;}
 try{
  const receipt=await sendHtmlEmail({to,subject,html});if(!receipt.sent)throw Error('smtp_unavailable');
  await db.$transaction([
   db.automationState.update({where:{id:attemptId},data:{state:{kind,subscriberId:id,status:'sent',sentAt:new Date().toISOString()}}}),
   db.auditLog.create({data:{action:'alert_digest_sent',entity:kind==='category'?'AlertSubscriber':'MatcherAlertSubscriber',entityId:id,details:JSON.stringify({attemptId,frequency})}})
  ]);
  return true;
 }catch(error){
  await db.automationState.update({where:{id:attemptId},data:{state:{kind,subscriberId:id,status:'failed_or_unknown',errorCode:error instanceof Error?error.name:'delivery_failure'}}});
  console.error(JSON.stringify({worker:'alerts-digest',subscriberId:id,error:'delivery_failed_or_unknown'}));return false;
 }
}

async function main() {
  if(SEND&&(!smtpConfigured()||process.env.OPPORTUNITY_EMAIL_ALERTS_ENABLED!=='true'))throw Error('digest_delivery_disabled_or_smtp_missing');
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
  if(!SEND)mkdirSync(PREVIEWS, { recursive: true,mode:0o700 });

  for (const sub of subscribers) {
    if(!digestIsDue(sub.lastDigestAt,sub.frequency,now))continue;
    const days = sub.frequency === 'daily' ? 1 : 7;
    const floor = new Date(now.getTime() - days * 24 * 3600 * 1000);
    const since = sub.lastDigestAt && sub.lastDigestAt > floor ? sub.lastDigestAt : floor;
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
      if(!(await sendDigest('category',sub.id,sub.email,sub.frequency,subject,html)))continue;
    } else {
      const safeName = sub.id;
      writeFileSync(`${PREVIEWS}/${safeName}.html`, html,{mode:0o600});
      console.log(`  → preview for ${sub.id}: ${items.length} items, ${lang}, subject="${subject}"`);
    }

    if(SEND)await db.alertSubscriber.update({
      where: { id: sub.id },
      data: { lastDigestAt: now },
    });
    emailed++;
  }

  // Personalized Opportunity Matcher alerts use a separate table and
  // the same deterministic ranking engine as the web Matcher. They never
  // reuse the category-subscription profile or acceptance-probability logic.
  const matcherSubscribers = await db.matcherAlertSubscriber.findMany({
    where: {
      status: 'active',
      ...(FREQ_FILTER ? { frequency: FREQ_FILTER } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  let matcherEmailed = 0;
  let matcherSkipped = 0;

  for (const sub of matcherSubscribers) {
    if(!digestIsDue(sub.lastDigestAt,sub.frequency,now))continue;
    const parsedProfile = MatcherProfileSchema.safeParse(sub.profile);
    if (!parsedProfile.success) {
      console.warn(`  → matcher alert ${sub.id}: invalid saved profile, skipped`);
      matcherSkipped++;
      continue;
    }

    const profile = parsedProfile.data;
    const days = sub.frequency === 'weekly' ? 7 : 1;
    const frequencyFloor = new Date(now.getTime() - days * 24 * 3600 * 1000);
    const since = sub.lastDigestAt && sub.lastDigestAt > frequencyFloor ? sub.lastDigestAt : frequencyFloor;
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const candidates = await db.opportunity.findMany({
      where: {
        status: 'published',
        createdAt: { gt: since },
        OR: [{ deadline: null }, { deadline: { gte: today } }],
      },
      orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        titleI18n: true,
        organization: true,
        country: true,
        deadline: true,
        jobType: true,
        educationReq: true,
        experience: true,
        eligibility: true,
        requirements: true,
        benefits: true,
        tags: true,
        extractedData: true,
        matchProfile: {
          select: {
            eligibleNationalities: true,
            eligibleCountries: true,
            educationLevels: true,
            fieldAreas: true,
            minAge: true,
            maxAge: true,
            minExperienceYears: true,
            languages: true,
            fundingType: true,
            locationType: true,
            visaSponsorship: true,
            provenance: true,
            confidence: true,
            reviewed: true,
          },
        },
        sourceName: true,
        lastChecked: true,
        updatedAt: true,
        category: { select: { slug: true, name: true } },
      },
    });

    const ranked = rankOpportunities(
      profile,
      candidates.map((row) => ({
        ...row,
        structuredFacts: row.matchProfile,
        categorySlug: row.category?.slug ?? null,
        categoryName: row.category?.name ?? null,
      })),
      MAX_ITEMS
    ).filter((item) => item.matchStrength === 'strong' && item.eligibilityStatus !== 'potential_conflict');

    if (ranked.length === 0) {
      matcherSkipped++;
      continue;
    }

    const lang: Lang = sub.lang === 'en' ? 'en' : sub.lang === 'ps' ? 'ps' : 'fa';
    const localized = ranked.map(({ opportunity }) => {
      const source = candidates.find((item) => item.id === opportunity.id)!;
      return {
        title:
          getLocalizedContent(source.title, source.titleI18n as Record<string, string> | null, lang) ||
          source.title,
        organization: source.organization,
        deadline: source.deadline,
        slug: source.slug,
      };
    });

    const unsubBase = `${BASE_URL}/api/matcher-alerts/unsubscribe?email=${encodeURIComponent(sub.email)}&lang=${lang}`;
    const { subject, html } = renderEmail(lang, localized, unsubBase);

    if (SEND) {
      if(!(await sendDigest('matcher',sub.id,sub.email,sub.frequency,subject,html)))continue;
    } else {
      const safeName = 'matcher_'+sub.id;
      writeFileSync(`${PREVIEWS}/${safeName}.html`, html,{mode:0o600});
      console.log(`  → matcher preview for ${sub.id}: ${localized.length} strong matches, ${lang}`);
    }

    if(SEND)await db.matcherAlertSubscriber.update({
      where: { id: sub.id },
      data: { lastDigestAt: now },
    });
    matcherEmailed++;
  }

  console.log(
    `alerts-digest done: category emailed=${emailed} skipped=${skippedNoMatch}; matcher emailed=${matcherEmailed} skipped=${matcherSkipped}; window=${FREQ_FILTER || 'daily+weekly'}`
  );
}

(async () => {
  if (SEND&&!(await acquireDigestLock())) {
    console.log('alerts-digest: another run is in progress (or crashed <30 min ago) — skipping');
    await db.$disconnect();
    process.exit(0);
  }
  try {
    await main();
  } catch (e) {
    console.error('alerts-digest failed', e instanceof Error ? e.name : 'unknown_error');
    process.exitCode=1;
  } finally {
    if(SEND)await releaseDigestLock().catch(() => undefined);
    await db.$disconnect();
  }
})();
