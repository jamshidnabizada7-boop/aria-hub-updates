import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';

/**
 * GET /api/social/poster?slug=… — public data projection used by the poster
 * renderer and the admin Social Kit. Contains ONLY what the detail page
 * already makes public (no contact info, no source URLs).
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`poster-data:${ip}`, 60)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const slug = (req.nextUrl.searchParams.get('slug') || '').trim().slice(0, 200);
  if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 });

  const opp = await db.opportunity.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      titleI18n: true,
      organization: true,
      country: true,
      deadline: true,
      featured: true,
      status: true,
      jobType: true,
      salary: true,
      salaryI18n: true,
      category: { select: { name: true, nameI18n: true, slug: true } },
    },
  });

  if (!opp || opp.status !== 'published') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, opportunity: opp });
}
