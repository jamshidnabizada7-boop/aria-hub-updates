import { db as prisma } from '@/lib/db';
import { PageShell } from '@/components/site/page-shell';
import VisaPracticeSetup from './setup-client';
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { isLang, type Lang } from '@/lib/lang-route';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const titles: Record<Lang, string> = {
    en: 'AI Visa Interview Practice Simulator | ARIA HUB',
    fa: 'شبیه‌ساز مصاحبه ویزا با هوش مصنوعی | ARIA HUB',
    ps: 'د هوښیار مصنوعي استخباراتو ویزه مرکه | ARIA HUB',
  };
  const descriptions: Record<Lang, string> = {
    en: 'Practice answering challenging visa interview questions with interactive AI simulation and instant feedback tailored to your destination country.',
    fa: 'مهارت‌های مصاحبه سفارت خود را با شبیه‌ساز صوتی و هوش مصنوعی آریا هاب بسنجید و بازخورد اختصاصی بر اساس کشور مقصد خود دریافت کنید.',
    ps: 'د آریا هاب په مصنوعي استخباراتو سمبال شبیه ساز سره د ویزې مرکو پوښتنو ته تمرین وکړئ او د خپل ټاکل شوي هیواد لپاره فوري ارزونه ترلاسه کړئ.',
  };

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: titles[lang] || titles.en,
    description: descriptions[lang] || descriptions.en,
    alternates: {
      canonical: `/${lang}/visa-prep/practice`,
      languages: {
        en: '/en/visa-prep/practice',
        fa: '/fa/visa-prep/practice',
        ps: '/ps/visa-prep/practice',
      },
    },
    openGraph: {
      title: titles[lang] || titles.en,
      description: descriptions[lang] || descriptions.en,
      locale: lang,
      type: 'website',
    },
  };
}

export default async function VisaPracticePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  const countries = await prisma.visaCountry.findMany({
    where: { status: 'published' },
    orderBy: { order: 'asc' }
  });

  const categories = await prisma.visaCategory.findMany({
    orderBy: { order: 'asc' }
  });

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <div className="bg-slate-50 dark:bg-slate-950 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <Suspense fallback={<div>Loading setup...</div>}>
            <VisaPracticeSetup countries={countries} categories={categories} lang={lang} />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
