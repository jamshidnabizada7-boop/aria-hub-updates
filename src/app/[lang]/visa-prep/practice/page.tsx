import { db as prisma } from '@/lib/db';
import { PageShell } from '@/components/site/page-shell';
import VisaPracticeSetup from './setup-client';
import { Suspense } from 'react';

export const metadata = {
  title: 'Setup Visa Interview Practice | ARIA HUB',
  description: 'Configure your AI mock visa interview.'
};

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
