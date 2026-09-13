'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Search,
  Send,
  Wallet,
} from 'lucide-react';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';

const CATEGORIES = [
  { slug: 'jobs', key: 'opportunities.jobs' },
  { slug: 'internships', key: 'opportunities.internships' },
  { slug: 'training', key: 'opportunities.training' },
  { slug: 'volunteer', key: 'opportunities.volunteer' },
  { slug: 'fellowships', key: 'opportunities.fellowships' },
  { slug: 'competitions', key: 'opportunities.competitions' },
] as const;

const JOB_TYPES = [
  { value: 'full-time', key: 'employers.post.jobType.fullTime' },
  { value: 'part-time', key: 'employers.post.jobType.partTime' },
  { value: 'contract', key: 'employers.post.jobType.contract' },
  { value: 'internship', key: 'employers.post.jobType.internship' },
  { value: 'remote', key: 'employers.post.jobType.remote' },
] as const;

const inputClasses =
  'h-11 w-full rounded-xl border border-border bg-background/80 px-4 text-sm text-foreground shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const labelClasses = 'mb-1.5 block text-sm font-semibold';

const sectionTitleClasses =
  'flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary';

export function EmployerPostForm({ lang }: { lang: Lang }) {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [descLen, setDescLen] = useState(0);
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
          submitterType: 'employer',
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
          jobType: fd.get('jobType'),
          salaryRange: fd.get('salaryRange'),
          location: fd.get('location'),
          companyWebsite: fd.get('companyWebsite'),
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
      setDescLen(0);
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
          {t('employers.post.success.title')}
        </h2>
        <p dir="auto" className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('employers.post.success.body')}
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
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-chart-2 px-6 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:opacity-90"
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {t('employers.post.success.another')}
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
      noValidate
    >
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {/* ── Company details ─────────────────────────────────────────────── */}
      <p className={sectionTitleClasses}>
        <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t('employers.post.companySection')}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ep-org" className={labelClasses}>
            {t('employers.post.companyName')} <span className="text-destructive">*</span>
          </label>
          <input id="ep-org" name="organization" type="text" required maxLength={120} placeholder={t('employers.post.companyNamePlaceholder')} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="ep-web" className={labelClasses}>
            {t('employers.post.companyWebsite')}
          </label>
          <input id="ep-web" name="companyWebsite" type="url" dir="ltr" placeholder="https://…" className={inputClasses} />
        </div>
      </div>

      {/* ── Role details ────────────────────────────────────────────────── */}
      <p className={`${sectionTitleClasses} mt-7`}>
        <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
        {t('employers.post.roleSection')}
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="ep-title" className={labelClasses}>
            {t('employers.post.jobTitle')} <span className="text-destructive">*</span>
          </label>
          <input id="ep-title" name="title" type="text" required minLength={5} maxLength={200} placeholder={t('employers.post.jobTitlePlaceholder')} className={inputClasses} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-category" className={labelClasses}>
              {t('submit.form.category')} <span className="text-destructive">*</span>
            </label>
            <select id="ep-category" name="categorySlug" required defaultValue="" className={`${inputClasses} appearance-none`}>
              <option value="" disabled>
                —
              </option>
              {CATEGORIES.map(({ slug, key }) => (
                <option key={slug} value={slug}>
                  {t(key)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ep-jobtype" className={labelClasses}>
              {t('employers.post.jobType')}
            </label>
            <select id="ep-jobtype" name="jobType" defaultValue="full-time" className={`${inputClasses} appearance-none`}>
              {JOB_TYPES.map(({ value, key }) => (
                <option key={value} value={value}>
                  {t(key)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-location" className={labelClasses}>
              {t('employers.post.location')}
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input id="ep-location" name="location" type="text" maxLength={120} placeholder={t('employers.post.locationPlaceholder')} className={`${inputClasses} ps-10`} />
            </div>
          </div>
          <div>
            <label htmlFor="ep-country" className={labelClasses}>
              {t('submit.form.country')}
            </label>
            <input id="ep-country" name="country" type="text" maxLength={80} placeholder={t('submit.form.countryPlaceholder')} className={inputClasses} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-salary" className={labelClasses}>
              {t('employers.post.salary')}
            </label>
            <div className="relative">
              <Wallet className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input id="ep-salary" name="salaryRange" type="text" maxLength={120} placeholder={t('employers.post.salaryPlaceholder')} className={`${inputClasses} ps-10`} />
            </div>
          </div>
          <div>
            <label htmlFor="ep-deadline" className={labelClasses}>
              {t('submit.form.deadline')}
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input id="ep-deadline" name="deadline" type="date" className={`${inputClasses} ps-10`} />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="ep-desc" className={labelClasses}>
            {t('submit.form.description')} <span className="text-destructive">*</span>
          </label>
          <textarea
            id="ep-desc"
            name="description"
            required
            minLength={80}
            maxLength={8000}
            rows={7}
            onChange={(e) => setDescLen(e.target.value.length)}
            placeholder={t('submit.form.descriptionHint')}
            className="w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('submit.form.descriptionHint')}</span>
            <span
              aria-live="polite"
              className={descLen >= 80 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}
              dir="ltr"
            >
              {descLen}/80
            </span>
          </div>
        </div>
      </div>

      {/* ── How to apply ────────────────────────────────────────────────── */}
      <p className={`${sectionTitleClasses} mt-7`}>
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        {t('employers.post.applySection')}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ep-applyurl" className={labelClasses}>
            {t('submit.form.applyUrl')}
          </label>
          <input id="ep-applyurl" name="applyUrl" type="url" dir="ltr" placeholder="https://…" className={inputClasses} />
        </div>
        <div>
          <label htmlFor="ep-applyemail" className={labelClasses}>
            {t('submit.form.applyEmail')}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input id="ep-applyemail" name="applyEmail" type="email" dir="ltr" placeholder="jobs@example.org" className={`${inputClasses} ps-10`} />
          </div>
        </div>
      </div>

      {/* ── Contact details ─────────────────────────────────────────────── */}
      <p className={`${sectionTitleClasses} mt-7`}>
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        {t('submit.form.contactSection')}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ep-contactname" className={labelClasses}>
            {t('submit.form.contactName')}
          </label>
          <input id="ep-contactname" name="contactName" type="text" maxLength={120} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="ep-contactemail" className={labelClasses}>
            {t('submit.form.contactEmail')} <span className="text-destructive">*</span>
          </label>
          <input id="ep-contactemail" name="contactEmail" type="email" required dir="ltr" placeholder="you@example.com" className={inputClasses} />
        </div>
      </div>
      <p dir="auto" className="mt-2 text-xs text-muted-foreground">
        {t('submit.form.contactHint')}
      </p>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-chart-2 px-6 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === 'submitting' ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        )}
        {status === 'submitting' ? t('submit.form.submitting') : t('submit.form.submit')}
      </button>

      {status === 'error' && (
        <p dir="auto" role="alert" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <p dir="auto" className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        {t('employers.communityNote')}{' '}
        <Link href={`/${lang}/submit-opportunity`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          {t('employers.communityLink')}
          <ArrowRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </p>
    </form>
  );
}
