import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  Languages,
  PenLine,
  Search,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { getSiteData } from '@/lib/get-site';
import { listOpportunities } from '@/lib/opportunity-queries';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
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
  const seo = getPageSeo('employers', lang);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/employers`,
      languages: {
        en: '/en/employers',
        fa: '/fa/employers',
        ps: '/ps/employers',
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

const BENEFITS = [
  { icon: Search, titleKey: 'employers.benefit1.title', bodyKey: 'employers.benefit1.body', tone: 'text-primary bg-primary/10' },
  { icon: Languages, titleKey: 'employers.benefit2.title', bodyKey: 'employers.benefit2.body', tone: 'text-chart-2 bg-chart-2/10' },
  { icon: CheckCircle2, titleKey: 'employers.benefit3.title', bodyKey: 'employers.benefit3.body', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
] as const;

const STEPS = [
  { icon: PenLine, titleKey: 'employers.step1.title', bodyKey: 'employers.step1.body' },
  { icon: FileText, titleKey: 'employers.step2.title', bodyKey: 'employers.step2.body' },
  { icon: Send, titleKey: 'employers.step3.title', bodyKey: 'employers.step3.body' },
] as const;

const FAQS = [
  { qKey: 'employers.faq1.q', aKey: 'employers.faq1.a' },
  { qKey: 'employers.faq2.q', aKey: 'employers.faq2.a' },
  { qKey: 'employers.faq3.q', aKey: 'employers.faq3.a' },
] as const;

export default async function EmployersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string, p?: Record<string, string | number>) => translate(lang, key, p);
  const data = await getSiteData();

  // Live stats for the credibility band (graceful on DB hiccups).
  let activeCount = 0;
  try {
    const result = await listOpportunities({ lang, page: 1, perPage: 1 });
    activeCount = result.total;
  } catch {
    activeCount = 0;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />

      <main id="main-content" className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-chart-2/10 blur-3xl" />
          </div>
          <Building2
            aria-hidden="true"
            className="pointer-events-none absolute -end-10 top-10 h-64 w-64 text-primary/[0.05]"
          />

          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                {t('employers.eyebrow')}
              </div>
              <h1 dir="auto" className="mt-6 text-balance text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                {t('employers.title')}
              </h1>
              <p dir="auto" className="mx-auto mt-5 max-w-2xl text-pretty leading-relaxed text-muted-foreground sm:text-lg">
                {t('employers.subtitle')}
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"><Link href={`/${lang}/employers/dashboard`} className="inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground">{lang==='fa'?'ورود یا ثبت سازمان':lang==='ps'?'ننوتل یا اداره ثبتول':'Employer login / register organization'}</Link>
                <Link
                  href={`/${lang}/employers/post`}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-chart-2 px-7 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:opacity-90"
                >
                  <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                  {t('employers.cta')}
                </Link>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('employers.ctaHint')}
                </span>
              </div>
            </div>

            {/* Stats band */}
            <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { value: activeCount, label: t('employers.stat.jobs'), icon: Sparkles },
                { value: 9, label: t('employers.stat.categories'), icon: FileText },
                { value: '100%', label: t('employers.stat.free'), icon: CheckCircle2 },
              ].map(({ value, label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur-sm"
                >
                  <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <dd className="text-2xl font-black tracking-tight" dir="ltr">
                      {value}
                    </dd>
                    <dt dir="auto" className="truncate text-xs font-medium text-muted-foreground">
                      {label}
                    </dt>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Benefits ─────────────────────────────────────────────────────── */}
        <section className="border-t border-border/50 bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, titleKey, bodyKey, tone }) => (
                <article
                  key={titleKey}
                  className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-float"
                >
                  <span aria-hidden="true" className={`grid h-12 w-12 place-items-center rounded-xl ${tone}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h2 dir="auto" className="mt-5 text-lg font-bold tracking-tight">
                    {t(titleKey)}
                  </h2>
                  <p dir="auto" className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(bodyKey)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
              {/* connector line (desktop) */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-16 top-7 hidden border-t-2 border-dashed border-border md:block rtl:border-x-transparent" />
              {STEPS.map(({ icon: Icon, titleKey, bodyKey }, i) => (
                <div key={titleKey} className="relative flex flex-col items-center text-center">
                  <span className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-float">
                    <Icon className="h-6 w-6 rtl:-scale-x-100" aria-hidden="true" />
                  </span>
                  <span className="absolute -top-2 z-20 grid h-6 w-6 place-items-center rounded-full border border-border bg-background text-[11px] font-black text-primary ltr:-right-2 rtl:-left-2">
                    {i + 1}
                  </span>
                  <h2 dir="auto" className="mt-5 text-base font-bold tracking-tight">
                    {t(titleKey)}
                  </h2>
                  <p dir="auto" className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {t(bodyKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="border-t border-border/50 bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 dir="auto" className="text-center text-2xl font-black tracking-tight sm:text-3xl">
              {t('employers.faqTitle')}
            </h2>
            <div className="mt-8 space-y-3">
              {FAQS.map(({ qKey, aKey }) => (
                <details
                  key={qKey}
                  className="group rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm transition-colors open:border-primary/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold [&::-webkit-details-marker]:hidden">
                    <span dir="auto">{t(qKey)}</span>
                    <span
                      aria-hidden="true"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p dir="auto" className="mt-3 border-t border-border/40 pt-3 text-sm leading-relaxed text-muted-foreground">
                    {t(aKey)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-16 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.07] via-transparent to-chart-2/[0.07]" />
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <Users aria-hidden="true" className="mx-auto h-10 w-10 text-primary/60" />
            <h2 dir="auto" className="mt-4 text-balance text-2xl font-black tracking-tight sm:text-3xl">
              {t('employers.cta')}
            </h2>
            <p dir="auto" className="mt-2 text-sm text-muted-foreground">
              {t('employers.ctaHint')}
            </p>
            <Link
              href={`/${lang}/employers/post`}
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-chart-2 px-8 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:opacity-90"
            >
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              {t('employers.post.title')}
            </Link>
            <p dir="auto" className="mt-8 text-sm text-muted-foreground">
              {t('employers.communityNote')}{' '}
              <Link href={`/${lang}/submit-opportunity`} className="font-semibold text-primary hover:underline">
                {t('employers.communityLink')}
              </Link>
            </p>
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
