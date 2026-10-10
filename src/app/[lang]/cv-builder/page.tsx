import { AriTip } from '@/components/site/ari/ari-tip';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getToolPageData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { CVBuilderClient } from './client';
import { isLang, type Lang } from '@/lib/lang-route';
import { getPageSeo } from '@/lib/seo-metadata';
import type { CVOutputLang, CVPurpose } from './types';
import { getCVBuilderConfig } from '@/lib/cv-builder-config.server';

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

function safeReturnTo(value: string | undefined, lang: Lang): string | undefined {
  if (!value) return undefined;
  const expectedPrefix = `/${lang}/`;
  return value.startsWith(expectedPrefix) && !value.startsWith('//') ? value : undefined;
}

export default async function CVBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ lang: rawLang }, query, data, cvConfig] = await Promise.all([params, searchParams, getToolPageData(), getCVBuilderConfig()]);
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  if (!cvConfig.enabled) notFound();

  const rawPurpose = typeof query.purpose === 'string' ? query.purpose : undefined;
  const requestedPurpose: CVPurpose | undefined =
    rawPurpose === 'professional' || rawPurpose === 'student' || rawPurpose === 'scholarship' ? rawPurpose : undefined;
  const initialPurpose: CVPurpose =
    requestedPurpose && cvConfig.purposes[requestedPurpose].enabled ? requestedPurpose : cvConfig.defaultPurpose;
  const outputLang: CVOutputLang = lang;
  const opportunitySlug = typeof query.opportunity === 'string' ? query.opportunity : undefined;
  const opportunityTitle = typeof query.title === 'string' ? query.title.slice(0, 180) : undefined;
  const returnTo = safeReturnTo(typeof query.returnTo === 'string' ? query.returnTo : undefined, lang);

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

      <main id="main-content" className="relative flex-1 overflow-x-hidden pb-16 pt-24 print:overflow-visible print:bg-white print:p-0">
        <div className="absolute inset-0 -z-10 overflow-hidden print:hidden" aria-hidden="true">
          <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/15 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/15 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-5xl px-4"><AriTip lang={lang} context="cv" /></div>
        <div data-clarity-mask="true">
          <CVBuilderClient
            initialLang={outputLang}
            initialPurpose={initialPurpose}
            initialTemplatesOpen={query.templates === '1'}
            config={cvConfig}
            source={opportunitySlug || opportunityTitle || returnTo ? { opportunitySlug, opportunityTitle, returnTo } : undefined}
          />
        </div>
      </main>

      <div className="print:hidden">
        <Footer settings={data.settings} footer={data.footer} socialLinks={data.socialLinks} />
      </div>
    </div>
  );
}
