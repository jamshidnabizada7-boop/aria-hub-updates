import { PageShell } from '@/components/site/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { db as prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Lightbulb, AlertTriangle, Clock, Mic } from 'lucide-react';
import Link from 'next/link';
import { getLocalizedContent } from '@/lib/i18n-content';
import { translate, formatDuration } from '@/lib/i18n';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: `${translate(lang, 'interview.title')} | ARIA HUB`,
    alternates: { canonical: `/${lang}/interview-prep` },
  };
}

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const t = (key: string, p?: Record<string, string | number>) => translate(lang, key, p);

  const question = await prisma.interviewQuestion.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!question || question.status !== 'published') {
    notFound();
  }

  const qText = getLocalizedContent(question.question, question.questionI18n, lang);
  const sampleAnswer = getLocalizedContent(question.sampleAnswer, question.sampleAnswerI18n, lang);
  const strongEx = getLocalizedContent(question.strongExample, question.strongExampleI18n, lang);
  const weakEx = getLocalizedContent(question.weakExample, question.weakExampleI18n, lang);
  const tips = getLocalizedContent(question.tips, question.tipsI18n, lang);
  const categoryName = question.category
    ? getLocalizedContent(question.category.name, question.category.nameI18n, lang)
    : t('interview.general');

  const commonMistakes = (getLocalizedContent(
    Array.isArray(question.commonMistakes) ? (question.commonMistakes as string[]).join('\n') : '',
    Array.isArray(question.commonMistakesI18n)
      ? (question.commonMistakesI18n as Record<string, string[]>)[lang]?.join('\n')
      : undefined,
    lang
  ) || '')
    .split('\n')
    .filter(Boolean);

  const followUps = (getLocalizedContent(
    Array.isArray(question.followUpQuestions) ? (question.followUpQuestions as string[]).join('\n') : '',
    Array.isArray(question.followUpQuestionsI18n)
      ? (question.followUpQuestionsI18n as Record<string, string[]>)[lang]?.join('\n')
      : undefined,
    lang
  ) || '')
    .split('\n')
    .filter(Boolean);

  const difficultyLabel = t(`interview.difficulty.${question.difficulty}`);

  return (
    <PageShell lang={lang} className="pb-16">
      <div className="bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href={
              question.category
                ? `/${lang}/interview-prep/category/${question.category.slug}`
                : `/${lang}/interview-prep`
            }
            className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2 rtl-flip" />
            {question.category ? categoryName : t('interview.backToPrep')}
          </Link>

          {/* Question Header */}
          <Card className="mb-8 overflow-hidden border-primary/20 bg-primary/5">
            <CardHeader className="pb-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{categoryName}</span>
                <span
                  className={`rounded-full px-2 py-1 normal-case ${
                    question.difficulty === 'hard'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                      : question.difficulty === 'medium'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400'
                  }`}
                >
                  {difficultyLabel}
                </span>
              </div>
              <CardTitle className="text-2xl leading-relaxed sm:text-3xl">
                &ldquo;{qText}&rdquo;
              </CardTitle>
            </CardHeader>
            {question.expectedDuration && (
              <CardFooter className="bg-primary/5 py-3 text-sm font-medium text-primary">
                <Clock className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                {t('interview.expectedDuration')}: {formatDuration(question.expectedDuration, lang)}
              </CardFooter>
            )}
          </Card>

          {/* Content Sections */}
          <div className="space-y-6">
            {sampleAnswer && (
              <section>
                <h3 className="mb-3 flex items-center text-lg font-bold">
                  <Lightbulb className="mr-2 h-5 w-5 text-amber-500 rtl:mr-0 rtl:ml-2" />
                  {t('interview.sampleAnswer')}
                </h3>
                <div className="rounded-xl border bg-card p-5 leading-relaxed text-card-foreground shadow-sm">
                  {sampleAnswer}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {strongEx && (
                <section>
                  <h3 className="mb-3 flex items-center text-lg font-bold text-green-600 dark:text-green-400">
                    <CheckCircle2 className="mr-2 h-5 w-5 rtl:mr-0 rtl:ml-2" />
                    {t('interview.strongExample')}
                  </h3>
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 leading-relaxed text-card-foreground shadow-sm">
                    {strongEx}
                  </div>
                </section>
              )}

              {weakEx && (
                <section>
                  <h3 className="mb-3 flex items-center text-lg font-bold text-red-600 dark:text-red-400">
                    <XCircle className="mr-2 h-5 w-5 rtl:mr-0 rtl:ml-2" />
                    {t('interview.weakExample')}
                  </h3>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 leading-relaxed text-card-foreground shadow-sm">
                    {weakEx}
                  </div>
                </section>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {tips && (
                <section>
                  <h3 className="mb-3 text-lg font-bold">{t('interview.howToAnswer')}</h3>
                  <div className="rounded-xl border bg-card p-5 text-sm leading-relaxed text-muted-foreground shadow-sm">
                    {tips}
                  </div>
                </section>
              )}

              {commonMistakes.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center text-lg font-bold text-orange-500">
                    <AlertTriangle className="mr-2 h-5 w-5 rtl:mr-0 rtl:ml-2" />
                    {t('interview.commonMistakes')}
                  </h3>
                  <ul className="list-inside list-disc space-y-2 rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
                    {commonMistakes.map((mistake, i) => (
                      <li key={i}>{mistake}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {followUps.length > 0 && (
              <section>
                <h3 className="mb-3 text-lg font-bold">{t('interview.followUp')}</h3>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <ul className="space-y-3">
                    {followUps.map((q, i) => (
                      <li key={i} className="flex gap-3 text-muted-foreground">
                        <span className="font-bold text-primary">Q:</span> {q}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>

          <div className="mt-12 flex justify-center border-t pt-8">
            <Button size="lg" asChild className="font-bold">
              <Link href={`/${lang}/interview-prep/practice/session?questionId=${question.id}`}>
                <Mic className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                {t('interview.practiceWithAI')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
