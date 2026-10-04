import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/admin-auth';
import { PrismaClient } from '@prisma/client';

/**
 * Question generator for AI practice sessions.
 *
 * 1. DB-first: serve a published InterviewQuestion matching the requested
 *    language (localized via *I18n fields) — optionally filtered by the
 *    candidate profile. This makes seeded trilingual content the backbone of
 *    practice sessions and keeps sessions free of AI flakiness.
 * 2. AI fallback: if the DB pool is exhausted (all previousQuestions asked)
 *    or empty, generate one via Groq.
 */

// Security (Function Storage audit, PHASE 4): this route previously read the
// repo-root `.env` from disk as a DATABASE_URL fallback — that put the file
// (API keys included) into the deployed function trace. Runtime code must
// rely on process.env only; there is deliberately no file-based fallback.
function resolveDatabaseUrl(): string | null {
  const envUrl = process.env.DATABASE_URL || '';
  return envUrl.startsWith('postgres') ? envUrl : null;
}

const globalForDb = globalThis as unknown as { _interviewDb?: PrismaClient };
function getDb(): PrismaClient | null {
  const url = resolveDatabaseUrl();
  if (!url) return null;
  if (!globalForDb._interviewDb) {
    globalForDb._interviewDb = new PrismaClient({ datasources: { db: { url } } });
  }
  return globalForDb._interviewDb;
}

function localize(
  base: string | null | undefined,
  i18n: unknown,
  lang: string
): string | null {
  if (i18n && typeof i18n === 'object') {
    const val = (i18n as Record<string, unknown>)[lang];
    if (typeof val === 'string' && val.trim()) return val;
  }
  return base && base.trim() ? base : null;
}

export async function POST(request: Request) {

  // Abuse guard: AI calls cost real money and this endpoint is public.
  const __ip = getClientIp(request as unknown as Request) || 'unknown';
  if (!rateLimit(`ai:${__ip}`, 10)) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }
  try {
    const { lang = 'en', targetCountry, major, scholarshipType, currentIndex, previousQuestions } =
      await request.json();
    const asked: string[] = Array.isArray(previousQuestions) ? previousQuestions : [];

    // ── 1. DB-first ────────────────────────────────────────────────
    const db = getDb();
    if (db) {
      const pool = await db.interviewQuestion.findMany({
        where: { status: 'published' },
        orderBy: [{ featured: 'desc' }, { order: 'asc' }],
        select: {
          question: true,
          questionI18n: true,
          difficulty: true,
          filters: true,
          category: { select: { slug: true } },
        },
      });

      const localized = pool
        .map((q) => ({ ...q, text: localize(q.question, q.questionI18n, lang) }))
        .filter((q) => q.text && !asked.includes(q.text as string));

      if (localized.length > 0) {
        // Map the profile onto the seeded category families so a visa session
        // pulls visa questions, a job session pulls job questions, etc.
        const profileNeedle = `${major} ${targetCountry} ${scholarshipType}`.toLowerCase();
        const CAT_HINTS: [RegExp, string[]][] = [
          [/visa|consul|embassy|ویزا|مرکې د ویزې/i, ['visa-interviews']],
          [/job|work|employ|internship|ngo|کار|وګمار/i, ['job-interviews', 'ngo-humanitarian']],
          [/exchange|fellow|yesi| تبادل/i, ['exchange-fellowships']],
          [/graduate|master|admission|university|دانشگاه|پوهنتون/i, ['graduate-admissions']],
        ];
        const preferredCats =
          CAT_HINTS.find(([re]) => re.test(profileNeedle))?.[1] ??
          ['scholarship-interviews', 'exchange-fellowships', 'graduate-admissions'];
        const scored = localized
          .map((q) => {
            let score = 0;
            if (preferredCats && q.category?.slug && preferredCats.includes(q.category.slug)) {
              score += 25; // strongly prefer the matching family
            }
            if (q.filters && typeof q.filters === 'object') {
              const f = JSON.stringify(q.filters).toLowerCase();
              for (const word of profileNeedle.split(/\s+/).filter((w) => w.length > 2)) {
                if (f.includes(word)) score += 2;
              }
            }
            // Rotate through the pool using the index so sessions vary.
            score += ((currentIndex ?? 0) * 7 + Math.floor(Math.random() * 5)) % 10;
            return { ...q, score };
          })
          .sort((a, b) => b.score - a.score);

        return NextResponse.json({
          question: scored[0].text,
          source: 'db',
          difficulty: scored[0].difficulty,
        });
      }
    }

    // ── 2. AI fallback (Groq) ──────────────────────────────────────
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      // No DB content and no AI key — serve a graceful default.
      return NextResponse.json({
        question: 'Tell me about yourself and why you are applying for this scholarship.',
        source: 'default',
      });
    }

    const prompt = `
You are a strict but fair scholarship committee member for a ${scholarshipType} in ${targetCountry}. The candidate is majoring in ${major}.
You are currently on question ${currentIndex + 1} of the interview.
Previous questions asked: ${asked.length > 0 ? asked.join(" | ") : "None"}.

Generate exactly ONE challenging, realistic interview question that is tailored to their profile (${major} in ${targetCountry} for a ${scholarshipType}). 
Do not ask a question you have already asked.
Make it sound conversational but professional.

Return ONLY valid JSON without any markdown formatting.
Format:
{
  "question": "The generated question text here"
}
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API Error:', errorText);
      return NextResponse.json({ error: 'Failed to process AI evaluation' }, { status: 500 });
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({ ...result, source: 'ai' });
  } catch (error) {
    console.error('Generate Question API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
