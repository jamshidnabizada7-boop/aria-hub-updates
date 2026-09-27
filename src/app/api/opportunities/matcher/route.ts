import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { getAIProvider } from '@/lib/ai/provider';
import { parseJSON } from '@/lib/ai/providers/helpers';
import { getClientIp, rateLimit } from '@/lib/admin-auth';
import { startOfTodayUtc } from '@/lib/opportunity-shared';
import {
  MatcherProfileSchema,
  rankOpportunities,
  type MatcherProfile,
  type RankedOpportunity,
} from '@/lib/opportunity-matcher';

const AiExplanationSchema = z.array(
  z.object({
    id: z.string().min(1),
    explanation: z.string().trim().min(1).max(320),
  })
).max(6);

interface ChatProvider {
  chat(system: string, user: string): Promise<string>;
}

const LANG_NAME: Record<MatcherProfile['lang'], string> = {
  fa: 'Persian (Farsi, Arabic script)',
  ps: 'Pashto (Arabic script)',
  en: 'English',
};

const MATCHER_SYSTEM =
  'You explain ARIA HUB opportunity recommendations. You MUST use only the evidence supplied for each candidate. ' +
  'Never claim acceptance probability. Never claim eligibility that is not explicitly supported. ' +
  'If eligibility is unknown, say what still needs checking. Respond only with valid JSON.';

function localizedText(
  base: string | null | undefined,
  i18n: unknown,
  lang: MatcherProfile['lang']
): string {
  return getLocalizedContent(
    base ?? '',
    (i18n ?? null) as Record<string, string> | null,
    lang
  );
}

function deadlineIso(deadline: Date | null): string | null {
  return deadline ? deadline.toISOString() : null;
}

function publicResult(item: RankedOpportunity, lang: MatcherProfile['lang']) {
  const row = item.opportunity as unknown as MatcherDbRow;
  return {
    id: row.id,
    slug: row.slug,
    title: localizedText(row.title, row.titleI18n, lang),
    type: localizedText(
      row.jobType || row.category?.name || 'Opportunity',
      row.jobTypeI18n || row.category?.nameI18n,
      lang
    ),
    location: row.country || 'Global',
    organization: row.organization,
    deadline: deadlineIso(row.deadline),
    matchStrength: item.matchStrength,
    eligibilityStatus: item.eligibilityStatus,
    dataConfidence: item.dataConfidence,
    reasons: item.evidence.reasons,
    verified: item.evidence.verified,
    unknowns: item.evidence.unknowns,
    conflicts: item.evidence.conflicts,
    explanation: '',
  };
}

type MatcherDbRow = Awaited<ReturnType<typeof fetchCandidates>>[number];

async function fetchCandidates(profile: MatcherProfile) {
  const today = startOfTodayUtc();

  // Relevance is evaluated across the full active corpus instead of truncating
  // to the newest N rows before matching. At current ARIA HUB scale this is
  // small; fields selected here deliberately exclude large description blobs.
  return db.opportunity.findMany({
    where: {
      status: 'published',
      OR: [{ deadline: null }, { deadline: { gte: today } }],
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
      educationReqI18n: true,
      experience: true,
      experienceI18n: true,
      eligibility: true,
      eligibilityI18n: true,
      requirements: true,
      requirementsI18n: true,
      benefits: true,
      tags: true,
      extractedData: true,
      sourceName: true,
      lastChecked: true,
      updatedAt: true,
      category: { select: { slug: true, name: true, nameI18n: true } },
    },
    orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }],
  });
}

async function addGroundedAiExplanations(
  results: ReturnType<typeof publicResult>[],
  ranked: RankedOpportunity[],
  profile: MatcherProfile
): Promise<{ results: ReturnType<typeof publicResult>[]; ai: boolean }> {
  if (results.length === 0) return { results, ai: false };

  try {
    const provider = await getAIProvider();
    if (!provider) return { results, ai: false };

    const evidencePackage = ranked.slice(0, results.length).map((item) => {
      const row = item.opportunity as unknown as MatcherDbRow;
      return {
        id: row.id,
        title: row.title,
        category: row.category?.slug || row.jobType || null,
        country: row.country,
        organization: row.organization,
        matchStrength: item.matchStrength,
        eligibilityStatus: item.eligibilityStatus,
        dataConfidence: item.dataConfidence,
        reasons: item.evidence.reasons,
        verified: item.evidence.verified,
        unknowns: item.evidence.unknowns,
        conflicts: item.evidence.conflicts,
      };
    });

    const prompt = [
      `Write one concise explanation per candidate in ${LANG_NAME[profile.lang]}.`,
      'Use only the evidence package below. Do not add new eligibility facts.',
      'If unknowns exist, explicitly say they still need checking.',
      'Return: [{"id":"...","explanation":"..."}]',
      JSON.stringify({ profile: {
        intents: profile.intents,
        education: profile.education,
        nationality: profile.nationality,
        residence: profile.residence,
        destinations: profile.destinations,
        fieldArea: profile.fieldArea,
      }, candidates: evidencePackage }),
    ].join('\n');

    const chat = (provider as unknown as ChatProvider).chat.bind(provider);
    const raw = await Promise.race([
      chat(MATCHER_SYSTEM, prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('matcher_ai_timeout')), 4500)
      ),
    ]);

    const parsed = parseJSON(raw);
    const candidateArray = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { results?: unknown[] } | null)?.results)
        ? (parsed as { results: unknown[] }).results
        : parsed;

    const validated = AiExplanationSchema.safeParse(candidateArray);
    if (!validated.success) return { results, ai: false };

    const allowed = new Set(results.map((r) => r.id));
    const seen = new Set<string>();
    const byId = new Map<string, string>();
    for (const item of validated.data) {
      if (!allowed.has(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      byId.set(item.id, item.explanation);
    }

    if (byId.size === 0) return { results, ai: false };
    return {
      results: results.map((r) => ({ ...r, explanation: byId.get(r.id) || '' })),
      ai: true,
    };
  } catch (error) {
    console.warn('[matcher] grounded AI explanation skipped:', (error as Error).message);
    return { results, ai: false };
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`opportunity-matcher:${ip}`, 10)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many matcher requests. Please try again shortly.' },
      { status: 429 }
    );
  }

  try {
    const json = await req.json().catch(() => null);
    const parsed = MatcherProfileSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          message: 'Please review your matcher preferences.',
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), code: issue.code })),
        },
        { status: 400 }
      );
    }

    const profile = parsed.data;
    const rows = await fetchCandidates(profile);

    const matcherRows = rows.map((row) => ({
      ...row,
      categorySlug: row.category?.slug ?? null,
      categoryName: row.category?.name ?? null,
      educationReq: localizedText(row.educationReq, row.educationReqI18n, 'en'),
      experience: localizedText(row.experience, row.experienceI18n, 'en'),
      eligibility: localizedText(row.eligibility, row.eligibilityI18n, 'en'),
      requirements: localizedText(row.requirements, row.requirementsI18n, 'en'),
    }));

    const ranked = rankOpportunities(profile, matcherRows, 6);
    if (ranked.length === 0) {
      return NextResponse.json({
        status: 'no_strong_match',
        results: [],
        ai: false,
        meta: { candidatesEvaluated: rows.length },
      });
    }

    const baseResults = ranked.map((item) => publicResult(item, profile.lang));
    const withAi = await addGroundedAiExplanations(baseResults, ranked, profile);

    return NextResponse.json({
      status: 'ok',
      ...withAi,
      meta: {
        candidatesEvaluated: rows.length,
        returned: withAi.results.length,
      },
    });
  } catch (error) {
    console.error('[matcher] error:', error);
    return NextResponse.json(
      {
        error: 'server_error',
        message: 'Something went wrong while matching. Please try again.',
      },
      { status: 500 }
    );
  }
}
