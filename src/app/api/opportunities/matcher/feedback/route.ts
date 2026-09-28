import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/admin-auth';
import { MATCHER_INTENTS } from '@/lib/opportunity-matcher';

const BodySchema = z.object({
  opportunityId: z.string().min(1).max(80),
  signal: z.enum(['helpful', 'not_relevant']),
  intent: z.enum(MATCHER_INTENTS).optional(),
  lang: z.enum(['en', 'fa', 'ps']).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`matcher-feedback:${ip}`, 30)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const exists = await db.opportunity.findUnique({
      where: { id: parsed.data.opportunityId },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await db.matcherFeedback.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[matcher-feedback] failed:', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
