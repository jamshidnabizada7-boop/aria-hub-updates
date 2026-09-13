import { PageShell } from '@/components/site/page-shell';
import TemplatesClient from './templates-client';

export default async function TemplatesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <TemplatesClient />
    </PageShell>
  );
}
