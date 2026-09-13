import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translate } from '@/lib/i18n';
import {
  daysUntilDeadline,
  type OpportunityCardData,
} from '@/lib/opportunity-queries';
import type { Lang } from '@/lib/lang-route';

/**
 * Slim, deadline-focused card for the Deadlines hub: calendar-page date
 * tile, title, org, countdown chip and a one-tap "add to calendar" (ICS)
 * download. Shared visual language with OpportunityCard (hover lift,
 * focus ring, category-colored accents).
 */

export type DeadlineTone = 'urgent' | 'soon' | 'later';

const TONE_STYLES: Record<DeadlineTone, { month: string; chip: string }> = {
  urgent: {
    month: 'bg-rose-500 text-white',
    chip: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  },
  soon: {
    month: 'bg-amber-500 text-white',
    chip: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  later: {
    month: 'bg-teal-500 text-white',
    chip: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400',
  },
};

/** Gregorian month short names as commonly used in Afghanistan. */
const MONTHS: Record<Lang, readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fa: ['جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون', 'جولای', 'اګست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
  ps: ['جنوري', 'فبروري', 'مارچ', 'اپرېل', 'می', 'جون', 'جولای', 'اګست', 'سپتمبر', 'اکتوبر', 'نومبر', 'ډسمبر'],
};

export function DeadlineCard({
  opportunity,
  lang,
  tone,
  className,
}: {
  opportunity: OpportunityCardData;
  lang: Lang;
  tone: DeadlineTone;
  className?: string;
}) {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  const deadline = opportunity.deadline;
  if (!deadline) return null;

  const days = daysUntilDeadline(deadline);
  const style = TONE_STYLES[tone];
  const month = MONTHS[lang][deadline.getUTCMonth()] ?? '';
  const dayOfMonth = deadline.getUTCDate();
  const isoDate = deadline.toISOString().slice(0, 10);

  // Countdown chip: ≤1 day pulses red, ≤7 amber, else teal (matches the
  // homepage closing-soon urgency palette).
  let countdown: { text: string; classes: string };
  if (days <= 0) {
    countdown = {
      text: t('opportunities.expiresToday'),
      classes: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 animate-pulse',
    };
  } else if (days <= 7) {
    countdown = {
      text: t('opportunities.daysLeft', { count: days }),
      classes: style.chip,
    };
  } else {
    countdown = {
      text: t('opportunities.daysLeft', { count: days }),
      classes: TONE_STYLES.later.chip,
    };
  }

  const icsHref = `/api/opportunities/${opportunity.slug}/calendar?lang=${lang}`;

  return (
    <article className={cn('relative h-full', className)}>
      {/* Add-to-calendar download — absolutely positioned outside the Link
          (nested interactive elements are invalid HTML) */}
      <a
        href={icsHref}
        download={`${opportunity.slug}-deadline.ics`}
        aria-label={t('detail.addCalendar')}
        title={t('detail.addCalendar')}
        className="absolute end-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
      </a>

      <Link
        href={`/${lang}/opportunities/${opportunity.slug}`}
        className="group flex h-full items-stretch gap-4 rounded-xl border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {/* Calendar-page date tile */}
        <div
          aria-hidden="true"
          title={`${isoDate}`}
          className="flex w-14 shrink-0 flex-col overflow-hidden rounded-lg border text-center shadow-xs"
        >
          <span
            className={cn(
              'px-1 py-1 text-[9px] font-bold uppercase leading-tight tracking-wide',
              style.month
            )}
          >
            {month}
          </span>
          <span className="flex flex-1 items-center justify-center bg-accent/40 py-1.5 text-xl font-extrabold leading-none text-foreground">
            {dayOfMonth}
          </span>
        </div>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3
            dir="auto"
            className="line-clamp-2 pe-8 text-sm font-semibold leading-snug transition-colors group-hover:text-primary"
          >
            {opportunity.title}
          </h3>

          {(opportunity.organization || opportunity.categoryLabel) && (
            <span dir="auto" className="truncate text-xs text-muted-foreground">
              {opportunity.organization || opportunity.categoryLabel}
            </span>
          )}

          <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            {opportunity.categoryLabel && (
              <span
                dir="auto"
                className="inline-flex max-w-full items-center truncate rounded-full border bg-accent/60 px-2.5 py-0.5 text-[11px] font-medium"
              >
                {opportunity.categoryLabel}
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                countdown.classes
              )}
            >
              <span dir="auto">{countdown.text}</span>
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}
