import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';

/** Like a published success story — anonymous, IP-rate-limited increment. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`story-like:${ip}`, 10)) {
    return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
  }

  const { id } = await params;
  try {
    // Only published stories can collect likes; atomic increment.
    const updated = await db.successStory.updateMany({
      where: { id, status: 'published' },
      data: { likes: { increment: 1 } },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const row = await db.successStory.findUnique({
      where: { id },
      select: { likes: true },
    });
    return NextResponse.json({ success: true, likes: row?.likes ?? 0 });
  } catch (e) {
    console.error('[success-stories] like failed:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
