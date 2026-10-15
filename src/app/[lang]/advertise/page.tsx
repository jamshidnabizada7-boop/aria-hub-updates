import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Banknote, Briefcase, CalendarCheck2,
  CreditCard, Globe2, Handshake, Hourglass, Landmark,
  Mail, Megaphone, MessageCircle, MousePointerClick, Send, Sparkles,
  Wallet, Zap,
} from 'lucide-react';
import { getSiteData } from '@/lib/get-site';
import { listOpportunities } from '@/lib/opportunity-queries';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { FollowChannelsBand } from '@/components/site/follow-channels-band';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';
import {
  PRODUCT_CATALOG, FEATURED_PRODUCTS, PROMO_PRODUCTS,
  LOCAL_RAILS, INTL_RAILS,
} from '@/lib/monetization';
import { toEasternDigits } from '@/lib/date-format';
import { AdvertiseOrderForm } from './order-form';

export const revalidate = 3600;

const RAIL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hawala: Handshake,
  afg_pay: Wallet,
  hesab_pay: MessageCircle,
  bank: Landmark,
  cash: Banknote,
  payoneer: Globe2,
  wise: CreditCard,
};

function fmtAfn(n: number, lang: Lang): string {
  const s = n.toLocaleString('en-US');
  return lang === 'en' ? s : toEasternDigits(s, lang);
}

import { getPageSeo } from '@/lib/seo-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('advertise', lang);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/advertise`,
      languages: { en: '/en/advertise', fa: '/fa/advertise', ps: '/ps/advertise' },
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      locale: lang,
      type: 'website',
    },
  };
}

export default async function AdvertisePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string, p?: Record<string, string | number>) => translate(lang, key, p);
  const data = await getSiteData();

  let activeCount = 0;
  try {
    const result = await listOpportunities({ lang, page: 1, perPage: 1 });
    activeCount = result.total;
  } catch {
    activeCount = 0;
  }

  const priceCard = (key: (typeof FEATURED_PRODUCTS)[number] | (typeof PROMO_PRODUCTS)[number]) => {
    const def = PRODUCT_CATALOG[key];
    const popular = key === 'featured_7d';
    return (
      <div
        key={key}
        className={`relative flex flex-col rounded-2xl border bg-card p-6 transition-shadow hover:shadow-float ${
          popular ? 'border-primary/50 shadow-float' : ''
        }`}
      >
        {popular ? (
          <span className="absolute -top-3 end-4 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('advertise.popular')}
          </span>
        ) : null}
        <h3 className="text-base font-bold leading-snug" dir="auto">
          {t(`advertise.products.${key}.name`)}
        </h3>
        <div className="mt-3 flex items-baseline gap-2" dir={lang === 'en' ? 'ltr' : 'rtl'}>
          <span className="text-3xl font-black tracking-tight text-primary">${def.usd}</span>
          <span className="text-sm font-semibold text-muted-foreground">
            · {fmtAfn(def.afn, lang)} AFN
          </span>
        </div>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground" dir="auto">
          {t(`advertise.products.${key}.desc`)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium">
            <Hourglass className="h-3 w-3" aria-hidden="true" />
            {def.days === 1 ? '24h' : `${def.days}d`}
          </span>
          {def.telegram ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-2/10 px-2.5 py-1 font-medium text-chart-2">
              <Send className="h-3 w-3" aria-hidden="true" />
              {t('advertise.includesTelegram')}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const railCard = (key: (typeof LOCAL_RAILS)[number] | (typeof INTL_RAILS)[number]) => {
    const Icon = RAIL_ICONS[key] || CreditCard;
    return (
      <div key={key} className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold" dir="auto">{t(`advertise.pay.${key}.name`)}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground" dir="auto">
            {t(`advertise.pay.${key}.desc`)}
          </p>
        </div>
      </div>
    );
  };

  const STEPS = [
    { icon: MousePointerClick, t: 'advertise.step1t', b: 'advertise.step1b' },
    { icon: Wallet, t: 'advertise.step2t', b: 'advertise.step2b' },
    { icon: Mail, t: 'advertise.step3t', b: 'advertise.step3b' },
    { icon: Zap, t: 'advertise.step4t', b: 'advertise.step4b' },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />

      <main id="main-content" className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-chart-2/10 blur-3xl" />
          </div>
          <Megaphone
            aria-hidden="true"
            className="pointer-events-none absolute -end-10 top-10 h-64 w-64 text-primary/[0.05]"
          />

          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                {t('advertise.eyebrow')}
              </div>
              <h1 dir="auto" className="mt-6 text-balance text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                {t('advertise.title')}
              </h1>
              <p dir="auto" className="mx-auto mt-5 max-w-2xl text-pretty leading-relaxed text-muted-foreground sm:text-lg">
                {t('advertise.subtitle')}
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: EyeIcon, value: activeCount ? `${fmtAfn(activeCount, lang)}` : '', label: t('advertise.stat1') },
                { icon: Send, value: lang === 'en' ? 'EN · FA · PS' : '۳', label: t('advertise.stat2') },
                { icon: Hourglass, value: lang === 'en' ? 'Typical review: days' : 'کتنه: ورځې', label: t('advertise.stat3') },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl border bg-card/80 p-5 text-center shadow-sm">
                  <s.icon className="mx-auto h-5 w-5 text-chart-2" aria-hidden="true" />
                  <p dir={lang === 'en' ? 'ltr' : 'rtl'} className="mt-2 text-2xl font-black tracking-tight">{s.value}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="border-y bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 dir="auto" className="text-center text-2xl font-black tracking-tight sm:text-3xl">
              {t('advertise.sectionSteps')}
            </h2>
            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={i} className="relative rounded-2xl border bg-card p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground">
                    <s.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 dir="auto" className="mt-4 text-sm font-bold">{t(s.t)}</h3>
                  <p dir="auto" className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(s.b)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Rate card ────────────────────────────────────────────────── */}
        <section id="rates" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 dir="auto" className="text-2xl font-black tracking-tight sm:text-3xl">
                {t('advertise.sectionRates')}
              </h2>
              <p dir="auto" className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t('advertise.ratesSub')}
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURED_PRODUCTS.map((k) => priceCard(k))}
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PROMO_PRODUCTS.map((k) => priceCard(k))}
            </div>

            <p dir="auto" className="mx-auto mt-8 max-w-3xl rounded-xl border border-dashed bg-muted/40 px-5 py-4 text-center text-xs leading-relaxed text-muted-foreground">
              {t('advertise.disclaimer')}
            </p>
          </div>
        </section>

        {/* ── Payment rails ────────────────────────────────────────────── */}
        <section id="payments" className="border-y bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 dir="auto" className="text-2xl font-black tracking-tight sm:text-3xl">
                {t('advertise.sectionPay')}
              </h2>
              <p dir="auto" className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t('advertise.paySub')}
              </p>
            </div>
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Banknote className="h-4 w-4 text-chart-2" aria-hidden="true" />
                  {t('advertise.localTitle')}
                </h3>
                <div className="mt-4 grid gap-3">
                  {LOCAL_RAILS.map((k) => railCard(k))}
                </div>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t('advertise.intlTitle')}
                </h3>
                <div className="mt-4 grid gap-3">
                  {INTL_RAILS.map((k) => railCard(k))}
                </div>
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.06] p-4 text-xs leading-relaxed text-muted-foreground" dir="auto">
                  {t('advertise.success.body')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Order form ───────────────────────────────────────────────── */}
        <section id="order" className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 dir="auto" className="text-2xl font-black tracking-tight sm:text-3xl">
                {t('advertise.sectionForm')}
              </h2>
              <p dir="auto" className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t('advertise.formSub')}
              </p>
            </div>
            <div className="mt-10">
              <AdvertiseOrderForm lang={lang} />
            </div>
          </div>
        </section>

        {/* ── Channels band ───────────────────────────────────────────── */}
        {data.socialLinks?.length ? (
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
            <FollowChannelsBand lang={lang} socialLinks={data.socialLinks.map((l) => ({ platform: l.platform, label: l.label ?? '', url: l.url }))} />
          </section>
        ) : null}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border bg-gradient-to-br from-primary to-chart-2 p-8 text-white shadow-premium sm:p-12">
            <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-10" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 dir="auto" className="text-2xl font-black tracking-tight sm:text-3xl">
                  {t('advertise.ctaTitle')}
                </h2>
                <p dir="auto" className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                  {t('advertise.ctaBody')}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href={`/${lang}/contact`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-primary shadow-float transition-opacity hover:opacity-90"
                >
                  <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                  {t('advertise.ctaButton')}
                </Link>
                <Link
                  href={`/${lang}/employers`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
                >
                  <Briefcase className="h-4 w-4" aria-hidden="true" />
                  {translate(lang, 'employers.title')}
                </Link>
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
