import { PageShell } from '@/components/site/page-shell';
import { Button } from '@/components/ui/button';
import { db as prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, Mic, BookOpen } from 'lucide-react';
import { getLocalizedContent } from '@/lib/i18n-content';
import { translate, formatDuration } from '@/lib/i18n';

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-600 dark:text-green-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const category = await prisma.interviewCategory.findUnique({ where: { slug } });
  if (!category) return { title: 'Not Found | ARIA HUB' };
  const name = getLocalizedContent(category.name, category.nameI18n, lang);
  const desc = getLocalizedContent(category.description, category.descriptionI18n, lang);
  return {
    title: `${name} | ARIA HUB`,
    description: desc || undefined,
    alternates: {
      canonical: `/${lang}/interview-prep/category/${slug}`,
      languages: {
        en: `/en/interview-prep/category/${slug}`,
        fa: `/fa/interview-prep/category/${slug}`,
        ps: `/ps/interview-prep/category/${slug}`,
      },
    },
  };
}

export default async function InterviewCategoryPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  const category = await prisma.interviewCategory.findUnique({
    where: { slug },
    include: {
      questions: {
        where: { status: 'published' },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!category) notFound();

  const name = getLocalizedContent(category.name, category.nameI18n, lang);
  const description = getLocalizedContent(category.description, category.descriptionI18n, lang);

  // All sibling categories for cross-navigation
  const siblings = await prisma.interviewCategory.findMany({
    where: { id: { not: category.id } },
    orderBy: { order: 'asc' },
    select: { slug: true, name: true, nameI18n: true },
  });

  return (
    <PageShell lang={lang} className="pb-16">
      <div className="bg-slate-50 dark:bg-slate-950">
        {/* Category header */}
        <div className="bg-primary px-4 py-14 text-primary-foreground md:py-20">
          <div className="mx-auto max-w-4xl">
            <Link
              href={`/${lang}/interview-prep`}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
            >
              <ArrowLeft className="h-4 w-4 rtl-flip" />
              {t('interview.backToPrep')}
            </Link>
            <div className="flex items-start gap-4">
              <div className="hidden rounded-2xl bg-primary-foreground/10 p-4 sm:block">
                <BookOpen className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {name}
                </h1>
                {description && (
                  <p className="mt-3 max-w-2xl text-primary-foreground/85">
                    {description}
                  </p>
                )}
                <p className="mt-4 inline-flex rounded-full bg-primary-foreground/10 px-4 py-1.5 text-sm font-semibold">
                  {category.questions.length === 1 ? t('interview.questionOne') : t('interview.questionsCount', { count: category.questions.length })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Question list */}
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-bold text-foreground">
            {t('interview.categoryQuestions')}
          </h2>

          <div className="space-y-4">
            {category.questions.map((question, idx) => {
              const qText = getLocalizedContent(question.question, question.questionI18n, lang);
              return (
                <Link
                  key={question.id}
                  href={`/${lang}/interview-prep/questions/${question.id}`}
                  className="group flex items-start justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md sm:p-6"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                        #{idx + 1}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 ${DIFFICULTY_STYLES[question.difficulty] || DIFFICULTY_STYLES.medium}`}
                      >
                        {t(`interview.difficulty.${question.difficulty}`)}
                      </span>
                      {question.expectedDuration && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(question.expectedDuration, lang)}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                      {qText}
                    </p>
                  </div>
                  <span className="mt-1 shrink-0 rounded-full bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Mic className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Sibling categories */}
          {siblings.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {t('interview.categories')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {siblings.map((sib) => (
                  <Link
                    key={sib.slug}
                    href={`/${lang}/interview-prep/category/${sib.slug}`}
                    className="rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {getLocalizedContent(sib.name, sib.nameI18n, lang)}
                    <ArrowRight className="ms-1.5 inline h-3.5 w-3.5 rtl-flip" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* AI practice CTA */}
          <div className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 text-center sm:p-8">
            <h3 className="text-lg font-bold">{t('interview.title')}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t('interview.setupSubtitle')}
            </p>
            <Button asChild className="mt-5 font-bold">
              <Link href={`/${lang}/interview-prep/practice`}>
                <Mic className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                {t('interview.practice')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
