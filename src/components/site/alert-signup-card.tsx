'use client';

import { useState } from 'react';
import { BellRing, Loader2, Mail, MailCheck, Send } from 'lucide-react';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';

const FALLBACK_CATEGORIES = [
  'jobs',
  'scholarships',
  'internships',
  'competitions',
  'conferences',
  'volunteer',
  'exchange-programs',
  'training',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Email-alert signup card — captures new-opportunity alert subscriptions
 * (email + category + frequency). Delivery starts once SMTP is configured;
 * subscriptions are stored as leads in the meantime.
 */
export function AlertSignupCard({
  lang,
  initialCategory,
  className = '',
  /** Categories from the DB (opportunityCategory) — {slug, name already localized by the caller}. */
  categories,
}: {
  lang: Lang;
  /** Prefill from the listing's active category filter (slug or 'all'). */
  initialCategory?: string;
  className?: string;
  categories?: { slug: string; name: string }[];
}) {
  const categoryOptions =
    categories && categories.length
      ? categories
      : FALLBACK_CATEGORIES.map((slug) => ({ slug, name: slug }));
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState(
    initialCategory && categoryOptions.some((c) => c.slug === initialCategory)
      ? initialCategory
      : 'all'
  );
  const [frequency, setFrequency] = useState<'weekly' | 'daily'>('weekly');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const t = (key: string, p?: Record<string, string | number>) => translate(lang, key, p);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;

    if (!EMAIL_RE.test(email.trim())) {
      setStatus('error');
      setErrorMsg(t('alerts.invalidEmail'));
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          lang,
          categorySlug: category === 'all' ? '' : category,
          frequency,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'internal');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error && err.message === 'invalid_email'
          ? t('alerts.invalidEmail')
          : t('alerts.error')
      );
    }
  }

  const inputClasses =
    'h-11 w-full rounded-md border border-input bg-background/80 ps-10 pe-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

  if (status === 'success') {
    return (
      <section
        aria-live="polite"
        className={`relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-6 sm:p-8 print:hidden ${className}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-chart-2/[0.08]"
        />
        <div className="relative flex flex-col items-center gap-3 py-4 text-center">
          <span
            aria-hidden="true"
            className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary"
          >
            <MailCheck className="h-8 w-8" />
          </span>
          <p dir="auto" className="text-lg font-bold">
            {t('alerts.success')}
          </p>
          {/* Double opt-in: the confirmation step is the primary message */}
          <p
            dir="auto"
            className="max-w-md rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground"
          >
            {t('alerts.checkInbox')}
          </p>
          <p dir="auto" className="max-w-md text-sm text-muted-foreground">
            {t('alerts.successHint')}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={t('alerts.title')}
      className={`relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8 print:hidden ${className}`}
    >
      {/* Decorative gradient wash + bell watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-chart-2/[0.07]"
      />
      <BellRing
        aria-hidden="true"
        className="pointer-events-none absolute -end-6 -top-6 h-32 w-32 text-primary/[0.07]"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Copy */}
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {t('alerts.eyebrow')}
          </p>
          <h2 dir="auto" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('alerts.title')}
          </h2>
          <p dir="auto" className="mt-2 text-sm text-muted-foreground sm:text-base">
            {t('alerts.subtitle')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-md lg:w-[26rem]" noValidate>
          {/* Honeypot — hidden from users, irresistible to bots */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          <div className="relative">
            <Mail
              className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('alerts.emailPlaceholder')}
              aria-label={t('alerts.emailPlaceholder')}
              dir="ltr"
              required
              className={inputClasses}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label={t('alerts.categoryLabel')}
                className="h-10 w-full appearance-none rounded-md border border-input bg-background/80 px-3 pe-8 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="all">{t('alerts.allCategories')}</option>
                {categoryOptions.map(({ slug, name }) => {
                  // Prefer the static i18n key, then the caller-localized name.
                  const label = translate(
                    lang,
                    `opportunities.${slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}`
                  );
                  return (
                    <option key={slug} value={slug}>
                      {label.startsWith('opportunities.') ? name : label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="relative">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'weekly' | 'daily')}
                aria-label={t('alerts.frequencyLabel')}
                className="h-10 w-full appearance-none rounded-md border border-input bg-background/80 px-3 pe-8 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="weekly">{t('alerts.weekly')}</option>
                <option value="daily">{t('alerts.daily')}</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {t('alerts.subscribe')}
          </button>

          {status === 'error' && (
            <p dir="auto" role="alert" className="mt-2 text-sm font-medium text-destructive">
              {errorMsg}
            </p>
          )}

          <p dir="auto" className="mt-2.5 text-xs text-muted-foreground">
            {t('alerts.privacy')}
          </p>
        </form>
      </div>
    </section>
  );
}
