import type { Metadata } from 'next';
import { PageShell } from '@/components/site/page-shell';
import { ContactSection } from '@/components/site/sections/contact';
import { getSiteData } from '@/lib/get-site';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';

const SITE_URL = 'https://www.myariahub.com';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string) => translate(lang, key);

  return {
    title: `${t('contact.title')} | ARIA HUB`,
    description: t('contact.subtitle'),
    alternates: {
      canonical: `/${lang}/contact`,
      languages: {
        en: `/en/contact`,
        fa: `/fa/contact`,
        ps: `/ps/contact`,
      },
    },
  };
}

/**
 * Contact page — fully trilingual (contact.* i18n keys) and DB-driven:
 * site settings provide the address/phone/email, Branch + Department rows
 * (managed in the admin panel) power the "find us" panels.
 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';

  const data = await getSiteData();

  return (
    <PageShell lang={lang} className="pb-20">
      {/* Trilingual, DB-driven contact section (heading + form + departments + branches) */}
      <ContactSection
        settings={data.settings}
        departments={data.departments}
        branches={data.branches}
        lang={lang}
      />
    </PageShell>
  );
}
