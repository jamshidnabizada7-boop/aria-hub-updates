import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { getAIProvider } from '@/lib/ai/provider';
import { parseJSON } from '@/lib/ai/providers/helpers';

/**
 * POST /api/opportunities/matcher
 *
 * Replaces the old Server Action (`opportunity-matcher/actions.ts`) which
 * failed with "Invalid Server Actions request" when the site is accessed
 * through a proxy/gateway whose forwarded host differs from the origin.
 *
 * Body: { age, targetCountry, education, goal, lang }
 * Returns { results: MatchResult[], ai: boolean }
 */

const BodySchema = z.object({
  age: z.string().trim().min(1).max(3),
  targetCountry: z.string().trim().min(1).max(80),
  education: z.string().trim().min(1).max(120),
  goal: z.enum(['Scholarship', 'Internship', 'Work Visa']),
  lang: z.enum(['fa', 'ps', 'en']).default('en'),
});

export interface MatchResult {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  match: number;
  chanceOfAcceptance: 'High' | 'Medium' | 'Low';
  rationale: string;
}

interface ChatProvider {
  chat(system: string, user: string): Promise<string>;
}

const LANG_NAME: Record<string, string> = {
  fa: 'Persian (Dari, Arabic script)',
  ps: 'Pashto (Arabic script)',
  en: 'English',
};

const MATCHER_SYSTEM =
  'You are an expert career and education counselor for ARIA HUB, an opportunities portal for Afghanistan. ' +
  'You receive a user profile and 5 candidate opportunities. Select the top 3 best matches and score them. ' +
  'Respond ONLY with a valid JSON array — no markdown, no commentary.';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Please fill in every step of the form.' },
        { status: 400 }
      );
    }
    const { age, targetCountry, education, goal, lang } = parsed.data;

    // ── 1. Pull a healthy sample of live, published, unexpired listings ──
    const now = new Date();
    const rows = await db.opportunity.findMany({
      where: {
        status: 'published',
        OR: [{ deadline: null }, { deadline: { gt: now } }],
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    if (rows.length === 0) {
      return NextResponse.json({ results: [], ai: false });
    }

    // ── 2. Deterministic scoring to pick the top candidates ──
    const goalLower = goal.toLowerCase();
    const countryLower = targetCountry.toLowerCase();
    const eduLower = education.toLowerCase();

    const scored = rows.map((opp) => {
      let score = 20;
      if (opp.country && countryLower && opp.country.toLowerCase().includes(countryLower)) score += 45;
      const typeStr = `${opp.jobType || ''} ${opp.category?.name || ''} ${opp.title || ''}`.toLowerCase();
      if (goalLower && typeStr.includes(goalLower === 'work visa' ? 'job' : goalLower)) score += 25;
      if (goalLower === 'scholarship' && typeStr.includes('scholar')) score += 25;
      if (goalLower === 'internship' && typeStr.includes('intern')) score += 25;
      if (goalLower === 'work visa' && (typeStr.includes('job') || typeStr.includes('work'))) score += 25;
      if (eduLower.includes('master') && typeStr.includes('master')) score += 10;
      if (eduLower.includes('bachelor') && typeStr.includes('bachelor')) score += 10;
      return { row: opp, baseScore: Math.min(99, score) };
    });

    scored.sort((a, b) => b.baseScore - a.baseScore);
    const topCandidates = scored.slice(0, 5);

    const toResult = (c: { row: (typeof rows)[number]; baseScore: number }): MatchResult => ({
      id: c.row.id,
      slug: c.row.slug,
      title: getLocalizedContent(c.row.title, c.row.titleI18n as Record<string, string> | null, lang),
      type: getLocalizedContent(
        c.row.jobType || c.row.category?.name || 'Opportunity',
        (c.row.jobTypeI18n ?? null) as Record<string, string> | null,
        lang
      ),
      location: getLocalizedContent(c.row.country || 'Global', null, lang),
      match: c.baseScore,
      chanceOfAcceptance: c.baseScore > 50 ? 'High' : 'Medium',
      rationale: '', // filled by LLM below, or localized client-side fallback
    });

    // ── 3. Optional LLM re-ranking with personalized rationale ──
    let aiUsed = false;
    let results: MatchResult[] = topCandidates.slice(0, 3).map(toResult);

    try {
      const provider = await getAIProvider();
      if (provider) {
        const chat = (provider as unknown as ChatProvider).chat.bind(provider);
        const user = `User profile:
- Age: ${age}
- Education: ${education}
- Target country: ${targetCountry}
- Goal: ${goal}

Candidate opportunities:
${topCandidates
  .map(
    (c) =>
      `ID: ${c.row.id} | Title: ${c.row.title} | Type: ${c.row.jobType || c.row.category?.name} | Location: ${c.row.country || 'Global'} | Organization: ${c.row.organization || 'N/A'}`
  )
  .join('\n')}

Pick the top 3 best matches for this user. Write every "rationale" value in ${LANG_NAME[lang]} (1-2 sentences, explain exactly why it fits THIS profile). Keys stay in English.
Output ONLY a JSON array:
[{"id":"<opp id>","match":95,"chanceOfAcceptance":"High|Medium|Low","rationale":"..."}]`;

        const raw = await chat(MATCHER_SYSTEM, user);
        const arr = parseJSON(raw);
        const aiResults = Array.isArray(arr) ? arr : Array.isArray((arr as Record<string, unknown>)?.results) ? (arr as Record<string, unknown>).results : null;

        if (aiResults && Array.isArray(aiResults) && aiResults.length > 0) {
          const mapped = (aiResults as Record<string, unknown>[])
            .map((aiObj) => {
              const cand = topCandidates.find((c) => c.row.id === aiObj.id);
              if (!cand) return null;
              const base = toResult(cand);
              const chanceRaw = String(aiObj.chanceOfAcceptance ?? '');
              const chance = (['High', 'Medium', 'Low'] as const).includes(chanceRaw as 'High')
                ? (chanceRaw as MatchResult['chanceOfAcceptance'])
                : base.chanceOfAcceptance;
              const out: MatchResult = {
                ...base,
                match: Math.max(1, Math.min(99, Number(aiObj.match) || base.match)),
                chanceOfAcceptance: chance,
                rationale: String(aiObj.rationale || '').slice(0, 400),
              };
              return out;
            })
            .filter((r): r is MatchResult => r !== null);
          if (mapped.length > 0) {
            results = mapped;
            aiUsed = true;
          }
        }
      }
    } catch (aiErr) {
      // AI is optional — deterministic results are already prepared.
      console.warn('[matcher] AI re-ranking skipped:', (aiErr as Error).message);
      results = topCandidates.slice(0, 3).map(toResult);
    }

    results.sort((a, b) => b.match - a.match);
    return NextResponse.json({ results, ai: aiUsed });
  } catch (error) {
    console.error('[matcher] error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Something went wrong while matching. Please try again.' },
      { status: 500 }
    );
  }
}
