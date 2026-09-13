import { PageShell } from '@/components/site/page-shell';
import InterviewSessionClient from './session-client';

export const metadata = {
  title: 'AI Interview Session | ARIA HUB',
  robots: { index: false },
};

export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <InterviewSessionClient lang={lang} />
    </PageShell>
  );
}
