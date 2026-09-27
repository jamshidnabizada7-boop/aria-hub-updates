import { NextRequest, NextResponse } from 'next/server';
import {
  getDailySpotlightId,
  listOpportunities,
  type OpportunitySort,
} from '@/lib/opportunity-queries';
import { isLang, type Lang } from '@/lib/lang-route';

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
    const legacyLocation = firstParam(sp.get('location')) || 'all';
    const country = firstParam(sp.get('country')) || (legacyLocation !== 'all' ? legacyLocation : 'all');
    const province = firstParam(sp.get('province')) || 'all';
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
        deadline: item.deadline ? item.deadline.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
      })),
      total: list.total,
      page: list.page,
      perPage: list.perPage,
      totalPages: list.totalPages,
      spotlightId,
    });
  } catch (e) {
    console.error('[api/opportunities/list]', (e as Error).message);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}
