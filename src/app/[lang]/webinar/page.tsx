import type { Metadata } from 'next';
import { PageShell } from '@/components/site/page-shell';
import { StaticDocView } from '@/components/site/static-doc-view';
import { WebinarRegisterForm } from '@/components/site/webinar-register-form';
import { WEBINAR_DOC } from '@/lib/growth-page-content';
import { isLang, type Lang } from '@/lib/lang-route';
import { getPageSeo } from '@/lib/seo-metadata';
import { loadGrowthPage } from '@/lib/growth-page-load';

export const revalidate = 1800;

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'fa' }, { lang: 'ps' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('webinar', lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/webinar`,
      languages: {
        en: '/en/webinar',
        fa: '/fa/webinar',
        ps: '/ps/webinar',
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

export default async function WebinarPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const safeLang: Lang = isLang(lang) ? lang : 'fa';
  const { title, dbHtml } = await loadGrowthPage('webinar', safeLang, WEBINAR_DOC);

  return (
    <PageShell lang={safeLang} backTo="home">
      <StaticDocView doc={WEBINAR_DOC} lang={safeLang} title={title} dbHtml={dbHtml} />
      <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8" dir="auto">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm backdrop-blur-sm md:p-8">
          <WebinarRegisterForm />
        </div>
      </div>
    </PageShell>
  );
}
