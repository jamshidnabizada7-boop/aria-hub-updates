import { PageBackLink } from '@/components/site/page-navigation';
import { PageShell } from '@/components/site/page-shell';
import PracticeSetupClient from './practice-client';
import { translate } from '@/lib/i18n';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = (key: string) => translate(lang, key);
  return {
    title: `${t('interview.setupTitle')} | ARIA HUB`,
    description: t('interview.setupSubtitle'),
    robots: { index: false },
  };
}

export default async function InterviewPracticePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <div className="mx-auto mb-6 w-full max-w-7xl px-4 sm:px-6 print:hidden"><PageBackLink lang={lang} to="interview" className="mb-5" /></div>
      <PracticeSetupClient />
    </PageShell>
  );
}
