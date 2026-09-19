import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { isLang } from '@/lib/lang-route';
import { ZAIProvider, BREAKER_MSG } from '@/lib/ai/providers/zai';
import { buildCaption, type CaptionInput } from '@/lib/social/captions';
import type { PostTemplate } from '@/lib/social/brand';

/**
 * POST /api/social/caption — Brand Studio caption endpoint.
 *
 * mode "template": deterministic brand-voice caption (always works, no AI).
 * mode "ai": LLM rewrite in the same brand voice, constrained to the facts in
 * the brief; ANY failure (429 / breaker / timeout / empty output) falls back
 * to the deterministic caption so the studio never blocks the owner.
 *
 * The LLM never generates images — visuals are always code templates.
 */
export const dynamic = 'force-dynamic';

const LANG_NAME: Record<string, string> = { en: 'English', fa: 'Farsi (Persian, Afghan style)', ps: 'Pashto' };

function systemPrompt(lang: string): string {
  return [
    `You write Facebook / Instagram captions for "ARIA HUB" (myariahub.com), an Afghan platform for jobs, scholarships and visa opportunities.`,
    `Brand voice: warm, encouraging, confident, practical. Short lines. No hype-spam, no clickbait, no disclaimers, no em-dash poetry.`,
    `Write ONE ready-to-post caption in ${LANG_NAME[lang] ?? 'English'}.`,
    `Rules: use ONLY the facts in the provided JSON (never invent deadlines, numbers, names or links); keep the exact link on its own line at the end; finish with 4-6 relevant hashtags mixing platform tags and topic tags in the caption language; output ONLY the caption text — no explanations, no quotes around it.`,
  ].join('\n');
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { template?: string; lang?: string; input?: CaptionInput; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const lang = isLang(body.lang) ? body.lang : 'en';
  const template = body.template as PostTemplate | undefined;
  const input = body.input;
  if (!template || !input) return NextResponse.json({ error: 'missing_input' }, { status: 400 });

  // Guaranteed deterministic caption first.
  const fallback = buildCaption({ ...input, template, lang });

  if (body.mode !== 'ai') {
    return NextResponse.json({ ok: true, source: 'template', caption: fallback });
  }

  // AI polish with hard timeout + graceful fallback.
  try {
    const provider = new ZAIProvider();
    const brief = [
      typeof input === 'object' ? JSON.stringify(input) : '',
      `\nDeterministic baseline caption for tone reference:\n${fallback}`,
    ].join('\n');
    const raw = await Promise.race([
      provider.chat(systemPrompt(lang), brief),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('ai_timeout')), 25_000)),
    ]);
    let caption = String(raw || '').trim();
    caption = caption.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/, '').trim();
    // sanity: must contain the link and stay in a sane length
    if (!caption || caption.length < 30 || caption.length > 1500 || !caption.includes('myariahub.com')) {
      throw new Error('ai_output_invalid');
    }
    return NextResponse.json({ ok: true, source: 'ai', caption });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      ok: true,
      source: 'template',
      caption: fallback,
      note: msg === BREAKER_MSG || /429/.test(msg) ? 'ai_rate_limited' : 'ai_unavailable',
    });
  }
}
