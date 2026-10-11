import { AriPageTip } from './ari/ari-tip';
import type { ReactNode } from 'react';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { isLang, type Lang } from '@/lib/lang-route';

/**
 * PageShell — shared server-rendered chrome (DB-driven Navbar + Footer) for
 * standalone page families that previously rendered without any navigation
 * (about, contact, blog, legal pages, interview-prep, visa-prep, templates).
 *
 * A visitor landing on any of these from Google now gets the full site
 * navigation, language switcher, and footer — critical for SEO, AdSense
 * review, and keeping one-off visitors in the site loop.
 */
export async function PageShell({
  lang,
  children,
  className = 'pt-24 pb-16',
}: {
  lang: string;
  children: ReactNode;
  /** main padding classes — override when a page manages its own top spacing */
  className?: string;
}) {
  const l: Lang = isLang(lang) ? lang : 'fa';
  const data = await getSiteData();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="print:hidden"><Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      /></div>
      <main id="main-content" className={`flex-1 ${className}`}>{children}<AriPageTip lang={l} /></main>
      <div className="print:hidden"><Footer settings={data.settings} footer={data.footer} socialLinks={data.socialLinks} /></div>
    </div>
  );
}
