import type { Metadata } from 'next';
import { Building2, FileText, PenLine, Send } from 'lucide-react';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { EmployerPostForm } from './employer-post-form';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';

import { getPageSeo } from '@/lib/seo-metadata';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('employersPost', lang);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/employers/post`,
      languages: {
        en: '/en/employers/post',
        fa: '/fa/employers/post',
        ps: '/ps/employers/post',
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

export default async function EmployerPostPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string) => translate(lang, key);
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
          <Building2
            aria-hidden="true"
            className="pointer-events-none absolute -end-8 -top-8 h-48 w-48 text-primary/[0.05]"
          />

          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
              {/* Introduction column */}
              <div className="lg:col-span-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('employers.post.eyebrow')}
                </div>
                <h1 dir="auto" className="mt-5 text-balance text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                  {t('employers.post.title')}
                </h1>
                <p dir="auto" className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                  {t('employers.post.subtitle')}
                </p>

                <ul className="mt-8 space-y-4">
                  {[PenLine, FileText, Send].map((Icon, idx) => {
                    const n = idx + 1;
                    return (
                      <li key={n} className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/15 to-chart-2/15 text-primary"
                        >
                          <Icon className="h-4.5 w-4.5 rtl:-scale-x-100" />
                        </span>
                        <span dir="auto" className="text-sm font-medium leading-relaxed text-foreground/90">
                          {t(`employers.step${n}.title`)} — {t(`employers.step${n}.body`)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <p dir="auto" className="mt-8 rounded-xl border border-border/60 bg-card/50 p-4 text-xs leading-relaxed text-muted-foreground">
                  {t('submit.privacy')}
                </p>
              </div>

              {/* Form column */}
              <div className="lg:col-span-3">
                <EmployerPostForm lang={lang} />
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
