import type { Metadata } from 'next';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';
import { TrackForm } from './track-form';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = (isLang(raw) ? raw : 'fa') as Lang;
  return {
    title: `${translate(lang, 'track.title')} | ARIA HUB`,
    description: translate(lang, 'track.subtitle'),
    alternates: {
      canonical: `/${lang}/track`,
      languages: { en: '/en/track', fa: '/fa/track', ps: '/ps/track' },
    },
  };
}

export default async function TrackSubmissionPage({ params }: { params: Promise<{ lang: string }> }) {
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
      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto w-full max-w-2xl px-4">
          {/* Header */}
          <div className="text-center">
            <span
              aria-hidden="true"
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-chart-2/15 text-primary shadow-inner"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" />
                <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 dir="auto" className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              {translate(lang, 'track.title')}
            </h1>
            <p dir="auto" className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              {translate(lang, 'track.subtitle')}
            </p>
          </div>

          <TrackForm lang={lang} />
        </div>
      </main>
      <Footer
        settings={data.settings}
        footer={data.footer}
        socialLinks={data.socialLinks}
      />
    </div>
  );
}
