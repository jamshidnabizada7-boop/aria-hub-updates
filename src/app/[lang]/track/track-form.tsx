'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  LifeBuoy,
  Loader2,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { translate } from '@/lib/i18n';
import { formatDateLong } from '@/lib/date-format';
import type { Lang } from '@/lib/lang-route';

const inputClasses =
  'h-11 w-full rounded-xl border border-border bg-background/80 px-4 text-sm text-foreground shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const labelClasses = 'mb-1.5 block text-sm font-semibold';

type TrackedSubmission = {
  referenceCode: string;
  title: string;
  organization: string | null;
  categorySlug: string;
  submitterType: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
  publishedSlug: string | null;
  reviewNote: string | null;
};

const STATUS_STYLES: Record<
  TrackedSubmission['status'],
  { badge: string; icon: React.ReactNode }
> = {
  pending: {
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
  },
  approved: {
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
  },
  rejected: {
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
  },
};

export function TrackForm({ lang }: { lang: Lang }) {
  return (
    <Suspense fallback={null}>
      <TrackFormInner lang={lang} />
    </Suspense>
  );
}

function TrackFormInner({ lang }: { lang: Lang }) {
  const t = (key: string) => translate(lang, key);
  const searchParams = useSearchParams();
  const presetRef = (searchParams.get('ref') || '').toUpperCase().slice(0, 20);

  const [ref, setRef] = useState(presetRef);
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'idle' | 'checking' | 'done' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<'not_found' | 'generic' | null>(null);
  const [result, setResult] = useState<TrackedSubmission | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === 'checking') return;
    setPhase('checking');
    setErrorCode(null);
    try {
      const res = await fetch(
        `/api/opportunities/track?ref=${encodeURIComponent(ref.trim())}&email=${encodeURIComponent(email.trim())}`
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.found) {
        setResult(data.submission as TrackedSubmission);
        setPhase('done');
      } else if (res.status === 404 || res.status === 400) {
        setErrorCode('not_found');
        setPhase('error');
      } else {
        setErrorCode('generic');
        setPhase('error');
      }
    } catch {
      setErrorCode('generic');
      setPhase('error');
    }
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => undefined
    );
  }

  function reset() {
    setPhase('idle');
    setResult(null);
    setErrorCode(null);
    setRef('');
    setEmail('');
  }

  // ── Result view ───────────────────────────────────────────────────────────
  if (phase === 'done' && result) {
    const style = STATUS_STYLES[result.status];
    return (
      <div className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-float">
        {/* Status band */}
        <div className="border-b bg-gradient-to-br from-primary/[0.06] via-transparent to-chart-2/[0.06] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 dir="auto" className="text-lg font-bold">
              {t('track.result.title')}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${style.badge}`}
            >
              {style.icon}
              {t(`track.status.${result.status}`)}
            </span>
          </div>
          <p dir="auto" className="mt-3 text-base font-semibold leading-snug">
            {result.title}
          </p>
          {result.organization && (
            <p dir="auto" className="mt-0.5 text-sm text-muted-foreground">
              {result.organization}
            </p>
          )}
        </div>

        {/* Meta rows */}
        <dl className="grid gap-x-6 gap-y-3 px-6 py-5 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('track.ref')}
            </dt>
            <dd className="mt-0.5 inline-flex items-center gap-2">
              <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold tracking-wider" dir="ltr">
                {result.referenceCode}
              </code>
              <button
                type="button"
                onClick={() => copyCode(result.referenceCode)}
                aria-label={t('submit.success.copy')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('track.submittedOn')}
            </dt>
            <dd className="mt-0.5" dir="auto">
              {formatDateLong(new Date(result.createdAt), lang)}
            </dd>
          </div>
          {result.reviewedAt && (
            <div className="flex items-center justify-between gap-3 sm:block">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('track.reviewedOn')}
              </dt>
              <dd className="mt-0.5" dir="auto">
                {formatDateLong(new Date(result.reviewedAt), lang)}
              </dd>
            </div>
          )}
        </dl>

        {/* Status body */}
        <div className="border-t bg-muted/30 px-6 py-5">
          <p dir="auto" className="text-sm leading-relaxed text-muted-foreground">
            {result.status === 'pending' && t('track.pending.body')}
            {result.status === 'approved' && t('track.approved.body')}
            {result.status === 'rejected' && t('track.rejected.body')}
          </p>

          {result.status === 'rejected' && result.reviewNote && (
            <div dir="auto" className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                {t('track.rejected.note')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{result.reviewNote}</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {result.status === 'approved' && result.publishedSlug && (
              <Link
                href={`/${lang}/opportunities/${result.publishedSlug}`}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t('track.approved.view')}
              </Link>
            )}
            {result.status === 'rejected' && (
              <Link
                href={`/${lang}/submit-opportunity`}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:bg-primary/90"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t('submit.link')}
              </Link>
            )}
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card/60 px-5 text-sm font-semibold transition-colors hover:bg-accent"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t('track.another')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Default form view ─────────────────────────────────────────────────────
  return (
    <div className="mt-8">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-card p-6 shadow-float sm:p-8"
        aria-labelledby="track-form-title"
      >
        <h2 id="track-form-title" className="sr-only">
          {t('track.title')}
        </h2>

        <div className="space-y-5">
          <div>
            <label htmlFor="track-ref" className={labelClasses}>
              {t('track.refLabel')}
            </label>
            <input
              id="track-ref"
              name="ref"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              placeholder={t('track.refPlaceholder')}
              className={`${inputClasses} font-mono font-bold tracking-widest`}
            />
          </div>

          <div>
            <label htmlFor="track-email" className={labelClasses}>
              {t('track.emailLabel')}
            </label>
            <input
              id="track-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.org"
              className={`${inputClasses} text-start`}
            />
          </div>
        </div>

        {phase === 'error' && (
          <p
            role="alert"
            dir="auto"
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300"
          >
            {errorCode === 'not_found' ? t('track.error.notFound') : t('track.error.generic')}
          </p>
        )}

        <button
          type="submit"
          disabled={phase === 'checking'}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-float transition-opacity hover:bg-primary/90 disabled:opacity-60"
        >
          {phase === 'checking' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('track.checking')}
            </>
          ) : (
            <>
              <Search className="h-4 w-4" aria-hidden="true" />
              {t('track.submit')}
            </>
          )}
        </button>
      </form>

      {/* Lost-code helper */}
      <div dir="auto" className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed px-5 py-4">
        <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('track.lostCode')}{' '}
          <Link
            href={`/${lang}/contact`}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            {t('track.contactLink')}
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </div>
  );
}
