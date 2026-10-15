'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Search,
  Send,
} from 'lucide-react';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';

const CATEGORIES = [
  { slug: 'jobs', key: 'opportunities.jobs' },
  { slug: 'scholarships', key: 'opportunities.scholarships' },
  { slug: 'internships', key: 'opportunities.internships' },
  { slug: 'fellowships', key: 'opportunities.fellowships' },
  { slug: 'competitions', key: 'opportunities.competitions' },
  { slug: 'conferences', key: 'opportunities.conferences' },
  { slug: 'volunteer', key: 'opportunities.volunteer' },
  { slug: 'exchange-programs', key: 'opportunities.exchangePrograms' },
  { slug: 'training', key: 'opportunities.training' },
] as const;

const inputClasses =
  'h-11 w-full rounded-xl border border-border bg-background/80 px-4 text-sm text-foreground shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const labelClasses = 'mb-1.5 block text-sm font-semibold';

export function SubmitOpportunityForm({ lang }: { lang: Lang }) {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    setStatus('submitting');
    setError('');
    try {
      const res = await fetch('/api/opportunities/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fd.get('title'),
          organization: fd.get('organization'),
          categorySlug: fd.get('categorySlug'),
          country: fd.get('country'),
          deadline: fd.get('deadline'),
          applyUrl: fd.get('applyUrl'),
          applyEmail: fd.get('applyEmail'),
          description: fd.get('description'),
          contactName: fd.get('contactName'),
          contactEmail: fd.get('contactEmail'),
          website: fd.get('website'), // honeypot
          lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || t('submit.error'));
        setStatus('error');
        return;
      }
      setReferenceCode(typeof data.referenceCode === 'string' ? data.referenceCode : '');
      setStatus('success');
      form.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError(t('submit.error'));
      setStatus('error');
    }
  }

  function copyRef() {
    if (!referenceCode) return;
    navigator.clipboard?.writeText(referenceCode).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => undefined
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.07] via-card to-card p-8 text-center shadow-float sm:p-10">
        <span
          aria-hidden="true"
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 dir="auto" className="mt-5 text-2xl font-bold">
          {t('submit.success.title')}
        </h2>
        <p dir="auto" className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('submit.success.body')}
        </p>
        {referenceCode && (
          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-emerald-500/25 bg-card/80 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {t('submit.success.refLabel')}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <code dir="ltr" className="rounded-lg bg-muted px-3 py-1.5 font-mono text-lg font-black tracking-[0.18em]">
                {referenceCode}
              </code>
              <button
                type="button"
                onClick={copyRef}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    {t('submit.success.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('submit.success.copy')}
                  </>
                )}
              </button>
            </div>
            <p dir="auto" className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t('submit.success.refHint')}
            </p>
          </div>
        )}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:bg-primary/90"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {t('submit.success.another')}
          </button>
          <Link
            href={`/${lang}/opportunities`}
            className="inline-flex h-11 items-center rounded-xl border border-border bg-card/60 px-6 text-sm font-semibold transition-colors hover:bg-accent"
          >
            {t('opportunities.title')}
          </Link>
        </div>
        {referenceCode && (
          <div className="mt-5">
            <Link
              href={`/${lang}/track?ref=${encodeURIComponent(referenceCode)}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t('submit.success.track')}
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-float backdrop-blur-sm sm:p-8"
      noValidate={false}
    >
      {/* Opportunity details */}
      <fieldset>
        <legend dir="auto" className="text-sm font-bold uppercase tracking-wider text-primary">
          {t('submit.form.opportunitySection')}
        </legend>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="sub-title" dir="auto" className={labelClasses}>
              {t('submit.form.titleField')} <span className="text-rose-500">*</span>
            </label>
            <input
              id="sub-title"
              name="title"
              type="text"
              required
              minLength={5}
              maxLength={200}
              dir="auto"
              placeholder={t('submit.form.titlePlaceholder')}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="sub-organization" dir="auto" className={labelClasses}>
              {t('submit.form.organization')}
            </label>
            <input
              id="sub-organization"
              name="organization"
              type="text"
              maxLength={120}
              dir="auto"
              placeholder={t('submit.form.organizationPlaceholder')}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="sub-category" dir="auto" className={labelClasses}>
              {t('submit.form.category')} <span className="text-rose-500">*</span>
            </label>
            <select id="sub-category" name="categorySlug" required defaultValue="" className={inputClasses}>
              <option value="" disabled>
                —
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {t(c.key)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sub-country" dir="auto" className={labelClasses}>
              {t('submit.form.country')}
            </label>
            <input
              id="sub-country"
              name="country"
              type="text"
              maxLength={80}
              dir="auto"
              placeholder={t('submit.form.countryPlaceholder')}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="sub-deadline" dir="auto" className={labelClasses}>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {t('submit.form.deadline')}
              </span>
            </label>
            <input id="sub-deadline" name="deadline" type="date" className={inputClasses} />
          </div>

          <div>
            <label htmlFor="sub-applyurl" dir="auto" className={labelClasses}>
              <span className="inline-flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {t('submit.form.applyUrl')}
              </span>
            </label>
            <input
              id="sub-applyurl"
              name="applyUrl"
              type="url"
              dir="ltr"
              placeholder="https://…"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="sub-applyemail" dir="auto" className={labelClasses}>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {t('submit.form.applyEmail')}
              </span>
            </label>
            <input
              id="sub-applyemail"
              name="applyEmail"
              type="email"
              dir="ltr"
              placeholder="jobs@example.org"
              className={inputClasses}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="sub-description" dir="auto" className={labelClasses}>
              {t('submit.form.description')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="sub-description"
              name="description"
              required
              minLength={80}
              maxLength={8000}
              rows={7}
              dir="auto"
              placeholder={t('submit.form.descriptionHint')}
              className="w-full resize-y rounded-xl border border-border bg-background/80 p-4 text-sm text-foreground shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <p dir="auto" className="mt-1.5 text-xs text-muted-foreground">
              {t('submit.form.descriptionHint')}
            </p>
          </div>
        </div>
      </fieldset>

      {/* Contact details */}
      <fieldset className="mt-7 border-t border-border/60 pt-6">
        <legend dir="auto" className="text-sm font-bold uppercase tracking-wider text-primary">
          {t('submit.form.contactSection')}
        </legend>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="sub-contactname" dir="auto" className={labelClasses}>
              {t('submit.form.contactName')}
            </label>
            <input
              id="sub-contactname"
              name="contactName"
              type="text"
              maxLength={120}
              dir="auto"
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="sub-contactemail" dir="auto" className={labelClasses}>
              {t('submit.form.contactEmail')} <span className="text-rose-500">*</span>
            </label>
            <input
              id="sub-contactemail"
              name="contactEmail"
              type="email"
              required
              dir="ltr"
              placeholder="you@example.com"
              className={inputClasses}
            />
          </div>
        </div>
        <p dir="auto" className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {t('submit.form.contactHint')}
        </p>
      </fieldset>

      {/* Honeypot — visually hidden from real users */}
      <div className="absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
        <label htmlFor="sub-website">Website</label>
        <input id="sub-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === 'error' && (
        <p
          role="alert"
          dir="auto"
          className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm font-medium text-rose-700 dark:text-rose-400"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('submit.form.submitting')}
          </>
        ) : (
          <>
            <Send className="h-4 w-4 rtl-flip" aria-hidden="true" />
            {t('submit.form.submit')}
          </>
        )}
      </button>
    </form>
  );
}
