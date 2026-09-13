import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';

/**
 * GET /api/search?q=...&lang=fa|ps|en
 *
 * Trilingual search across opportunities, services and visas.
 *
 * - Matches the base English fields AND the localized JSON fields
 *   (titleI18n[fa|ps|en], aiSummaryI18n[fa|ps|en], …) in EVERY language at
 *   once — so a Persian query like «پرستار» finds records regardless of the
 *   UI language the user currently has active (lang only drives display).
 * - Returns lang-relative URLs (client prefixes the language) that point to
 *   REAL pages: /opportunities/{slug}, /services#{slug}, /visas.
 * - Titles are resolved in the requested language with English fallback.
 * - Expired opportunities are excluded.
 */

const VALID_LANGS = new Set(['fa', 'ps', 'en']);

interface SearchHit {
  type: 'Opportunity' | 'Service' | 'Visa';
  title: string;
  subtitle: string;
  url: string;
  image: string | null;
  badge?: string; // e.g. deadline chip / category
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const langParam = req.nextUrl.searchParams.get('lang') || 'en';
  const lang = VALID_LANGS.has(langParam) ? langParam : 'en';

  if (q.length < 2) return NextResponse.json({ results: [] });

  const now = new Date();
  const loc = (base: string | null, i18n: unknown) =>
    getLocalizedContent(base, (i18n as Record<string, string> | null) ?? null, lang);

  const like = (s: string) => ({ contains: q, mode: 'insensitive' as const });

  // Localized JSON path filters — Postgres string_contains on titleI18n[lang].
  // We match the query against EVERY language's translation so typing Persian
  // on the English UI (or vice versa) still finds the record.
  const ALL_LANGS = ['fa', 'ps', 'en'] as const;
  const i18nAnyLang = (field: 'titleI18n' | 'aiSummaryI18n' | 'excerptI18n' | 'countryI18n' | 'visaTypeI18n') =>
    ALL_LANGS.map((l) => ({ [field]: { path: [l], string_contains: q } } as Record<string, unknown>));

  try {
    const [opportunities, services, visas] = await Promise.all([
      db.opportunity.findMany({
        where: {
          status: 'published',
          OR: [{ deadline: null }, { deadline: { gt: now } }],
          AND: [
            {
              OR: [
                { title: like(q) },
                { organization: like(q) },
                { aiSummary: like(q) },
                ...i18nAnyLang('titleI18n'),
                ...i18nAnyLang('aiSummaryI18n'),
              ],
            },
          ],
        },
        select: {
          id: true, slug: true, title: true, titleI18n: true,
          organization: true, country: true, deadline: true,
          image: true, logoUrl: true, categoryId: true,
          category: { select: { slug: true, name: true, nameI18n: true } },
        },
        orderBy: [{ featured: 'desc' }, { deadline: 'asc' }],
        take: 8,
      }),
      db.service.findMany({
        where: {
          status: 'published',
          OR: [
            { title: like(q) },
            { excerpt: like(q) },
            ...i18nAnyLang('titleI18n'),
            ...i18nAnyLang('excerptI18n'),
          ],
        },
        select: { slug: true, title: true, titleI18n: true, excerpt: true, excerptI18n: true, image: true },
        take: 4,
      }),
      db.visa.findMany({
        where: {
          status: 'published',
          OR: [
            { country: like(q) },
            { visaType: like(q) },
            ...i18nAnyLang('countryI18n'),
            ...i18nAnyLang('visaTypeI18n'),
          ],
        },
        select: { slug: true, country: true, countryI18n: true, visaType: true, visaTypeI18n: true, duration: true, image: true },
        take: 4,
      }),
    ]);

    const results: SearchHit[] = [
      ...opportunities.map((o) => ({
        type: 'Opportunity' as const,
        title: loc(o.title, o.titleI18n),
        subtitle: [o.organization, o.country].filter(Boolean).join(' · '),
        url: `/opportunities/${o.slug}`,
        image: o.logoUrl || o.image,
        badge: o.deadline
          ? new Date(o.deadline).toISOString().slice(0, 10)
          : o.category
            ? loc(o.category.name, o.category.nameI18n)
            : undefined,
      })),
      ...services.map((s) => ({
        type: 'Service' as const,
        title: loc(s.title, s.titleI18n),
        subtitle: loc(s.excerpt, s.excerptI18n).replace(/<[^>]*>/g, '').slice(0, 90),
        url: `/services#${s.slug}`,
        image: s.image,
      })),
      ...visas.map((v) => ({
        type: 'Visa' as const,
        title: `${loc(v.country, v.countryI18n)} — ${loc(v.visaType, v.visaTypeI18n)}`,
        subtitle: v.duration || '',
        url: `/visas`,
        image: v.image,
      })),
    ];

    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    );
  } catch (error) {
    console.error('[search] error:', error);
    return NextResponse.json({ results: [], error: 'search_failed' }, { status: 500 });
  }
}
