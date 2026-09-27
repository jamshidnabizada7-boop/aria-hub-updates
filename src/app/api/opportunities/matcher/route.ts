import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { getAIProvider } from '@/lib/ai/provider';
import { parseJSON } from '@/lib/ai/providers/helpers';
import { getClientIp, rateLimit } from '@/lib/admin-auth';
import { startOfTodayUtc, daysUntilDeadline } from '@/lib/opportunity-shared';
import {
  EDUCATION_LEVELS,
  MATCHER_INTENTS,
  intentConfig,
  isNearMatch,
  isRecommendation,
  rankOpportunities,
  type DataConfidence,
  type EligibilityStatus,
  type MatchStrength,
  type MatcherProfile,
} from '@/lib/opportunity-matcher';

const MAX_BODY_BYTES = 8_192;
const MAX_RESULTS = 6;
const AI_TIMEOUT_MS = 8_000;

const BodySchema = z.object({
  intent: z.enum(MATCHER_INTENTS),
  education: z.enum(EDUCATION_LEVELS),
  nationality: z.string().trim().regex(/^[A-Z]{2}$/).nullable().optional(),
  residence: z.string().trim().regex(/^[A-Z]{2}$/).nullable().optional(),
  targetCountry: z.union([z.literal('ANY'), z.string().trim().regex(/^[A-Z]{2}$/)]),
  experienceYears: z.number().int().min(0).max(40).nullable().optional(),
  lang: z.enum(['fa', 'ps', 'en']).default('en'),
});

const ExplanationSchema = z.array(
  z.object({
    id: z.string().min(1).max(80),
    rationale: z.string().trim().min(1).max(320),
  })
).max(MAX_RESULTS);

interface ChatProvider {
  chat(system: string, user: string): Promise<string>;
}

const LANG_NAME: Record<'fa' | 'ps' | 'en', string> = {
  fa: 'Persian (Farsi, Arabic script)',
  ps: 'Pashto (Arabic script)',
  en: 'English',
};

const MATCHER_SYSTEM =
  'You write short, evidence-grounded recommendation explanations for ARIA HUB. ' +
  'You MUST use only the supplied evidence. Do not infer eligibility, acceptance probability, prestige, funding, nationality access, or requirements that are not explicitly supplied. ' +
  'If evidence is incomplete, say that the user should verify the unknown requirement. ' +
  'Return only valid JSON.';

const COPY = {
  en: {
    deterministic: 'Recommended from the structured facts ARIA HUB currently knows. Review the full requirements before applying.',
    aiDisclosure: 'AI was used only to explain already-selected results; it did not decide eligibility or acceptance probability.',
  },
  fa: {
    deterministic: 'این پیشنهاد بر اساس اطلاعات ساختاریافته‌ای است که فعلاً در ARIA HUB موجود است. پیش از درخواست، شرایط کامل را بررسی کنید.',
    aiDisclosure: 'هوش مصنوعی فقط برای توضیح نتایج از قبل انتخاب‌شده استفاده شد؛ درباره واجد شرایط بودن یا احتمال پذیرش تصمیم نگرفت.',
  },
  ps: {
    deterministic: 'دا وړاندیز د هغو جوړښتي معلوماتو پر بنسټ دی چې اوس په ARIA HUB کې شته. د غوښتنلیک تر مخه بشپړ شرایط وګورئ.',
    aiDisclosure: 'مصنوعي ځیرکتیا یوازې د مخکې ټاکل شوو پایلو د تشریح لپاره وکارول شوه؛ د وړتیا یا منل کېدو احتمال یې نه دی ټاکلی.',
  },
} as const;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('matcher_ai_timeout')), ms)),
  ]);
}

function localizeEvidence(value: string, lang: 'fa' | 'ps' | 'en'): string {
  if (lang === 'en') return value;
  const fa: Record<string, string> = {
    'Canonical opportunity category matches your selected type.': 'دسته‌بندی اصلی فرصت با نوع انتخاب‌شده شما مطابقت دارد.',
    'Opportunity type matches your selected type.': 'نوع فرصت با انتخاب شما مطابقت دارد.',
    'Opportunity title strongly matches your selected type.': 'عنوان فرصت به‌طور واضح با نوع انتخاب‌شده شما مرتبط است.',
    'You selected any destination.': 'شما هر مقصدی را پذیرفته‌اید.',
    'Destination matches your preference.': 'مقصد با ترجیح شما مطابقت دارد.',
    'Opportunity appears global, international, online, or remote.': 'این فرصت جهانی، بین‌المللی، آنلاین یا دورکار به نظر می‌رسد.',
    'Destination differs from your preference.': 'مقصد با ترجیح انتخاب‌شده شما متفاوت است.',
    'Location is not fully structured; verify destination details.': 'اطلاعات مکان کامل نیست؛ جزئیات مقصد را بررسی کنید.',
    'Structured data indicates broad/international nationality eligibility.': 'اطلاعات ساختاریافته نشان می‌دهد واجد شرایط بودن از نظر تابعیت گسترده یا بین‌المللی است.',
    'Structured nationality information includes your nationality.': 'اطلاعات ساختاریافته تابعیت، تابعیت شما را شامل می‌شود.',
    'Structured nationality information may exclude your nationality.': 'اطلاعات ساختاریافته ممکن است تابعیت شما را شامل نکند.',
    'Nationality information exists but needs manual verification.': 'اطلاعات تابعیت وجود دارد اما باید دستی بررسی شود.',
    'Structured residence information indicates broad geographic eligibility.': 'اطلاعات ساختاریافته اقامت نشان می‌دهد شرایط جغرافیایی گسترده است.',
    'Structured residence information includes your current country of residence.': 'اطلاعات ساختاریافته اقامت، کشور محل اقامت فعلی شما را شامل می‌شود.',
    'Structured residence information may exclude your current country of residence.': 'اطلاعات ساختاریافته اقامت ممکن است کشور محل اقامت فعلی شما را شامل نکند.',
    'Residence information exists but needs manual verification.': 'اطلاعات اقامت وجود دارد اما باید دستی بررسی شود.',
    'Your education level meets the explicitly stated minimum education requirement.': 'سطح تحصیلات شما حداقل شرط تحصیلی صریح را برآورده می‌کند.',
    'Your selected education level appears below an explicitly stated minimum requirement.': 'سطح تحصیلات انتخاب‌شده شما پایین‌تر از حداقل شرط صریح به نظر می‌رسد.',
    'Your experience meets the stated minimum experience requirement.': 'تجربه شما حداقل سابقه کاری ذکرشده را برآورده می‌کند.',
    'Deadline is very close; review application requirements immediately.': 'مهلت بسیار نزدیک است؛ شرایط درخواست را فوراً بررسی کنید.',
    'No structured deadline is available; confirm the current closing date.': 'مهلت ساختاریافته‌ای موجود نیست؛ تاریخ بسته‌شدن را تأیید کنید.',
    'ARIA HUB has limited structured eligibility data for this listing.': 'ARIA HUB برای این فرصت اطلاعات ساختاریافته واجد شرایط بودن محدودی دارد.',
  };
  const ps: Record<string, string> = {
    'Canonical opportunity category matches your selected type.': 'د فرصت اصلي کټګوري ستاسو له ټاکل شوي ډول سره سمون لري.',
    'Opportunity type matches your selected type.': 'د فرصت ډول ستاسو له انتخاب سره سمون لري.',
    'Opportunity title strongly matches your selected type.': 'د فرصت سرلیک ستاسو له ټاکل شوي ډول سره روښانه تړاو لري.',
    'You selected any destination.': 'تاسو هر منزل منلی دی.',
    'Destination matches your preference.': 'منزل ستاسو له خوښې سره سمون لري.',
    'Opportunity appears global, international, online, or remote.': 'فرصت نړیوال، بین المللي، آنلاین یا لرې ښکاري.',
    'Destination differs from your preference.': 'منزل ستاسو له ټاکل شوې خوښې سره توپیر لري.',
    'Location is not fully structured; verify destination details.': 'د ځای معلومات بشپړ جوړښتي نه دي؛ د منزل جزییات تایید کړئ.',
    'Structured data indicates broad/international nationality eligibility.': 'جوړښتي معلومات د تابعیت له پلوه پراخه یا نړیواله وړتیا ښيي.',
    'Structured nationality information includes your nationality.': 'جوړښتي د تابعیت معلومات ستاسو تابعیت شاملوي.',
    'Structured nationality information may exclude your nationality.': 'جوړښتي د تابعیت معلومات ښايي ستاسو تابعیت شامل نه کړي.',
    'Nationality information exists but needs manual verification.': 'د تابعیت معلومات شته، خو لاسي تایید ته اړتیا لري.',
    'Structured residence information indicates broad geographic eligibility.': 'جوړښتي د استوګنې معلومات پراخه جغرافیایي وړتیا ښيي.',
    'Structured residence information includes your current country of residence.': 'جوړښتي د استوګنې معلومات ستاسو اوسنی د استوګنې هېواد شاملوي.',
    'Structured residence information may exclude your current country of residence.': 'جوړښتي د استوګنې معلومات ښايي ستاسو اوسنی د استوګنې هېواد شامل نه کړي.',
    'Residence information exists but needs manual verification.': 'د استوګنې معلومات شته، خو لاسي تایید ته اړتیا لري.',
    'Your education level meets the explicitly stated minimum education requirement.': 'ستاسو د زده کړو کچه څرګند شوی لږ تر لږه تعلیمي شرط پوره کوي.',
    'Your selected education level appears below an explicitly stated minimum requirement.': 'ستاسو ټاکل شوې تعلیمي کچه تر څرګند شوي لږ تر لږه شرط کمه ښکاري.',
    'Your experience meets the stated minimum experience requirement.': 'ستاسو تجربه د یاد شوي لږ تر لږه تجربې شرط پوره کوي.',
    'Deadline is very close; review application requirements immediately.': 'وروستۍ نېټه ډېره نږدې ده؛ د غوښتنلیک شرطونه ژر وګورئ.',
    'No structured deadline is available; confirm the current closing date.': 'جوړښتي وروستۍ نېټه نشته؛ د پای اوسنی تاریخ تایید کړئ.',
    'ARIA HUB has limited structured eligibility data for this listing.': 'ARIA HUB د دې فرصت لپاره محدود جوړښتي د وړتیا معلومات لري.',
  };

  const experienceMatch = value.match(/^This opportunity appears to require at least (\d+) years of experience\.$/);
  if (experienceMatch) {
    return lang === 'fa'
      ? `به نظر می‌رسد این فرصت حداقل ${experienceMatch[1]} سال تجربه می‌خواهد.`
      : `داسې ښکاري چې دا فرصت لږ تر لږه ${experienceMatch[1]} کاله تجربه غواړي.`;
  }

  return (lang === 'fa' ? fa : ps)[value] ?? value;
}

export interface MatchResult {
  id: string;
  slug: string;
  title: string;
  type: string;
  intent: MatcherProfile['intent'];
  organization: string | null;
  location: string;
  deadline: string | null;
  daysRemaining: number | null;
  strength: MatchStrength;
  eligibilityStatus: EligibilityStatus;
  dataConfidence: DataConfidence;
  reasons: string[];
  verified: string[];
  check: string[];
  rationale: string;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req) ?? 'unknown';
    if (!rateLimit(`opportunity-matcher:${ip}`, 12)) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many matcher requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Please review your matcher preferences.' },
        { status: 400 }
      );
    }

    const profile = parsed.data;
    const cfg = intentConfig(profile.intent);
    const today = startOfTodayUtc();

    const rows = await db.opportunity.findMany({
      where: {
        status: 'published',
        AND: [
          { OR: [{ deadline: null }, { deadline: { gte: today } }] },
          {
            OR: [
              { category: { slug: { in: cfg.slugs } } },
              ...cfg.tokens.map((token) => ({ jobType: { contains: token, mode: 'insensitive' as const } })),
              ...cfg.tokens.slice(0, 2).map((token) => ({ title: { contains: token, mode: 'insensitive' as const } })),
            ],
          },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        titleI18n: true,
        organization: true,
        country: true,
        deadline: true,
        jobType: true,
        jobTypeI18n: true,
        educationReq: true,
        experience: true,
        eligibility: true,
        requirements: true,
        sourceName: true,
        lastChecked: true,
        extractedData: true,
        category: { select: { slug: true, name: true, nameI18n: true } },
      },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
      take: 750,
    });

    if (rows.length === 0) {
      return NextResponse.json({
        status: 'no_strong_match',
        results: [],
        nearMatches: [],
        ai: false,
        disclosure: null,
      });
    }

    const ranked = rankOpportunities(
      rows.map((row) => ({
        ...row,
        category: row.category ? { slug: row.category.slug, name: row.category.name } : null,
      })),
      profile,
      today
    );

    const recommended = ranked.filter(isRecommendation).slice(0, MAX_RESULTS);
    const recommendedIds = new Set(recommended.map((candidate) => candidate.row.id));
    const near = ranked
      .filter((candidate) => !recommendedIds.has(candidate.row.id) && isNearMatch(candidate))
      .slice(0, 3);

    const toResult = (candidate: (typeof ranked)[number]): MatchResult => {
      const source = rows.find((row) => row.id === candidate.row.id);
      const deadline = candidate.row.deadline;
      const fallbackType = source?.jobType || source?.category?.name || 'Opportunity';

      return {
        id: candidate.row.id,
        slug: candidate.row.slug,
        title: getLocalizedContent(
          candidate.row.title,
          (source?.titleI18n ?? null) as Record<string, string> | null,
          profile.lang
        ),
        type: getLocalizedContent(
          fallbackType,
          (source?.jobTypeI18n ?? source?.category?.nameI18n ?? null) as Record<string, string> | null,
          profile.lang
        ),
        intent: profile.intent,
        organization: candidate.row.organization,
        location: candidate.row.country || 'Global',
        deadline: deadline ? deadline.toISOString() : null,
        daysRemaining: deadline ? daysUntilDeadline(deadline) : null,
        strength: candidate.strength,
        eligibilityStatus: candidate.eligibilityStatus,
        dataConfidence: candidate.dataConfidence,
        reasons: candidate.reasons.map((v) => localizeEvidence(v, profile.lang)),
        verified: candidate.verified.map((v) => localizeEvidence(v, profile.lang)),
        check: candidate.check.map((v) => localizeEvidence(v, profile.lang)),
        rationale: COPY[profile.lang].deterministic,
      };
    };

    let results = recommended.map(toResult);
    const nearMatches = near.map(toResult);
    let aiUsed = false;

    if (results.length > 0) {
      try {
        const provider = await getAIProvider();
        if (provider) {
          const evidence = results.map((result) => ({
            id: result.id,
            title: result.title,
            reasons: result.reasons,
            verified: result.verified,
            stillToCheck: result.check,
          }));

          const prompt =
            `Write one concise explanation per opportunity in ${LANG_NAME[profile.lang]}.\n` +
            'Use ONLY the evidence below. Do not add facts. Do not mention acceptance probability. ' +
            'If verified facts are sparse, explicitly say the user must verify the remaining requirements.\n' +
            `Evidence JSON:\n${JSON.stringify(evidence)}\n` +
            'Return: [{"id":"...","rationale":"..."}]';

          const raw = await withTimeout(
            (provider as unknown as ChatProvider).chat(MATCHER_SYSTEM, prompt),
            AI_TIMEOUT_MS
          );

          const parsedAI = ExplanationSchema.safeParse(parseJSON(raw));
          if (parsedAI.success) {
            const deduped = new Map(parsedAI.data.map((item) => [item.id, item.rationale]));
            results = results.map((result) => ({
              ...result,
              rationale: deduped.get(result.id) ?? result.rationale,
            }));
            aiUsed = deduped.size > 0;
          }
        }
      } catch (error) {
        console.warn('[matcher] optional explanation skipped:', (error as Error).message);
      }
    }

    return NextResponse.json({
      status: results.length > 0 ? 'ok' : 'no_strong_match',
      results,
      nearMatches,
      ai: aiUsed,
      disclosure: aiUsed ? COPY[profile.lang].aiDisclosure : null,
    });
  } catch (error) {
    console.error('[matcher] error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Something went wrong while matching. Please try again.' },
      { status: 500 }
    );
  }
}
