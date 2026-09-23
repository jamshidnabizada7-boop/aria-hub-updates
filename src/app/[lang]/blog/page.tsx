import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Clock, Sparkles, User } from 'lucide-react';
import { PageShell } from '@/components/site/page-shell';
import { listBlogCategories, listBlogPosts } from '@/lib/blog-queries';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n-config';
import { cn } from '@/lib/utils';

export const revalidate = 300;

const LANGS = ['en', 'fa', 'ps'];

import { getPageSeo } from '@/lib/seo-metadata';
import { isLang } from '@/lib/lang-route';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('blog', lang);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/blog`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/blog`])),
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      locale: lang,
      type: 'website',
    },
  };
}

function formatDate(date: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { lang } = await params;
  const { category } = await searchParams;
  const typedLang = (LANGS.includes(lang) ? lang : 'fa') as Lang;
  const t = (key: string) => translate(typedLang, key);
  const isRtl = typedLang !== 'en';

  const [posts, categories] = await Promise.all([
    listBlogPosts(typedLang, category || null),
    listBlogCategories(typedLang),
  ]);

  // (a plain destructure of [null, ...posts] types `post` as possibly null)
  const featured = category ? null : posts[0] ?? null;
  const rest = category ? posts : posts.slice(1);
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const FwdIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <PageShell lang={lang}>
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            ARIA HUB
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t('blog.title')}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{t('blog.subtitle')}</p>
        </header>

        {/* Category chips */}
        {categories.length > 0 && (
          <nav aria-label={t('blog.allCategories')} className="mb-8 flex flex-wrap gap-2">
            <Link
              href={`/${lang}/blog`}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                !category
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
              aria-current={!category ? 'true' : undefined}
            >
              {t('blog.allCategories')}
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/${lang}/blog?category=${c.slug}`}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  category === c.slug
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
                aria-current={category === c.slug ? 'true' : undefined}
              >
                {c.name} · {c.count}
              </Link>
            ))}
          </nav>
        )}

        {posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center text-muted-foreground">
            {t('blog.empty')}
          </div>
        )}

        {/* Featured hero */}
        {featured && (
          <Link
            href={`/${lang}/blog/${featured.slug}`}
            className="group mb-8 block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-lg"
          >
            <article className="grid gap-0 md:grid-cols-5">
              <div className="relative min-h-44 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent md:col-span-2">
                <Sparkles
                  className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-primary/30 transition-transform duration-500 group-hover:scale-110"
                  aria-hidden="true"
                />
                <span className="absolute top-3 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow ltr:left-3 rtl:right-3">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {t('blog.featured')}
                </span>
              </div>
              <div className="flex flex-col justify-center gap-3 p-6 md:col-span-3 md:p-8">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {featured.categoryName && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                      {featured.categoryName}
                    </span>
                  )}
                  <time dateTime={featured.publishedAt.toISOString()}>
                    {formatDate(featured.publishedAt, typedLang)}
                  </time>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {featured.readingMinutes} {t('blog.minRead')}
                  </span>
                </div>
                <h2 className="text-xl font-bold leading-snug text-foreground transition-colors group-hover:text-primary md:text-2xl">
                  {featured.title}
                </h2>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {featured.excerpt}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {t('blog.readMore')}
                  <FwdIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </article>
          </Link>
        )}

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/${lang}/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="relative h-2 rounded-t-2xl bg-gradient-to-r from-primary/60 via-primary/30 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
              <article className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {post.categoryName && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                      {post.categoryName}
                    </span>
                  )}
                  <time dateTime={post.publishedAt.toISOString()}>
                    {formatDate(post.publishedAt, typedLang)}
                  </time>
                </div>
                <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                  {post.title}
                </h3>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span dir="auto" className="truncate">
                      {post.author}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {post.readingMinutes} {t('blog.minRead')}
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
