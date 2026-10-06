import type { Metadata } from 'next';
import Link from 'next/link';
import { Bookmark, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Rss, Search, X } from 'lucide-react';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { OpportunityFeed, AutoSubmitSelect } from '@/components/site/opportunity-feed';
import { AlertSignupCard } from '@/components/site/alert-signup-card';
import { AdSlot } from '@/components/site/ad-slot';
import { FollowChannelsBand } from '@/components/site/follow-channels-band';
import { ReadingProgress } from '@/components/site/reading-progress';
import { CountUp } from '@/components/site/count-up';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';
import {
  getDailySpotlightId,
  getFacets,
  listOpportunities,
  type OpportunitySort,
} from '@/lib/opportunity-queries';
import { cn } from '@/lib/utils';

const SORTS: OpportunitySort[] = ['newest', 'deadline', 'title'];
const PER_PAGE = 12;

// New records land via periodic imports — keep the listing at most 300s stale.
export const revalidate = 300;

const OPPORTUNITIES_TITLES: Record<Lang, string> = {
  en: 'Latest Scholarships, Jobs & Opportunities | ARIA HUB',
  fa: 'جدیدترین بورسیه‌های تحصیلی، وظایف و فرصت‌ها | ARIA HUB',
  ps: 'وروستي تحصیلي بورسونه، کاري فرصتونه او دندې | ARIA HUB',
};

const OPPORTUNITIES_DESCRIPTIONS: Record<Lang, string> = {
  en: 'Browse verified scholarships, fellowships, jobs, and career development programs with application deadlines and eligibility requirements on ARIA HUB.',
  fa: 'مشاهده و دریافت معتبرترین بورسیه‌های تحصیلی، فرصت‌های شغلی بین‌المللی، فلوشیپ‌ها و کارآموزی به همراه ددلاین و شرایط پذیرش در آریا هاب.',
  ps: 'د باوري تحصیلي بورسونو، نړیوالو دندو، فیلوشیپونو او کاري فرصتونو کتنه د غوښتنلیک د وروستۍ نېټې او لارښود سره په آریا هاب کې.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const title = OPPORTUNITIES_TITLES[lang] || OPPORTUNITIES_TITLES.en;
  const description = OPPORTUNITIES_DESCRIPTIONS[lang] || OPPORTUNITIES_DESCRIPTIONS.en;

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title,
    description,
    alternates: {
      canonical: `/${lang}/opportunities`,
      languages: {
        en: '/en/opportunities',
        fa: '/fa/opportunities',
        ps: '/ps/opportunities',
      },
    },
    openGraph: {
      title,
      description,
      locale: lang,
      type: 'website',
    },
  };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OpportunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const sp = await searchParams;

  const t = (key: string, p?: Record<string, string | number>) => translate(lang, key, p);

  const data = await getSiteData();

  // ---- filters from the URL -------------------------------------------------
  const category = firstParam(sp.category) || 'all';
  const q = (firstParam(sp.q) || '').trim();
  // `country` + `province` are the canonical filters. Legacy `location` URLs
  // (which were always country filters) keep working.
  const country = firstParam(sp.country) || firstParam(sp.location) || 'all';
  const province = (firstParam(sp.province) || '').trim();
  const deadlineParam = firstParam(sp.deadline);
  const deadlineDays = ['7', '30', '90'].includes(deadlineParam || '')
    ? Number(deadlineParam)
    : undefined;
  const sortParam = firstParam(sp.sort);
  const sort: OpportunitySort = SORTS.includes(sortParam as OpportunitySort)
    ? (sortParam as OpportunitySort)
    : 'newest';
  const showParam = firstParam(sp.show);
  const includeExpired = showParam === 'expired' || showParam === 'all';
  const page = Math.max(1, parseInt(firstParam(sp.page) || '1', 10) || 1);

  const [list, facets, spotlightId] = await Promise.all([
    listOpportunities({ lang, category, q, country, province, deadlineDays, sort, page, perPage: PER_PAGE, includeExpired }),
    getFacets(lang),
    getDailySpotlightId(),
  ]);

  // Province options for the selected country (or all when no country picked).
  const provinceOptions = country !== 'all'
    ? (facets.provinces || []).filter((p) => p.country === country)
    : (facets.provinces || []);
  const showProvinceFilter = provinceOptions.length > 0;

  // A page number beyond the last page (e.g. after filters changed) —
  // fall back to the last page so the user always sees results.
  let effectiveList = list;
  if (list.items.length === 0 && page > list.totalPages && list.total > 0) {
    effectiveList = await listOpportunities({
      lang,
      category,
      q,
      country,
      province,
      deadlineDays,
      sort,
      page: list.totalPages,
      perPage: PER_PAGE,
      includeExpired,
    });
  }

  // Current page might be beyond the last page after filters change.
  const currentPage = effectiveList.page;

  /** Build a listing URL preserving all filters, dropping default values. */
  const buildHref = (overrides: Record<string, string | null> = {}) => {
    const merged: Record<string, string | null> = {
      category: category !== 'all' ? category : null,
      q: q || null,
      country: country !== 'all' ? country : null,
      province: province || null,
      deadline: deadlineDays ? String(deadlineDays) : null,
      sort: sort !== 'newest' ? sort : null,
      show: includeExpired ? showParam || 'expired' : null,
      page: String(currentPage),
      ...overrides,
    };
    if (merged.page === '1') merged.page = null;
    const usp = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) usp.set(key, value);
    }
    const qs = usp.toString();
    return `/${lang}/opportunities${qs ? `?${qs}` : ''}`;
  };

  const selectClasses =
    'h-11 w-full appearance-none rounded-md border border-input bg-background/80 px-3 pe-8 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

  // "{count} opportunities found" leads with the number in all three
  // languages — render the live total through CountUp and the words beside it.
  const countLabel = t('opportunities.resultsCount', { count: '' }).trim();

  // Numbered pagination (no-JS fallback): window of 5 pages around current.
  const windowStart = Math.max(1, Math.min(currentPage - 2, effectiveList.totalPages - 4));
  const windowEnd = Math.min(effectiveList.totalPages, windowStart + 4);
  const pageNumbers: number[] = [];
  for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);

  return (
    <div className="flex min-h-screen flex-col">
      <ReadingProgress />
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />

      <main id="main-content" className="flex-1 pt-24 pb-20">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: OPPORTUNITIES_TITLES[lang] || OPPORTUNITIES_TITLES.en,
              description: OPPORTUNITIES_DESCRIPTIONS[lang] || OPPORTUNITIES_DESCRIPTIONS.en,
              url: `https://www.myariahub.com/${lang}/opportunities`,
              inLanguage: lang,
              breadcrumb: {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'ARIA HUB',
                    item: `https://www.myariahub.com/${lang}`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: t('opportunities.title'),
                    item: `https://www.myariahub.com/${lang}/opportunities`,
                  },
                ],
              },
            }).replace(/</g, '\\u003c'),
          }}
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="flex max-w-3xl flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {t('opportunities.eyebrow')}
              </p>
              <h1 dir="auto" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {t('opportunities.title')}
              </h1>
              <p dir="auto" className="mt-3 text-base text-muted-foreground sm:text-lg">
                {t('opportunities.subtitle')}
              </p>
              {/* Honest live counter — animates once per view, SSR-correct */}
              <p
                dir="auto"
                aria-live="polite"
                className="mt-2 flex items-baseline gap-1.5 text-sm font-medium text-muted-foreground"
              >
                <span className="text-base font-bold tabular-nums text-foreground">
                  <CountUp value={effectiveList.total} duration={900} />
                </span>
                <span>{countLabel}</span>
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 pt-2">
              <Link
                href={`/${lang}/submit-opportunity`}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('submit.link')}
              </Link>
              <Link
                href={`/${lang}/deadlines`}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border bg-card px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {t('opportunities.deadlinesLink')}
              </Link>
              <Link
                href={`/${lang}/opportunities/saved`}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border bg-card px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                {t('opportunities.saved')}
              </Link>
              <a
                href="/rss.xml"
                target="_blank"
                rel="noopener"
                title={t('opportunities.rss')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Rss className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t('opportunities.rss')}</span>
              </a>
            </div>
          </div>

          {/* Sticky glassy filter bar — category chips + sort. Chips are links
              (keyboard-focusable, aria-current state, works without JS) inside
              a snap-scrolling row with edge fades on mobile; the sort select
              auto-submits its GET form (icon button is the no-JS fallback). */}
          <div className="sticky top-[72px] z-30 mt-6 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-xs backdrop-blur-md">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                {/* Category chips — horizontally scrollable on mobile */}
                <div className="relative min-w-0 flex-1">
                  <nav
                    role="navigation"
                    aria-label={t('opportunities.filters')}
                    className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
                      <Link
                        href={buildHref({ category: null, page: '1' })}
                        className={cn(
                          'inline-flex min-h-[44px] snap-start items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-9',
                          category === 'all'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        )}
                        aria-current={category === 'all' ? 'true' : undefined}
                      >
                        {t('common.all')}
                        {!includeExpired && ` · ${facets.totalActive}`}
                      </Link>
                      {facets.categories.map((facet) => {
                        const active = category === facet.slug;
                        const label = t(`opportunities.${facet.slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}`);
                        const chipLabel = label.startsWith('opportunities.') ? facet.name : label;
                        // Zero-count categories add noise to the filter bar — hide them
                        // entirely unless one is an active filter.
                        if (!includeExpired && !active && facet.count === 0) {
                          return null;
                        }
                        return (
                          <Link
                            key={facet.slug}
                            href={buildHref({ category: facet.slug, page: '1' })}
                            className={cn(
                              'inline-flex min-h-[44px] snap-start items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-9',
                              active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                            )}
                            aria-current={active ? 'true' : undefined}
                          >
                            {chipLabel}
                            {!includeExpired && ` · ${facet.count}`}
                          </Link>
                        );
                      })}
                    </div>
                  </nav>
                  {/* Edge fade masks — signal more chips off-screen (mobile only) */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 start-0 w-8 bg-gradient-to-r from-background to-transparent rtl:bg-gradient-to-l sm:hidden"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-l from-background to-transparent rtl:bg-gradient-to-r sm:hidden"
                  />
                </div>

                {/* Sort — GET form preserving every active filter */}
                <form
                  action={`/${lang}/opportunities`}
                  method="get"
                  role="search"
                  className="flex shrink-0 items-center gap-2"
                >
                  {category !== 'all' && <input type="hidden" name="category" value={category} />}
                  {q && <input type="hidden" name="q" value={q} />}
                  {country !== 'all' && <input type="hidden" name="country" value={country} />}
                  {province && <input type="hidden" name="province" value={province} />}
                  {deadlineDays && <input type="hidden" name="deadline" value={String(deadlineDays)} />}
                  {includeExpired && <input type="hidden" name="show" value={showParam || 'expired'} />}
                  <div className="relative flex-1 lg:w-44">
                    <AutoSubmitSelect
                      name="sort"
                      defaultValue={sort}
                      ariaLabel={t('opportunities.sort')}
                      className={selectClasses}
                    >
                      <option value="newest">{t('opportunities.sortNewest')}</option>
                      <option value="deadline">{t('opportunities.sortDeadline')}</option>
                      <option value="title">{t('opportunities.sortTitle')}</option>
                    </AutoSubmitSelect>
                    <ChevronDown
                      className="pointer-events-none absolute inset-y-0 end-2.5 my-auto h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label={t('opportunities.sort')}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background/80 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Filter form — plain GET, works without JS.
              Row 1: prominent search. Row 2: refinement selects with counts. */}
          <form
            action={`/${lang}/opportunities`}
            method="get"
            className="mt-6 rounded-xl border bg-card p-4 shadow-xs"
          >
            {category !== 'all' && <input type="hidden" name="category" value={category} />}
            {sort !== 'newest' && <input type="hidden" name="sort" value={sort} />}
            {includeExpired && <input type="hidden" name="show" value={showParam || 'expired'} />}

            <div className="relative">
              <Search
                className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={t('opportunities.searchPlaceholder')}
                aria-label={t('opportunities.searchPlaceholder')}
                className="h-11 w-full rounded-md border border-input bg-transparent ps-10 pe-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <select
                  name="country"
                  defaultValue={country}
                  aria-label={t('opportunities.location')}
                  className={selectClasses}
                >
                  <option value="all">{t('opportunities.allLocations')}</option>
                  {facets.locations.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name} · {loc.count}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute inset-y-0 end-2.5 my-auto h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>

              {showProvinceFilter && (
                <div className="relative">
                  <select
                    name="province"
                    defaultValue={province}
                    aria-label={t('opportunities.province')}
                    className={selectClasses}
                  >
                    <option value="">{t('opportunities.allProvinces')}</option>
                    {provinceOptions.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} · {p.count}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute inset-y-0 end-2.5 my-auto h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              )}

              <div className="relative">
                <select
                  name="deadline"
                  defaultValue={deadlineDays ? String(deadlineDays) : 'all'}
                  aria-label={t('opportunities.deadlineFilter')}
                  className={selectClasses}
                >
                  <option value="all">{t('opportunities.anyDeadline')}</option>
                  <option value="7">{t('opportunities.deadlineWithin', { count: 7 })}</option>
                  <option value="30">{t('opportunities.deadlineWithin', { count: 30 })}</option>
                  <option value="90">{t('opportunities.deadlineWithin', { count: 90 })}</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute inset-y-0 end-2.5 my-auto h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 active:scale-[0.98] sm:w-auto lg:w-full"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                {t('opportunities.filters')}
              </button>
            </div>
          </form>

          {/* Expired toggle */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <Link
              href={buildHref({ show: includeExpired ? null : 'expired', page: '1' })}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors sm:min-h-0 sm:py-1',
                includeExpired
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {includeExpired ? t('opportunities.activeOnly') : t('opportunities.showExpired')}
            </Link>
            {(q || category !== 'all' || country !== 'all' || province || deadlineDays || includeExpired) && (
              <Link
                href={`/${lang}/opportunities`}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {t('opportunities.clearFilters')}
              </Link>
            )}
          </div>

          {/* Results: server-rendered page 1 + client feed for pages 2+ */}
          {effectiveList.items.length === 0 ? (
            <div className="relative mt-10 grid place-items-center overflow-hidden rounded-2xl border border-dashed py-16 text-center">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent" />
              <span
                aria-hidden="true"
                className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"
              >
                <Search className="h-7 w-7" />
              </span>
              <p dir="auto" className="mt-4 text-base font-semibold">
                {t('opportunities.noResults')}
              </p>
              <p dir="auto" className="mt-1 max-w-sm text-sm text-muted-foreground">
                {t('opportunities.noResultsHint')}
              </p>
              <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={`/${lang}/opportunities`}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('opportunities.clearFilters')}
                </Link>
                <a
                  href="#alerts"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border bg-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {t('opportunities.getAlerts')}
                </a>
              </div>
            </div>
          ) : (
            <OpportunityFeed
              key={[category, q, country, province, deadlineDays ?? '', sort, showParam ?? '', currentPage].join('|')}
              lang={lang}
              initialItems={effectiveList.items}
              initialTotalPages={effectiveList.totalPages}
              spotlightId={spotlightId}
              query={{
                category,
                q,
                country,
                province,
                deadline: deadlineDays ? String(deadlineDays) : '',
                sort,
                show: includeExpired ? showParam || 'expired' : '',
              }}
              adSlot={
                <AdSlot
                  slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_LISTING}
                  format="fluid"
                  layoutKey="-fb+5w+4e-db+86"
                  className="w-full"
                  label={t('common.advertisement')}
                />
              }
              className="mt-8"
            />
          )}

          {/* Numbered pagination — no-JS fallback for the infinite feed */}
          {effectiveList.totalPages > 1 && (
            <noscript>
              <nav
                aria-label={t('opportunities.page')}
                dir="ltr"
                className="mt-12 flex flex-col items-center gap-3"
              >
                <p className="text-xs text-muted-foreground">
                  {t('opportunities.pageOf', { current: currentPage, total: effectiveList.totalPages })}
                </p>
                <div className="flex items-center gap-1.5">
                  {currentPage === 1 ? (
                    <span
                      aria-disabled="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{t('opportunities.prevPage')}</span>
                    </span>
                  ) : (
                    <Link
                      href={buildHref({ page: String(currentPage - 1) })}
                      aria-label={t('opportunities.prevPage')}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}

                  {pageNumbers.map((p) =>
                    p === currentPage ? (
                      <span
                        key={p}
                        aria-current="page"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                      >
                        {p}
                      </span>
                    ) : (
                      <Link
                        key={p}
                        href={buildHref({ page: String(p) })}
                        aria-label={`${t('opportunities.page')} ${p}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {p}
                      </Link>
                    )
                  )}

                  {currentPage === effectiveList.totalPages ? (
                    <span
                      aria-disabled="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{t('opportunities.nextPage')}</span>
                    </span>
                  ) : (
                    <Link
                      href={buildHref({ page: String(currentPage + 1) })}
                      aria-label={t('opportunities.nextPage')}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </nav>
            </noscript>
          )}

          {/* Channel follow band — recurring-visit driver (DB-managed links) */}
          <FollowChannelsBand lang={lang} socialLinks={data.socialLinks.map((l) => ({ platform: l.platform, label: l.label ?? '', url: l.url }))} className="mt-14" />
          {/* Email alert signup — captures leads; category prefilled from the active filter.
              #alerts is the end-of-feed / empty-state CTA target. */}
          <div id="alerts" className="mt-14 scroll-mt-28">
            <AlertSignupCard
              lang={lang}
              initialCategory={category}
              categories={facets.categories.map((c) => ({ slug: c.slug, name: c.name }))}
            />
          </div>
        </div>
      </main>

      <Footer
        settings={data.settings}
        footer={data.footer}
        socialLinks={data.socialLinks}
      />
    </div>
  );
}
