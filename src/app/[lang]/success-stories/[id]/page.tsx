import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, Globe2, Heart, MapPin } from 'lucide-react';
import { PageShell } from '@/components/site/page-shell';
import {
  getRelatedStories,
  getSuccessStory,
  translateStoryType,
} from '@/lib/success-story-queries';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n-config';
import { isLang } from '@/lib/lang-route';
import { formatDateShort } from '@/lib/date-format';
import LikeButton from '@/components/site/like-button';

const LANGS = ['en', 'fa', 'ps'];

import { ensureSeoDescription } from '@/lib/seo-metadata';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const l: Lang = isLang(lang) ? lang : 'fa';
  const story = await getSuccessStory(id, l);
  if (!story) return { title: 'Success Story | ARIA HUB' };

  const title = story.title.length < 24
    ? `${story.title} — Success Story | ARIA HUB`
    : `${story.title} | ARIA HUB`;

  const description = ensureSeoDescription(
    story.excerpt,
    l,
    l === 'fa'
      ? 'داستان الهام‌بخش قبولی و تجربه موفقیت در پلتفرم آریا هاب.'
      : l === 'ps'
      ? 'د بریا الهام بښونکې کیسه او تجربه په آریا هاب کې ولولئ.'
      : 'Inspiring success story and admissions experience shared on ARIA HUB.'
  );

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title,
    description,
    alternates: {
      canonical: `/${l}/success-stories/${id}`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `/${x}/success-stories/${id}`])),
    },
    openGraph: {
      title,
      description,
      locale: l,
      type: 'article',
    },
  };
}

export default async function SuccessStoryDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const typedLang: Lang = isLang(lang) ? lang : 'fa';
  const t = (key: string) => translate(typedLang, key);
  const isRtl = typedLang !== 'en';
  const FwdIcon = isRtl ? ArrowLeft : ArrowRight;
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const story = await getSuccessStory(id, typedLang);
  if (!story) notFound();

  const related = await getRelatedStories(story.id, story.storyType, typedLang, 3);

  return (
    <PageShell lang={lang} className="pt-20 pb-16">
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href={`/${typedLang}/success-stories`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <BackIcon className="h-4 w-4" aria-hidden="true" />
            {t('stories.back')}
          </Link>
        </nav>

        <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-10">
          {/* Meta band */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-amber-500/10 px-3 py-1 font-semibold text-amber-700 dark:text-amber-300">
              {translateStoryType(story.storyType, typedLang)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {story.country}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {story.year}
            </span>
            <time
              dateTime={(() => {
                const d = story.createdAt instanceof Date ? story.createdAt : new Date(story.createdAt);
                return !isNaN(d.getTime()) ? d.toISOString() : '';
              })()}
            >
              {formatDateShort(story.createdAt, typedLang)}
            </time>
          </div>

          <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl">
            {story.title}
          </h1>

          {(story.program || story.visaType) && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-foreground/90">
              <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
              {story.program || story.visaType}
            </p>
          )}

          {/* Story body */}
          <div className="mt-6 space-y-4">
            {story.content.split(/\n{2,}/).map((para, i) => (
              <p key={i} dir="auto" className="leading-relaxed text-foreground/90">
                {para.trim()}
              </p>
            ))}
          </div>

          {/* Footer: author + like */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
            <div>
              <p className="text-xs text-muted-foreground">{t('stories.by')}</p>
              <p className="mt-0.5 font-semibold text-foreground">{story.authorAlias}</p>
            </div>
            <LikeButton storyId={story.id} initialLikes={story.likes} lang={typedLang} />
          </div>
        </article>

        {/* Related stories */}
        {related.length > 0 && (
          <section aria-labelledby="related-stories" className="mt-12">
            <h2 id="related-stories" className="mb-5 text-xl font-bold text-foreground">
              {t('stories.related')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/${typedLang}/success-stories/${r.id}`}
                  className="group flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md"
                >
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 w-fit">
                    {translateStoryType(r.storyType, typedLang)}
                  </span>
                  <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    {r.title}
                  </h3>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-primary">
                    {t('stories.readStory')}
                    <FwdIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Share CTA */}
        <div className="mt-12 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-card p-6 text-center">
          <p className="font-semibold text-foreground">{t('stories.shareCta')}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t('stories.shareHint')}</p>
          <Link
            href={`/${typedLang}/success-stories/share`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
          >
            {t('stories.shareCta')}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
