import { TranslatedText } from '@/components/ui/translated-text';
import { PageShell } from '@/components/site/page-shell';
import { Button } from '@/components/ui/button';
import { Globe, Plane, Map, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { db as prisma } from '@/lib/db';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';

import type { Metadata } from 'next';
import { getPageSeo } from '@/lib/seo-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('visaPrep', lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/visa-prep`,
      languages: {
        en: '/en/visa-prep',
        fa: '/fa/visa-prep',
        ps: '/ps/visa-prep',
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

export default async function VisaPrepPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string) => translate(lang, key);
  
  const countries = await prisma.visaCountry.findMany({
    where: { status: 'published' },
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { questions: true, documents: true }
      }
    }
  });

  return (
    <PageShell lang={lang} className="pb-16">
      <div className="bg-slate-50 dark:bg-slate-950">
        {/* Hero Section */}
        <div className="bg-primary px-4 py-20 text-center text-primary-foreground md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1544252890-0909f2d1252f?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
          <div className="mx-auto max-w-4xl space-y-6 relative z-10">
            <div className="inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-sm font-medium backdrop-blur-sm">
              <Plane className="mr-2 h-4 w-4" /> {t('visaPrep.badge')}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              <TranslatedText tKey="visaPrep.title" />
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80 sm:text-xl">
              <TranslatedText tKey="visaPrep.subtitle" />
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="font-bold">
                <Link href={`/${lang}/visa-prep/practice`}>
                  <TranslatedText tKey="visaPrep.practice" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent font-bold text-primary-foreground hover:bg-primary-foreground hover:text-primary border-primary-foreground/30 hover:border-primary-foreground">
                <Link href={`/${lang}/visa-prep/calculator`}>
                  <TranslatedText tKey="visaPrep.calculator" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Global Utilities */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 -mt-8 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href={`/${lang}/visa-prep/calculator`} className="flex items-center gap-4 rounded-xl bg-card p-6 shadow-md transition-transform hover:-translate-y-1">
              <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-500"><Map className="h-6 w-6" /></div>
              <div>
                <h3 className="font-bold"><TranslatedText tKey="visaPrep.calculator" /></h3>
                <p dir="auto" className="text-sm text-muted-foreground">{t('visaPrep.calcDesc')}</p>
              </div>
            </Link>
            <Link href={`/${lang}/visa-prep/community`} className="flex items-center gap-4 rounded-xl bg-card p-6 shadow-md transition-transform hover:-translate-y-1">
              <div className="rounded-lg bg-blue-500/10 p-3 text-blue-500"><FileText className="h-6 w-6" /></div>
              <div>
                <h3 className="font-bold"><TranslatedText tKey="visaPrep.community" /></h3>
                <p dir="auto" className="text-sm text-muted-foreground">{t('visaPrep.communityDesc')}</p>
              </div>
            </Link>
            <Link href={`/${lang}/interview-prep/community`} className="flex items-center gap-4 rounded-xl bg-card p-6 shadow-md transition-transform hover:-translate-y-1">
              <div className="rounded-lg bg-red-500/10 p-3 text-red-500"><ShieldAlert className="h-6 w-6" /></div>
              <div>
                <h3 className="font-bold">{t('visaPrep.rejections')}</h3>
                <p dir="auto" className="text-sm text-muted-foreground">{t('visaPrep.rejectionsDesc')}</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Countries Grid */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              <TranslatedText tKey="visaPrep.countries" />
            </h2>
            <p dir="auto" className="mt-2 text-muted-foreground">{t('visaPrep.selectCountry')}</p>
          </div>

          {countries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
              <p dir="auto" className="text-muted-foreground">{t('visaPrep.empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {countries.map((country) => {
                const name = typeof country.nameI18n === 'object' && country.nameI18n !== null && (country.nameI18n as any)[lang] ? (country.nameI18n as any)[lang] : country.name;
              
                return (
                  <Link key={country.id} href={`/${lang}/visa-prep/${country.code.toLowerCase()}`} className="group relative flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
                    <div>
                      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Globe className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold">{name}</h3>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>{t('visaPrep.processing')}: {country.processingTime || '—'}</p>
                        <p>{t('visaPrep.costLabel')}: {country.costEstimate || '—'}</p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-sm font-medium text-muted-foreground border-t pt-4">
                      <span dir="auto">{country._count.questions} {t('visaPrep.qsShort')} • {country._count.documents} {t('visaPrep.docsShort')}</span>
                      <span className="text-primary group-hover:translate-x-1 transition-transform"><ArrowRight className="h-4 w-4"/></span>
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
