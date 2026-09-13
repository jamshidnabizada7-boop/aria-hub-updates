import React from 'react';
import { PageShell } from '@/components/site/page-shell';
import { db as prisma } from '@/lib/db';
import { CalculatorClient } from './calculator-client';
import { TranslatedText } from '@/components/ui/translated-text';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Visa Cost Calculator | ARIA HUB',
  description: 'Calculate and estimate your total visa application costs, including medical, biometrics, and other fees.'
};

export default async function VisaCostCalculatorPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  const countries = await prisma.visaCountry.findMany({
    where: { status: 'published' },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      nameI18n: true,
      code: true,
      costEstimate: true,
    }
  });

  const categories = await prisma.visaCategory.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      nameI18n: true,
      slug: true,
    }
  });

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
