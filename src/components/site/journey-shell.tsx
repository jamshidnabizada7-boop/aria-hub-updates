import type { ReactNode } from 'react';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from './navbar';
import { Footer } from './footer';

/** Shared public navigation for the applicant journey. */
export async function JourneyShell({ children }: { children: ReactNode }) {
  const data = await getSiteData();
  return <div className="journey min-h-screen bg-background">
    <Navbar menu={data.menu} languages={data.languages} siteName={data.settings?.siteName || 'ARIA HUB'} logoUrl={data.settings?.logoUrl ?? null} />
    <div className="pt-24">{children}</div>
    <Footer settings={data.settings} footer={data.footer} socialLinks={data.socialLinks} />
  </div>;
}
