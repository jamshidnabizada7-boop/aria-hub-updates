import { NextRequest, NextResponse } from 'next/server';
import {
  getDailySpotlightId,
  listOpportunities,
  type OpportunitySort,
} from '@/lib/opportunity-queries';
import { isLang, type Lang } from '@/lib/lang-route';
import { toSafeIsoString } from '@/lib/date-format';

export const dynamic = 'force-dynamic';

function firstParam(value: string | null): string {
  return value ?? '';
}

/**
 * GET /api/opportunities/list?lang=en&category=jobs&q=&location=&deadline=&sort=&show=&page=2
 *
 * Paginated feed endpoint backing the listing page's infinite scroll.
 * Same query contract (and same DB access layer) as the server-rendered
 * listing page, so client-fetched pages 2+ are identical to SSR page 1.
 * Returns only the public card projection — never drafts or full rows.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const langParam = firstParam(sp.get('lang'));
    const lang: Lang = isLang(langParam) ? langParam : 'fa';

    const category = firstParam(sp.get('category')) || 'all';
    const q = firstParam(sp.get('q')).trim().slice(0, 200);
    // `country`/`province` are the canonical filters; legacy `location`
    // (which was always a country filter) still works.
    const country = firstParam(sp.get('country')) || firstParam(sp.get('location')) || 'all';
    const province = firstParam(sp.get('province'));
    const deadlineParam = firstParam(sp.get('deadline'));
    const deadlineDays = ['7', '30', '90'].includes(deadlineParam) ? Number(deadlineParam) : undefined;
    const sortParam = firstParam(sp.get('sort'));
    const sort: OpportunitySort = ['newest', 'deadline', 'title'].includes(sortParam)
      ? (sortParam as OpportunitySort)
      : 'newest';
    const showParam = firstParam(sp.get('show'));
    const includeExpired = showParam === 'expired' || showParam === 'all';
    const page = Math.max(1, parseInt(firstParam(sp.get('page')) || '1', 10) || 1);

    const [list, spotlightId] = await Promise.all([
      listOpportunities({
        lang,
        category,
        q,
        country,
        province,
        deadlineDays,
        sort,
        page,
        perPage: 12,
        includeExpired,
      }),
      getDailySpotlightId(),
    ]);

    return NextResponse.json({
      items: list.items.map((item) => ({
        ...item,
        deadline: item.deadline ? toSafeIsoString(item.deadline) : null,
        createdAt: toSafeIsoString(item.createdAt),
      })),
      total: list.total,
      page: list.page,
      perPage: list.perPage,
      totalPages: list.totalPages,
      spotlightId,
    }, {
      headers: { 'Vercel-CDN-Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
    });
  } catch (e) {
    console.error('[api/opportunities/list]', (e as Error).message);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}
