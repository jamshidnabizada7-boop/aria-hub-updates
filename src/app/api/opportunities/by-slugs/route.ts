import { NextRequest, NextResponse } from 'next/server';
import { getOpportunitiesBySlugs } from '@/lib/opportunity-queries';
import type { Lang } from '@/lib/lang-route';

export const dynamic = 'force-dynamic';

/**
 * POST /api/opportunities/by-slugs
 * Body: { slugs: string[], lang?: 'en'|'fa'|'ps' }
 * Returns display-ready card data for the client-side saved-jobs page.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const slugs = Array.isArray(body?.slugs)
      ? body.slugs.filter((s: unknown) => typeof s === 'string' && s.length < 200).slice(0, 100)
      : [];
    const lang: Lang = ['en', 'fa', 'ps'].includes(body?.lang) ? body.lang : 'en';
    const items = await getOpportunitiesBySlugs(slugs, lang);
    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        deadline: item.deadline ? item.deadline.toISOString() : null,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      })),
    });
  } catch (e) {
    console.error('[api/opportunities/by-slugs]', (e as Error).message);
    return NextResponse.json({ items: [], error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}
