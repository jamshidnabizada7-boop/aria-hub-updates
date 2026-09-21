import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Tag } from 'lucide-react';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { CookieBanner } from '@/components/site/cookie-banner';
import { ScrollToTop } from '@/components/site/scroll-to-top';
import { Icon } from '@/components/site/icon';
import { translate } from '@/lib/i18n';
import { getLocalizedContent } from '@/lib/i18n-content';
import { isLang, type Lang } from '@/lib/lang-route';
import { stripHtml } from '@/lib/import/utils';
import type { Service } from '@/lib/types';

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const title = translate(lang, 'services.title');
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: `${title} | ARIA HUB`,
    description: translate(lang, 'services.subtitle'),
    alternates: {
      canonical: `/${lang}/services`,
      languages: {
        en: '/en/services',
        fa: '/fa/services',
        ps: '/ps/services',
      },
    },
    openGraph: {
      title: `${title} | ARIA HUB`,
      description: translate(lang, 'services.subtitle'),
      locale: lang,
      type: 'website',
    },
  };
}

/**
 * Services directory — server-rendered from the DB.
 *
 * Each service card carries an anchor id (= service slug, e.g.
 * #translation-services) so navbar dropdown children can deep-link straight
 * to a service. No pagination query params → the old `?page=abc` Prisma
 * NaN-skip 500 is structurally impossible now.
 */
export default async function ServicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string, p?: Record<string, string | number>) =>
    translate(lang, key, p);

  const data = await getSiteData();
  const services: Service[] = data.services;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />

      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t('services.eyebrow')}
            </p>
            <h1 dir="auto" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t('services.title')}
            </h1>
            <p dir="auto" className="mt-3 text-base text-muted-foreground sm:text-lg">
              {t('services.subtitle')}
            </p>
          </div>

          {/* Services grid — anchor per slug */}
          {services.length === 0 ? (
            <div className="mt-12 grid place-items-center rounded-xl border border-dashed py-16 text-muted-foreground">
              {t('empty.services')}
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer
        settings={data.settings}
        footer={data.footer}
        socialLinks={data.socialLinks}
      />
      <ScrollToTop />
      <CookieBanner />
    </div>
  );
}

function ServiceCard({ service, lang }: { service: Service; lang: Lang }) {
  const t = (key: string, p?: Record<string, string | number>) =>
    translate(lang, key, p);

  const title = getLocalizedContent(
    service.title,
    service.titleI18n as Record<string, string> | null,
    lang
  );
  const excerpt = getLocalizedContent(
    service.excerpt,
    service.excerptI18n as Record<string, string> | null,
    lang
  );
  const description = stripHtml(
    getLocalizedContent(
      service.description,
      service.descriptionI18n as Record<string, string> | null,
      lang
    )
  );

  return (
    <article
      id={service.slug}
      className="group flex h-full scroll-mt-28 flex-col rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-float"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-float"
          >
            <Icon name={service.icon} className="h-5 w-5" />
          </span>
          <h2
            dir="auto"
            className="text-lg font-bold leading-snug transition-colors group-hover:text-primary"
          >
            {title}
          </h2>
        </div>
        {service.price && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            <Tag className="h-3 w-3" aria-hidden="true" />
            {service.price}
          </span>
        )}
      </div>

      {excerpt && (
        <p dir="auto" className="mt-4 text-sm font-medium text-foreground/80">
          {excerpt}
        </p>
      )}

      {description && (
        <p
          dir="auto"
          className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground line-clamp-8"
        >
          {description}
        </p>
      )}

      <div className="mt-5 border-t border-border/50 pt-4">
        <Link
          href={`/${lang}/contact`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:underline"
        >
          {t('common.bookCall')}
          <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
