import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';

/**
 * Public success-story submission. Rows land as status='pending' — an admin
 * reviews, translates (admin → ✨ AI translate) and publishes from /admin.
 * contactEmail is stored for verification only and is never rendered publicly.
 */

const ALLOWED_TYPES = new Set(['scholarship', 'job', 'visa', 'exchange', 'training', 'other']);
const ALLOWED_LANGS = new Set(['en', 'fa', 'ps']);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strip control chars, collapse whitespace and cap length. */
function clean(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`story-submit:${ip}`, 3)) {
    return NextResponse.json(
      { error: 'too_many_attempts' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot — real users never fill this hidden field; bots do.
    if (clean(body.website, 200)) {
      return NextResponse.json({ success: true });
    }

    const storyType = clean(body.storyType, 20) || 'other';
    const country = clean(body.country, 60);
    const program = clean(body.program, 120);
    const visaType = clean(body.visaType, 60);
    const year = parseInt(clean(body.year, 6), 10);
    const title = clean(body.title, 160);
    const content = clean(body.content, 6000);
    const authorAlias = clean(body.authorAlias, 60);
    const contactEmail = clean(body.contactEmail, 200).toLowerCase();
    const lang = clean(body.lang, 8);

    if (!ALLOWED_TYPES.has(storyType)) {
      return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
    }
    if (!country) return NextResponse.json({ error: 'missing_country' }, { status: 400 });
    if (!title || title.length < 8) {
      return NextResponse.json({ error: 'title_too_short' }, { status: 400 });
    }
    if (!content || content.length < 120) {
      return NextResponse.json({ error: 'content_too_short' }, { status: 400 });
    }
    if (!year || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'invalid_year' }, { status: 400 });
    }
    if (contactEmail && !EMAIL_RE.test(contactEmail)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (lang && !ALLOWED_LANGS.has(lang)) {
      return NextResponse.json({ error: 'invalid_lang' }, { status: 400 });
    }

    const story = await db.successStory.create({
      data: {
        title,
        storyType,
        country,
        program: program || null,
        visaType: visaType || null,
        year,
        content,
        authorAlias: authorAlias || null,
        contactEmail: contactEmail || null,
        status: 'pending',
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: story.id });
  } catch (e) {
    console.error('[success-stories] submit failed:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
