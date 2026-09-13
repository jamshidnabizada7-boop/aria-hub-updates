'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n-config';
import {
  STORY_TYPES_CLIENT,
  translateStoryTypeClient,
} from '@/components/site/story-types';

type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Success-story submission form — posts to /api/success-stories.
 * Rows arrive as status='pending' and appear after admin approval.
 */
export function StorySubmitForm({ lang }: { lang: Lang }) {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    storyType: 'scholarship',
    country: '',
    program: '',
    year: String(new Date().getFullYear()),
    title: '',
    content: '',
    authorAlias: '',
    contactEmail: '',
  });

  const t = (key: string) => translate(lang, key);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;

    if (form.content.trim().length < 120) {
      setStatus('error');
      setErrorMsg(t('stories.errTooShort'));
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/success-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lang }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'internal');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error && err.message === 'content_too_short'
          ? t('stories.errTooShort')
          : t('stories.errorContent')
      );
    }
  }

  const inputClasses =
    'w-full rounded-md border border-input bg-background/80 px-3.5 py-2.5 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

  if (status === 'success') {
    return (
      <section
        aria-live="polite"
        className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-card p-8 text-center shadow-sm"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-amber-500/[0.06]"
        />
        <div className="relative flex flex-col items-center gap-3 py-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-bold text-foreground">{t('stories.successTitle')}</h2>
          <p dir="auto" className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {t('stories.successBody')}
          </p>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8" noValidate>
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Story type */}
        <div>
          <label htmlFor="storyType" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('stories.fieldType')}
          </label>
          <select id="storyType" value={form.storyType} onChange={set('storyType')} className={inputClasses}>
            {STORY_TYPES_CLIENT.map((type) => (
              <option key={type} value={type}>
                {translateStoryTypeClient(type, lang)}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label htmlFor="year" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('stories.fieldYear')}
          </label>
          <input
            id="year"
            type="number"
            min={2000}
            max={2100}
            value={form.year}
            onChange={set('year')}
            required
            className={inputClasses}
          />
        </div>

        {/* Country */}
        <div>
          <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('stories.fieldCountry')} *
          </label>
          <input
            id="country"
            type="text"
            value={form.country}
            onChange={set('country')}
            placeholder={t('stories.fieldCountryPlaceholder')}
            required
            maxLength={60}
            className={inputClasses}
          />
        </div>

        {/* Program */}
        <div>
          <label htmlFor="program" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('stories.fieldProgram')}
          </label>
          <input
            id="program"
            type="text"
            value={form.program}
            onChange={set('program')}
            placeholder={t('stories.fieldProgramPlaceholder')}
            maxLength={120}
            className={inputClasses}
          />
        </div>

        {/* Title */}
        <div className="sm:col-span-2">
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('stories.fieldTitle')} *
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder={t('stories.fieldTitlePlaceholder')}
            required
            minLength={8}
            maxLength={160}
            dir="auto"
            className={inputClasses}
          />
        </div>

        {/* Content */}
        <div className="sm:col-span-2">
          <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('stories.fieldContent')} *
          </label>
          <textarea
            id="content"
            value={form.content}
            onChange={set('content')}
            placeholder={t('stories.fieldContentPlaceholder')}
            required
            minLength={120}
            maxLength={6000}
            rows={8}
            dir="auto"
            className={`${inputClasses} resize-y`}
          />
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{t('stories.fieldContentHint')}</p>
            <p
              className={`shrink-0 text-xs tabular-nums ${
                form.content.trim().length >= 120 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              }`}
            >
              {form.content.trim().length}/120+
            </p>
          </div>
        </div>

        {/* Alias */}
        <div>
          <label htmlFor="authorAlias" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('stories.fieldAlias')}
          </label>
          <input
            id="authorAlias"
            type="text"
            value={form.authorAlias}
            onChange={set('authorAlias')}
            placeholder={t('stories.fieldAliasPlaceholder')}
            maxLength={60}
            dir="auto"
            className={inputClasses}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="contactEmail" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('stories.fieldEmail')}
          </label>
          <input
            id="contactEmail"
            type="email"
            value={form.contactEmail}
            onChange={set('contactEmail')}
            maxLength={200}
            dir="ltr"
            className={inputClasses}
          />
        </div>
      </div>

      {status === 'error' && errorMsg && (
        <p dir="auto" role="alert" className="mt-4 rounded-md bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.01] disabled:opacity-60 sm:w-auto"
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        {status === 'loading' ? t('stories.submitting') : t('stories.submit')}
      </button>
    </form>
  );
}
