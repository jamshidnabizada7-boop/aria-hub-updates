import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Globe2,
  GraduationCap,
  Heart,
  Plane,
  Quote,
  Send,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { PageShell } from '@/components/site/page-shell';
import {
  getStoryFacets,
  listSuccessStories,
  translateStoryType,
} from '@/lib/success-story-queries';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n-config';
import { isLang } from '@/lib/lang-route';
import { formatDateShort } from '@/lib/date-format';
import { cn } from '@/lib/utils';

export const revalidate = 300;

const LANGS = ['en', 'fa', 'ps'];

const TYPE_ICONS: Record<string, typeof Trophy> = {
  scholarship: GraduationCap,
  job: Briefcase,
  visa: Plane,
  exchange: Globe2,
  training: Users,
  other: Trophy,
};

const TYPE_STYLES: Record<string, string> = {
  scholarship: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  job: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  visa: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  exchange: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  training: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  other: 'bg-primary/10 text-primary',
};

import { getPageSeo } from '@/lib/seo-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : 'fa';
  const seo = getPageSeo('successStories', l);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${l}/success-stories`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `/${x}/success-stories`])),
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      locale: l,
      type: 'website',
    },
  };
}

export default async function SuccessStoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const typedLang: Lang = isLang(lang) ? lang : 'fa';
  const t = (key: string, p?: Record<string, string | number>) => translate(typedLang, key, p);
  const isRtl = typedLang !== 'en';
  const FwdIcon = isRtl ? ArrowLeft : ArrowRight;
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const type = sp.type && sp.type !== 'all' ? sp.type : undefined;
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);

  const [list, facets] = await Promise.all([
    listSuccessStories(typedLang, { storyType: type, page, perPage: 12 }),
    getStoryFacets(typedLang),
  ]);

  // Featured story is pinned first by the query (featured desc) — only
  // highlight it visually on page 1 without an active filter.
  const showHero = !type && page === 1 && list.items.length > 0 && list.items[0].featured;
  const featured = showHero ? list.items[0] : null;
  const rest = featured ? list.items.slice(1) : list.items;

  const typeHref = (slug?: string) =>
    `/${typedLang}/success-stories${slug ? `?type=${slug}` : ''}`;

  return (
    <PageShell lang={lang} className="pt-20 pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/5 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {t('stories.eyebrow')}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t('stories.title')}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{t('stories.subtitle')}</p>
        </header>

        {/* Stats band */}
        {facets.total > 0 && (
          <div className="mb-10 grid grid-cols-3 gap-3 sm:max-w-lg" aria-label={t('stories.eyebrow')}>
            <div className="rounded-xl border border-border/60 bg-card p-4 text-center shadow-xs">
              <p className="text-2xl font-black text-primary">{facets.total}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('stories.statStories', { n: facets.total })}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 text-center shadow-xs">
              <p className="text-2xl font-black text-primary">{facets.countries}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('stories.statCountries', { n: facets.countries })}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 text-center shadow-xs">
              <p className="text-2xl font-black text-primary">{facets.year ?? '—'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('stories.statLatest', { year: facets.year ?? '—' })}</p>
            </div>
          </div>
        )}

        {/* Type filter chips */}
        <nav aria-label={t('stories.filterAll')} className="mb-8 flex flex-wrap gap-2">
          <Link
            href={typeHref()}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              !type
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
            aria-current={!type ? 'true' : undefined}
          >
            {t('stories.filterAll')}
          </Link>
          {facets.types.map(({ type: slug, label }) => (
            <Link
              key={slug}
              href={typeHref(slug)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                type === slug
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
              aria-current={type === slug ? 'true' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Empty state */}
        {list.total === 0 && (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
            <p className="mt-4 text-muted-foreground">{t('stories.empty')}</p>
            <Link
              href={`/${typedLang}/success-stories/share`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {t('stories.shareCta')}
            </Link>
          </div>
        )}

        {/* Featured story hero */}
        {featured && (
          <Link
            href={`/${typedLang}/success-stories/${featured.id}`}
            className="group mb-8 block overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-card shadow-sm transition-all hover:border-amber-500/50 hover:shadow-lg"
          >
            <article className="relative p-6 sm:p-8">
              <Quote
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 end-4 h-24 w-24 rotate-12 text-amber-500/10"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 font-semibold text-white shadow-sm">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {t('stories.featuredStory')}
                </span>
                <span className={cn('rounded-full px-2.5 py-1 font-medium', TYPE_STYLES[featured.storyType] || TYPE_STYLES.other)}>
                  {translateStoryType(featured.storyType, typedLang)}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold leading-snug text-foreground transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400 md:text-2xl">
                {featured.title}
              </h2>
              <p className="mt-2 line-clamp-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {featured.excerpt}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{featured.authorAlias}</span>
                <span>{featured.country}</span>
                <span>{featured.year}</span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                  {featured.likes}
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  {t('stories.readStory')}
                  <FwdIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </article>
          </Link>
        )}

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((story) => {
            const TypeIcon = TYPE_ICONS[story.storyType] || Trophy;
            return (
              <Link
                key={story.id}
                href={`/${typedLang}/success-stories/${story.id}`}
                className="group flex flex-col rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="relative h-1.5 rounded-t-2xl bg-gradient-to-r from-amber-500/60 via-orange-500/30 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
                <article className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', TYPE_STYLES[story.storyType] || TYPE_STYLES.other)}>
                      <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {translateStoryType(story.storyType, typedLang)}
                    </span>
                    <time dateTime={story.createdAt.toISOString()} className="text-xs text-muted-foreground">
                      {formatDateShort(story.createdAt, typedLang)}
                    </time>
                  </div>
                  <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    {story.title}
                  </h3>
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {story.excerpt}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                    <span className="truncate font-medium text-foreground/80">{story.authorAlias}</span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                      {story.likes}
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        {list.totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`${typeHref(type)}${type ? '&' : '?'}page=${page - 1}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                aria-label="Previous page"
              >
                <BackIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
            <span className="px-3 text-sm text-muted-foreground">
              {page} / {list.totalPages}
            </span>
            {page < list.totalPages && (
              <Link
                href={`${typeHref(type)}${type ? '&' : '?'}page=${page + 1}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                aria-label="Next page"
              >
                <FwdIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </nav>
        )}

        {/* CTA band */}
        {list.total > 0 && (
          <div className="relative mt-14 overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-orange-500/[0.05] p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent"
            />
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <h2 className="text-xl font-bold text-foreground">{t('stories.shareCta')}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{t('stories.shareHint')}</p>
              </div>
              <Link
                href={`/${typedLang}/success-stories/share`}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t('stories.shareCta')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
