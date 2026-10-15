import { PageBackLink } from '@/components/site/page-navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlarmClock,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { getSiteData } from '@/lib/get-site';
import { db } from '@/lib/db';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { DeadlineCard, type DeadlineTone } from '@/components/site/deadline-card';
import { AlertSignupCard } from '@/components/site/alert-signup-card';
import { translate } from '@/lib/i18n';
import { getLocalizedContent } from '@/lib/i18n-content';
import { isLang, type Lang } from '@/lib/lang-route';
import {
  daysUntilDeadline,
  listByDeadline,
  type DeadlineListResult,
  type OpportunityCardData,
} from '@/lib/opportunity-queries';
import { cn } from '@/lib/utils';

import { getPageSeo } from '@/lib/seo-metadata';

const PER_PAGE = 12;

// New records land via periodic imports — keep the page at most 300s stale.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('deadlines', lang);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/deadlines`,
      languages: {
        en: '/en/deadlines',
        fa: '/fa/deadlines',
        ps: '/ps/deadlines',
      },
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      locale: lang,
      type: 'website',
    },
  };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// ---------------------------------------------------------------------------
// urgency buckets
// ---------------------------------------------------------------------------

interface BucketConfig {
  id: string;
  tone: DeadlineTone;
  icon: LucideIcon;
  /** Extra motion for the most urgent bucket only. */
  pulse: boolean;
  panel: string;
  iconBox: string;
  badge: string;
}

const BUCKETS: Record<'urgent' | 'soon' | 'later', BucketConfig> = {
  urgent: {
    id: 'deadlines-urgent',
    tone: 'urgent',
    icon: AlarmClock,
    pulse: true,
    panel: 'border-rose-500/25 bg-gradient-to-br from-rose-500/[0.06] via-card/60 to-transparent',
    iconBox: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  },
  soon: {
    id: 'deadlines-soon',
    tone: 'soon',
    icon: CalendarClock,
    pulse: false,
    panel: 'border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-card/60 to-transparent',
    iconBox: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  later: {
    id: 'deadlines-later',
    tone: 'later',
    icon: CalendarDays,
    pulse: false,
    panel: 'border-teal-500/25 bg-gradient-to-br from-teal-500/[0.06] via-card/60 to-transparent',
    iconBox: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    badge: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400',
  },
};

function BucketSection({
  config,
  heading,
  count,
  items,
  lang,
}: {
  config: BucketConfig;
  heading: string;
  count: number;
  items: OpportunityCardData[];
  lang: Lang;
}) {
  const Icon = config.icon;
  return (
    <section
      aria-labelledby={config.id}
      className={cn('rounded-2xl border p-4 sm:p-6', config.panel)}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'relative grid h-10 w-10 shrink-0 place-items-center rounded-xl',
              config.iconBox
            )}
          >
            <Icon className={cn('h-5 w-5', config.pulse && 'animate-pulse')} />
            {config.pulse && (
              <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
              </span>
            )}
          </span>
          <h2 id={config.id} dir="auto" className="text-lg font-bold leading-tight sm:text-xl">
            {heading}
          </h2>
        </div>
        <span
          dir="auto"
          aria-label={`${heading}: ${count}`}
          className={cn('rounded-full border px-3 py-1 text-xs font-bold', config.badge)}
        >
          {count}
        </span>
      </header>

      <ol className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((opportunity) => (
          <li key={opportunity.id}>
            <DeadlineCard opportunity={opportunity} lang={lang} tone={config.tone} />
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

export default async function DeadlinesPage({
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
  const page = Math.max(1, parseInt(firstParam(sp.page) || '1', 10) || 1);

  // DB-driven categories for the alert-signup dropdown (localized via nameI18n)
  const categoryRows = await db.opportunityCategory.findMany({
    orderBy: { order: 'asc' },
    select: { slug: true, name: true, nameI18n: true },
  });
  const categorySlugs = categoryRows.map((c) => ({
    slug: c.slug,
    name: (lang && getLocalizedContent(c.name, c.nameI18n as Record<string, string> | null, lang)) || c.name,
  }));

  let list: DeadlineListResult = await listByDeadline(lang, { page, perPage: PER_PAGE });

  // A page number beyond the last page — fall back so the user sees results.
  if (list.items.length === 0 && page > list.totalPages && list.total > 0) {
    list = await listByDeadline(lang, { page: list.totalPages, perPage: PER_PAGE });
  }
  const currentPage = list.page;

  // Group the current page's rows into urgency buckets (global order is
  // deadline-asc, so buckets fill in order urgent → soon → later).
  const grouped: Record<'urgent' | 'soon' | 'later', OpportunityCardData[]> = {
    urgent: [],
    soon: [],
    later: [],
  };
  for (const item of list.items) {
    const days = item.deadline ? daysUntilDeadline(item.deadline) : null;
    if (days !== null && days <= 7) grouped.urgent.push(item);
    else if (days !== null && days <= 30) grouped.soon.push(item);
    else grouped.later.push(item);
  }

  const buildHref = (p: number) =>
    p <= 1 ? `/${lang}/deadlines` : `/${lang}/deadlines?page=${p}`;

  // Numbered pagination: window of 5 pages around the current one.
  const windowStart = Math.max(1, Math.min(currentPage - 2, list.totalPages - 4));
  const windowEnd = Math.min(list.totalPages, windowStart + 4);
  const pageNumbers: number[] = [];
  for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />

      <main id="main-content" className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PageBackLink lang={lang} to="opportunities" className="mb-6" />
          {/* Page header */}
          <div className="flex max-w-3xl flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {t('deadlines.eyebrow')}
              </p>
              <h1 dir="auto" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {t('deadlines.title')}
              </h1>
              <p dir="auto" className="mt-3 text-base text-muted-foreground sm:text-lg">
                {t('deadlines.subtitle')}
              </p>
              <p dir="auto" className="mt-2 text-sm font-medium text-muted-foreground">
                {t('deadlines.resultsCount', { count: list.total })}
              </p>
              <p dir="auto" className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarPlus className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                {t('deadlines.calendarTip')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-2">
              <Link
                href={`/${lang}/opportunities`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {t('home.viewAllOpportunities')}
              </Link>
            </div>
          </div>

          {/* Results / empty state */}
          {list.total === 0 ? (
            <div className="mt-10 grid place-items-center rounded-2xl border border-dashed py-20 text-center">
              <span
                aria-hidden="true"
                className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"
              >
                <CalendarCheck className="h-7 w-7" />
              </span>
              <p dir="auto" className="mt-4 text-base font-medium">
                {t('deadlines.empty')}
              </p>
              <p dir="auto" className="mt-1 max-w-sm text-sm text-muted-foreground">
                {t('deadlines.emptyHint')}
              </p>
              <Link
                href={`/${lang}/opportunities`}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {t('home.viewAllOpportunities')}
              </Link>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              {grouped.urgent.length > 0 && (
                <BucketSection
                  config={BUCKETS.urgent}
                  heading={t('deadlines.within7')}
                  count={list.buckets.within7}
                  items={grouped.urgent}
                  lang={lang}
                />
              )}
              {grouped.soon.length > 0 && (
                <BucketSection
                  config={BUCKETS.soon}
                  heading={t('deadlines.within30')}
                  count={list.buckets.within30}
                  items={grouped.soon}
                  lang={lang}
                />
              )}
              {grouped.later.length > 0 && (
                <BucketSection
                  config={BUCKETS.later}
                  heading={t('deadlines.later')}
                  count={list.buckets.later}
                  items={grouped.later}
                  lang={lang}
                />
              )}
            </div>
          )}

          {/* Numbered pagination */}
          {list.totalPages > 1 && (
            <nav
              aria-label={t('opportunities.page')}
              dir="ltr"
              className="mt-12 flex flex-col items-center gap-3"
            >
              <p className="text-xs text-muted-foreground">
                {t('opportunities.pageOf', { current: currentPage, total: list.totalPages })}
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
                    href={buildHref(currentPage - 1)}
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
                      href={buildHref(p)}
                      aria-label={`${t('opportunities.page')} ${p}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {p}
                    </Link>
                  )
                )}

                {currentPage === list.totalPages ? (
                  <span
                    aria-disabled="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t('opportunities.nextPage')}</span>
                  </span>
                ) : (
                  <Link
                    href={buildHref(currentPage + 1)}
                    aria-label={t('opportunities.nextPage')}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </nav>
          )}
          {/* Email alert signup — deadline-conscious visitors want reminders */}
          <AlertSignupCard lang={lang} className="mt-14" categories={categorySlugs} />
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
