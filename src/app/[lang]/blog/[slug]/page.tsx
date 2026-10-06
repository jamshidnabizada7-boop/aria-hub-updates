import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Tag, User } from 'lucide-react';
import { PageShell } from '@/components/site/page-shell';
import { getBlogPost, listRelatedPosts } from '@/lib/blog-queries';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n-config';
import { ShareBar } from '@/components/site/share-bar';
import { OriginalContentBadge } from '@/components/site/original-content-badge';
import { sanitizeListingHtml } from '@/lib/content-html';
import { ensureSeoDescription } from '@/lib/seo-metadata';

const LANGS = ['en', 'fa', 'ps'];

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const typedLang = (LANGS.includes(lang) ? lang : 'fa') as Lang;
  const post = await getBlogPost(slug, typedLang);
  // notFound() in the metadata phase sets a real 404 status — during the
  // streamed page render the headers are already gone and it ships as 200.
  if (!post) notFound();

  const rawTitle = post.seoTitle || post.title;
  const title = rawTitle.length < 25 ? `${rawTitle} — Expert Guide` : rawTitle;
  const description = ensureSeoDescription(
    post.seoDescription || post.excerpt,
    typedLang,
    typedLang === 'fa'
      ? 'راهنماهای کاربردی بورسیه، نکات ویزا و ارتقای شغلی در وبلاگ آریا هاب.'
      : typedLang === 'ps'
      ? 'د تحصیلي بورسونو لارښوونې، د ویزې نکتې او مسلکي پرمختګ په آریا هاب کې.'
      : 'Expert scholarship guides, visa advice, and career tips on ARIA HUB.'
  );

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: `${title} | ARIA HUB`,
    description,
    alternates: {
      canonical: `/${lang}/blog/${slug}`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/blog/${slug}`])),
    },
    openGraph: {
      title: `${title} | ARIA HUB`,
      description,
      type: 'article',
      publishedTime: post?.publishedAt && !isNaN(new Date(post.publishedAt).getTime())
        ? new Date(post.publishedAt).toISOString()
        : undefined,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags.length ? post.tags : undefined,
      images: [
        {
          url: post.image || '/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ARIA HUB`,
      description,
      images: [post.image || '/og-image.png'],
    },
  };
}

function formatDate(date: Date | string | null | undefined, lang: string): string {
  try {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const typedLang = (LANGS.includes(lang) ? lang : 'fa') as Lang;
  const t = (key: string) => translate(typedLang, key);
  const isRtl = typedLang !== 'en';

  const post = await getBlogPost(slug, typedLang);
  if (!post) notFound();

  const related = await listRelatedPosts(typedLang, post.categorySlug, post.slug, 3).catch((err) => {
    console.error('[listRelatedPosts error]', err);
    return [];
  });
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const pageUrl = `https://www.myariahub.com/${lang}/blog/${post.slug}`;

  const pubDate = post.publishedAt ? new Date(post.publishedAt) : null;
  const safePubDateIso = pubDate && !isNaN(pubDate.getTime()) ? pubDate.toISOString() : new Date().toISOString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: safePubDateIso,
    dateModified: safePubDateIso,
    author: post.author ? { '@type': 'Organization', name: post.author } : undefined,
    publisher: { '@type': 'Organization', name: 'ARIA HUB' },
    mainEntityOfPage: pageUrl,
    ...(post.image ? { image: [post.image] } : {}),
  };

  return (
    <PageShell lang={lang}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6 lg:px-8">
        <Link
          href={`/${lang}/blog`}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <BackIcon className="h-4 w-4" aria-hidden="true" />
          {t('blog.back')}
        </Link>

        <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="h-2 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
          <header className="border-b border-border/60 bg-muted/20 px-6 py-8 md:px-10">
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {post.categoryName && (
                <Link
                  href={`/${lang}/blog?category=${post.categorySlug}`}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  {post.categoryName}
                </Link>
              )}
              <time
                dateTime={safePubDateIso}
                className="inline-flex items-center gap-1.5"
              >
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(pubDate, typedLang)}
              </time>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {post.readingMinutes} {t('blog.minRead')}
              </span>
              {post.author && (
                <span className="inline-flex items-center gap-1.5" dir="auto">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('blog.by')} {post.author}
                </span>
              )}
            </div>
            <h1 dir="auto" className="text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
              {post.title}
            </h1>
            {post.originalLanguage && (
              <div className="mt-3">
                <OriginalContentBadge lang={typedLang} />
              </div>
            )}
            {post.excerpt && (
              <p dir="auto" className="mt-4 text-base leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
            )}
          </header>

          <div
            dir="auto"
            className="prose-listing px-6 py-8 md:px-10"
            dangerouslySetInnerHTML={{ __html: sanitizeListingHtml(post.content) }}
          />

          {post.tags.length > 0 && (
            <footer className="border-t border-border/60 px-6 py-5 md:px-10">
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </footer>
          )}
        </article>

        {/* Share */}
        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold text-foreground">{t('blog.shareArticle')}</p>
          <ShareBar url={pageUrl} title={post.title} lang={typedLang} />
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12" aria-label={t('blog.related')}>
            <h2 className="mb-5 text-lg font-bold text-foreground">{t('blog.related')}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/${lang}/blog/${rel.slug}`}
                  className="group flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <h3 className="line-clamp-3 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {rel.title}
                  </h3>
                  <time
                    dateTime={(() => {
                      const d = rel.publishedAt instanceof Date ? rel.publishedAt : new Date(rel.publishedAt);
                      return !isNaN(d.getTime()) ? d.toISOString() : '';
                    })()}
                    className="mt-auto pt-3 text-xs text-muted-foreground"
                  >
                    {formatDate(rel.publishedAt, typedLang)}
                  </time>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
