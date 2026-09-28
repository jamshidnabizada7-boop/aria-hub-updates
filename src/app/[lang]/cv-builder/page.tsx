import type { Metadata } from 'next';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { CVBuilderClient } from './client';
import { isLang, type Lang } from '@/lib/lang-route';
import { getPageSeo } from '@/lib/seo-metadata';

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
  const seo = getPageSeo('cvBuilder', lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/cv-builder`,
      languages: {
        en: '/en/cv-builder',
        fa: '/fa/cv-builder',
        ps: '/ps/cv-builder',
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

export default async function CVBuilderPage() {
  const data = await getSiteData();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <div className="print:hidden">
        <Navbar
          menu={data.menu}
          languages={data.languages}
          siteName={data.settings?.siteName || 'ARIA HUB'}
          logoUrl={data.settings?.logoUrl ?? null}
        />
      </div>
      <main className="flex-1 pt-24 pb-20 relative overflow-hidden print:pt-0 print:pb-0">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 print:hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[100px]" />
        </div>

        <CVBuilderClient settings={data.settings} />
      </main>
      <div className="print:hidden">
        <Footer
          settings={data.settings}
          footer={data.footer}
          socialLinks={data.socialLinks}
        />
      </div>
    </div>
  );
}
