import { PageBackLink } from '@/components/site/page-navigation';
import { TranslatedText } from '@/components/ui/translated-text';
import { PageShell } from '@/components/site/page-shell';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Mic, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { db as prisma } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { translate } from '@/lib/i18n';
import type { Metadata } from 'next';
import { getPageSeo } from '@/lib/seo-metadata';
import { isLang, type Lang } from '@/lib/lang-route';

const getCachedInterviewCategories = unstable_cache(
  async () => {
    try {
      return await prisma.interviewCategory.findMany({
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: { questions: { where: { status: 'published' } } },
          },
        },
      });
    } catch (e) {
      console.error('Failed to get interview categories:', e);
      return [];
    }
  },
  ['cached-interview-categories'],
  { revalidate: 3600, tags: ['interviews'] }
);

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  GraduationCap: BookOpen,
  Plane: BookOpen,
  Briefcase: BookOpen,
  Globe2: BookOpen,
  HeartHandshake: BookOpen,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('interviewPrep', lang);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/interview-prep`,
      languages: { en: '/en/interview-prep', fa: '/fa/interview-prep', ps: '/ps/interview-prep' },
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      locale: lang,
      type: 'website',
    },
  };
}

export default async function InterviewPrepPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = (key: string, p?: Record<string, string | number>) => translate(lang, key, p);

  const categories = await getCachedInterviewCategories();

  return (
    <PageShell lang={lang} className="pb-16">
      <div className="bg-slate-50 dark:bg-slate-950">
        {/* Hero Section */}
        <div className="bg-primary px-4 pb-20 pt-28 text-center text-primary-foreground md:pb-32 md:pt-32">
          <div className="mx-auto max-w-4xl space-y-6">
            <PageBackLink lang={lang} inverse className="mb-4" />
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              <TranslatedText tKey="interview.title" />
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80 sm:text-xl">
              <TranslatedText tKey="interview.subtitle" />
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="font-bold">
                <Link href={`/${lang}/interview-prep/practice`}>
                  <Mic className="mr-2 h-5 w-5 rtl:mr-0 rtl:ml-2" />
                  <TranslatedText tKey="interview.practice" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent font-bold text-primary-foreground hover:bg-primary-foreground hover:text-primary border-primary-foreground/30 hover:border-primary-foreground">
                <Link href={`/${lang}/interview-prep/community`}>
                  <Users className="mr-2 h-5 w-5 rtl:mr-0 rtl:ml-2" />
                  <TranslatedText tKey="interview.community" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              <TranslatedText tKey="interview.categories" />
            </h2>
            <p className="mt-2 text-muted-foreground">
              <TranslatedText tKey="interview.tagline" />
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
              <p className="text-muted-foreground">{t('interview.noCategories')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((category) => {
                const name = getLocalizedContent(category.name, category.nameI18n, lang);
                const desc = getLocalizedContent(
                  category.description,
                  category.descriptionI18n,
                  lang
                );
                const Icon = CATEGORY_ICONS[category.icon || ''] || BookOpen;

                return (
                  <Link
                    key={category.id}
                    href={`/${lang}/interview-prep/category/${category.slug}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    <span className="absolute inset-x-0 top-0 h-1 bg-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div>
                      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-semibold">{name}</h3>
                      {desc && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{desc}</p>}
                    </div>
                    <div className="mt-6 flex items-center justify-between text-sm font-medium text-muted-foreground">
                      <span>{category._count.questions === 1 ? t('interview.questionOne') : t('interview.questionsCount', { count: category._count.questions })}</span>
                      <span className="inline-flex items-center gap-1 text-primary transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                        {t('interview.explore')}
                        <ArrowRight className="h-4 w-4 rtl-flip" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
