import { PageBackLink } from '@/components/site/page-navigation';
import type { Metadata } from 'next';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';
import { SavedOpportunities } from './saved-list';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = (isLang(raw) ? raw : 'fa') as Lang;
  return {
    title: `${translate(lang, 'opportunities.saved')} | ARIA HUB`,
    robots: { index: false }, // personal, localStorage-driven page
  };
}

export default async function SavedOpportunitiesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = (isLang(raw) ? raw : 'fa') as Lang;
  const data = await getSiteData();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />
      <main id="main-content" className="flex-1 pt-24 pb-20">
      <div className="mx-auto mb-6 w-full max-w-7xl px-4 sm:px-6 print:hidden"><PageBackLink lang={lang} to="opportunities" className="mb-5" /></div>
        <SavedOpportunities lang={lang} />
      </main>
      <Footer
        settings={data.settings}
        footer={data.footer}
        socialLinks={data.socialLinks}
      />
    </div>
  );
}
