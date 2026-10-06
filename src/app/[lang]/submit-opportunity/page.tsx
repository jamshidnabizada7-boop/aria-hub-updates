import type { Metadata } from 'next';
import Link from 'next/link';
import { PenLine, ShieldCheck, Clock3, Globe2, Briefcase } from 'lucide-react';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { SubmitOpportunityForm } from './submit-form';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';

export const revalidate = 3600;

import { getPageSeo } from '@/lib/seo-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('submitOpportunity', lang);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/submit-opportunity`,
      languages: {
        en: '/en/submit-opportunity',
        fa: '/fa/submit-opportunity',
        ps: '/ps/submit-opportunity',
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

const HIGHLIGHTS = [
  {
    icon: Clock3,
    // "Reviewed within 24 hours"
    en: 'Reviewed within 24 hours by our editorial team',
    fa: 'توسط تیم تحریریه ما در ۲۴ ساعت بررسی می‌شود',
    ps: 'زموږ د تحریریې ټیم لخوا په ۲۴ ساعتو کې بیاکتنه کیږي',
  },
  {
    icon: Globe2,
    en: 'Approved submissions are translated into Farsi and Pashto',
    fa: 'ارسال‌های تأییدشده به فارسی و پشتو ترجمه می‌شوند',
    ps: 'تصویب شوې لیږنې دري او پښتو ته ژباړل کیږي',
  },
  {
    icon: ShieldCheck,
    en: 'Free for NGOs, employers and community members',
    fa: 'برای سازمان‌های غیردولتی، کارفرمایان و اعضای جامعه رایگان است',
    ps: 'د نادولتي ادارو، کارګمارونکو او د ټولنې غړو لپاره وړیا ده',
  },
] as const;

export default async function SubmitOpportunityPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string, p?: Record<string, string | number>) => translate(lang, key, p);
  const data = await getSiteData();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />

      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden py-14 sm:py-20">
          {/* soft background accents */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-chart-2/10 blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
              {/* Introduction column */}
              <div className="lg:col-span-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                  <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('submit.eyebrow')}
                </div>
                <h1 dir="auto" className="mt-5 text-balance text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                  {t('submit.title')}
                </h1>
                <p dir="auto" className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                  {t('submit.subtitle')}
                </p>

                <ul className="mt-8 space-y-4">
                  {HIGHLIGHTS.map(({ icon: Icon, ...texts }) => (
                    <li key={texts.en} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/15 to-chart-2/15 text-primary"
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span dir="auto" className="text-sm font-medium leading-relaxed text-foreground/90">
                        {texts[lang]}
                      </span>
                    </li>
                  ))}
                </ul>

                <p dir="auto" className="mt-8 rounded-xl border border-border/60 bg-card/50 p-4 text-xs leading-relaxed text-muted-foreground">
                  {t('submit.privacy')}
                </p>

                {/* Employer lane cross-link */}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
                  <div>
                    <p dir="auto" className="text-sm font-semibold text-primary">
                      {t('employers.eyebrow')}
                    </p>
                    <p dir="auto" className="mt-0.5 text-xs text-muted-foreground">
                      {t('employers.communityNote')}
                    </p>
                  </div>
                  <Link
                    href={`/${lang}/employers/post`}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-chart-2 px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                  >
                    <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('employers.post.title')}
                  </Link>
                </div>
              </div>

              {/* Form column */}
              <div className="lg:col-span-3">
                <SubmitOpportunityForm lang={lang} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer
        settings={data.settings}
        footer={data.footer}
        socialLinks={data.socialLinks}
      />
    </div>
  );
}
