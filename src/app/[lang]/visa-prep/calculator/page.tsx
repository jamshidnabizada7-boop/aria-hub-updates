import React from 'react';
import { PageShell } from '@/components/site/page-shell';
import { db as prisma } from '@/lib/db';
import { CalculatorClient } from './calculator-client';
import { TranslatedText } from '@/components/ui/translated-text';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    en: 'Visa Cost Calculator & Expense Estimator | ARIA HUB',
    fa: 'محاسبه‌گر هزینه‌های ویزا و سفارت | ARIA HUB',
    ps: 'د ویزې او سفارت د لګښتونو محاسبه کوونکی | ARIA HUB',
  };
  const descriptions: Record<Lang, string> = {
    en: 'Estimate total visa application costs, government fees, medical exams, biometrics, and translation expenses with ARIA HUB interactive cost calculator.',
    fa: 'محاسبه دقیق تمامی هزینه‌های درخواست ویزا شامل فیس سفارت، معاینات صحی، بایومتریک و ترجمه اسناد با ابزار رایگان محاسبه‌گر هزینه در آریا هاب.',
    ps: 'د ویزې د غوښتنلیک ټول لګښتونه لکه د سفارت فیس، روغتیايي معاینات، بایومټریک او د اسنادو ژباړه د آریا هاب په وړیا محاسبه کوونکي کې اټکل کړئ.',
  };

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: titles[lang] || titles.en,
    description: descriptions[lang] || descriptions.en,
    alternates: {
      canonical: `/${lang}/visa-prep/calculator`,
      languages: {
        en: '/en/visa-prep/calculator',
        fa: '/fa/visa-prep/calculator',
        ps: '/ps/visa-prep/calculator',
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

export default async function VisaCostCalculatorPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  let countries: any[] = [];
  let categories: any[] = [];
  try {
    countries = await prisma.visaCountry.findMany({
      where: { status: 'published' },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        nameI18n: true,
        code: true,
        costEstimate: true,
      },
    });

    categories = await prisma.visaCategory.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameI18n: true,
        slug: true,
      },
    });
  } catch {
    countries = [];
    categories = [];
  }

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <div className="bg-slate-50 dark:bg-slate-950 py-12">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        
          {/* Header */}
          <div className="mb-8">
            <Link href={`/${lang}/visa-prep`}>
              <Button variant="ghost" className="mb-4 -ml-4 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Visa Prep
              </Button>
            </Link>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
              <TranslatedText tKey="visaPrep.calc.title" />
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
              <TranslatedText tKey="visaPrep.calc.subtitle" />
            </p>
          </div>

          {/* Client Calculator Tool */}
          <CalculatorClient 
            countries={countries} 
            categories={categories} 
            lang={lang} 
          />
        
        </div>
      </div>
    </PageShell>
  );
}
