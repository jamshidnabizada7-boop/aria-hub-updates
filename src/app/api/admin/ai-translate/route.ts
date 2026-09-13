import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { translateSections, type SectionInput } from '@/lib/ai/pipeline';
import { getAIProvider } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/admin/ai-translate
 * Body: { title?, description?, eligibility?, benefits?, responsibilities?,
 *         requirements?, guidelines?, jobType?, salary?, educationReq?, experience?,
 *         excerpt?, content? }   ← excerpt/content power the News editor
 * Returns: { fa: {...}, ps: {...} } — translations for the provided fields.
 *
 * Powers the "Auto-translate" button in the admin opportunity form so a
 * manager can write the English version and get complete Dari + Pashto
 * drafts in one click (still fully editable before saving).
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const pick = (k: string): string | null => {
    const v = body[k];
    return typeof v === 'string' && v.trim() ? v : null;
  };

  const sections: SectionInput = {
    title: pick('title'),
    description: pick('description'),
    eligibility: pick('eligibility'),
    benefits: pick('benefits'),
    responsibilities: pick('responsibilities'),
    requirements: pick('requirements'),
    guidelines: pick('guidelines'),
    jobType: pick('jobType'),
    salary: pick('salary'),
    educationReq: pick('educationReq'),
    experience: pick('experience'),
    excerpt: pick('excerpt'),
    content: pick('content'),
  };

  const hasAny = Object.values(sections).some((v) => v && v.trim());
  if (!hasAny) {
    return NextResponse.json({ error: 'Nothing to translate — fill at least one field.' }, { status: 400 });
  }

  const provider = await getAIProvider();
  if (!provider) {
    return NextResponse.json({ error: 'AI provider is not configured.' }, { status: 503 });
  }

  const chat = (system: string, user: string): Promise<string> => {
    const p = provider as Record<string, unknown>;
    if (typeof p.chat === 'function') {
      return (p as unknown as { chat(s: string, u: string): Promise<string> }).chat(system, user);
    }
    return Promise.reject(new Error('Provider does not support chat'));
  };

  try {
    const t = await translateSections(sections, chat);
    if (!t) {
      return NextResponse.json({ error: 'Translation failed — try again in a minute.' }, { status: 502 });
    }

    // Split the flat { field_fa, field_ps } result into per-language objects
    const fa: Record<string, string> = {};
    const ps: Record<string, string> = {};
    for (const [key, value] of Object.entries(t)) {
      if (typeof value !== 'string' || !value.trim()) continue;
      const base = key.replace(/_(fa|ps)$/, '');
      const lang = key.slice(-2);
      if (!base || (lang !== 'fa' && lang !== 'ps')) continue;
      if (lang === 'fa') fa[base] = value;
      else ps[base] = value;
    }

    return NextResponse.json({ fa, ps });
  } catch (e) {
    return NextResponse.json(
      { error: `Translation error: ${(e as Error).message.slice(0, 150)}` },
      { status: 502 },
    );
  }
}
