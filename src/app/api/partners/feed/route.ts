import { NextRequest, NextResponse } from 'next/server';
import { listOpportunities } from '@/lib/opportunity-queries';
import { isLang } from '@/lib/lang-route';

export const revalidate = 1800; // aggressive shared caching; partners get fresh data every 30 min

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com';

/**
 * Partner opportunity feed (JSON).
 *
 * Public, keyless, rate-limited by Vercel edge caching. Every item URL carries
 * the partner's UTM attribution so partner impact is measurable:
 *   utm_source=<partner|partner_feed>&utm_medium=partner_feed&utm_campaign=aria_hub_partner_feed
 *
 * Query params:
 *   limit        1–50, default 10
 *   category     category slug filter (optional)
 *   country      canonical country filter (optional)
 *   province     canonical province filter, e.g. Kabul (optional)
 *   deadlineDays 7 | 30 | 90 — only opportunities closing within N days (optional)
 *   partner      partner identifier used as utm_source (optional, [a-zA-Z0-9_-])
 *   lang         en | fa | ps (default en)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const limitRaw = parseInt(sp.get('limit') || '10', 10);
  const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 10));

  const deadlineRaw = parseInt(sp.get('deadlineDays') || '', 10);
  const deadlineDays = [7, 30, 90].includes(deadlineRaw) ? deadlineRaw : undefined;

  const langParam = sp.get('lang');
  const lang = langParam && isLang(langParam) ? langParam : 'en';

  const partnerRaw = sp.get('partner') || '';
  const partner = partnerRaw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'partner_feed';

  const category = (sp.get('category') || '').slice(0, 80) || undefined;
  const country = (sp.get('country') || '').slice(0, 80) || undefined;
  const province = (sp.get('province') || '').slice(0, 80) || undefined;

  let items: any[] = [];
  try {
    const res = await listOpportunities({
      lang,
      sort: 'newest',
      page: 1,
      perPage: limit,
      category: category || 'all',
      country: country || 'all',
      province: province || '',
      deadlineDays,
    });
    items = res?.items || [];
  } catch {
    items = [];
  }

  const utm = `utm_source=${encodeURIComponent(partner)}&utm_medium=partner_feed&utm_campaign=aria_hub_partner_feed`;

  const payload = {
    feed: 'aria-hub-opportunities',
    generatedAt: new Date().toISOString(),
    attribution: {
      text: 'Powered by ARIA HUB',
      url: `${SITE_URL}/${lang}/opportunities?${utm}`,
    },
    items: items.map((item) => {
      const dl = item.deadline instanceof Date ? item.deadline : item.deadline ? new Date(item.deadline) : null;
      const deadline = dl && !isNaN(dl.getTime()) ? dl.toISOString().slice(0, 10) : null;
      return {
        title: item.title,
        url: `${SITE_URL}/${lang}/opportunities/${item.slug}?${utm}`,
        organization: item.organization || null,
        category: item.categoryLabel || null,
        location: item.country || null,
        deadline,
        summary: item.summary || null,
      };
    }),
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
