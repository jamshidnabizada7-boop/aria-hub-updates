import type { Metadata } from 'next';
import { PageShell } from '@/components/site/page-shell';
import { StaticDocView } from '@/components/site/static-doc-view';
import { PARTNERS_DOC } from '@/lib/growth-page-content';
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
  const seo = getPageSeo('partners', lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/partners`,
      languages: {
        en: '/en/partners',
        fa: '/fa/partners',
        ps: '/ps/partners',
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

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const safeLang: Lang = isLang(lang) ? lang : 'fa';
  const { title, dbHtml } = await loadGrowthPage('partners', safeLang, PARTNERS_DOC);

  return (
    <PageShell lang={safeLang} backTo="home">
      <StaticDocView doc={PARTNERS_DOC} lang={safeLang} title={title} dbHtml={dbHtml} />
    </PageShell>
  );
}
