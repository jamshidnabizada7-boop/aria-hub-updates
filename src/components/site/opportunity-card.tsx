import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  MapPin,
  CalendarDays,
  Briefcase,
  GraduationCap,
  Users,
  Trophy,
  Presentation,
  HeartHandshake,
  Globe2,
  BookOpen,
  Layers,
  Sparkles,
  Crown,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translate } from '@/lib/i18n';
import { formatDateShort } from '@/lib/date-format';
import { SaveButton } from '@/components/site/save-button';
import {
  daysUntilDeadline,
  isOpportunityExpired,
  type OpportunityCardData,
} from '@/lib/opportunity-shared';
import type { Lang } from '@/lib/lang-route';

/**
 * Category visual identity: 8 distinct hues + icons, shared by every card.
 * Full static class strings so Tailwind can see them at build time.
 */
const CATEGORY_STYLES: Record<
  string,
  { icon: LucideIcon; banner: string; iconBox: string; label: string }
> = {
  jobs: {
    icon: Briefcase,
    banner: 'bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent',
    iconBox: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    label: 'text-amber-700 dark:text-amber-400',
  },
  scholarships: {
    icon: GraduationCap,
    banner: 'bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent',
    iconBox: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    label: 'text-emerald-700 dark:text-emerald-400',
  },
  internships: {
    icon: Users,
    banner: 'bg-gradient-to-r from-violet-500/20 via-violet-500/5 to-transparent',
    iconBox: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    label: 'text-violet-700 dark:text-violet-400',
  },
  competitions: {
    icon: Trophy,
    banner: 'bg-gradient-to-r from-rose-500/20 via-rose-500/5 to-transparent',
    iconBox: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    label: 'text-rose-700 dark:text-rose-400',
  },
  conferences: {
    icon: Presentation,
    banner: 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/5 to-transparent',
    iconBox: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    label: 'text-cyan-700 dark:text-cyan-400',
  },
  volunteer: {
    icon: HeartHandshake,
    banner: 'bg-gradient-to-r from-teal-500/20 via-teal-500/5 to-transparent',
    iconBox: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    label: 'text-teal-700 dark:text-teal-400',
  },
  'exchange-programs': {
    icon: Globe2,
    banner: 'bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent',
    iconBox: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    label: 'text-orange-700 dark:text-orange-400',
  },
  training: {
    icon: BookOpen,
    banner: 'bg-gradient-to-r from-slate-500/20 via-slate-500/5 to-transparent',
    iconBox: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
    label: 'text-slate-700 dark:text-slate-400',
  },
};

const DEFAULT_CATEGORY_STYLE = {
  icon: Layers,
  banner: 'bg-gradient-to-r from-primary/20 via-primary/5 to-transparent',
  iconBox: 'bg-primary/10 text-primary',
  label: 'text-primary',
};

function formatDeadline(deadline: Date, lang: Lang): string {
  // Localized everywhere: "Oct 15, 2026" / «۱۵ اکتوبر ۲۰۲۶» — never raw ISO
  // on fa/ps (users read Gregorian dates with Afghan month names).
  return formatDateShort(deadline, lang);
}

export function OpportunityCard({
  opportunity,
  lang,
  className,
  spotlight = false,
}: {
  opportunity: OpportunityCardData;
  lang: Lang;
  className?: string;
  /** True on the deterministic "Opportunity of the Day" pick. */
  spotlight?: boolean;
}) {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  const style = CATEGORY_STYLES[opportunity.categorySlug ?? ''] ?? DEFAULT_CATEGORY_STYLE;
  const Icon = style.icon;

  const expired = isOpportunityExpired(opportunity.status, opportunity.deadline);
  const daysLeft = opportunity.deadline ? daysUntilDeadline(opportunity.deadline) : null;
  // Recency cue: listings published within the past 7 days wear a "New" badge.
  const isNew =
    Date.now() - opportunity.createdAt.getTime() < 7 * 86_400_000;
  // Any badge floating over the category banner — reserve inline-start space
  // so the category label never slides underneath it (badges are absolute).
  const hasTopBadge = !expired && (spotlight || opportunity.featured || isNew);

  let deadlineChip: { text: string; classes: string } | null = null;
  if (expired) {
    deadlineChip = {
      text: t('opportunities.expired'),
      classes: 'bg-destructive/10 text-destructive border-destructive/20',
    };
  } else if (daysLeft !== null && daysLeft <= 0) {
    deadlineChip = {
      text: t('opportunities.expiresToday'),
      classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    };
  } else if (daysLeft !== null && daysLeft <= 3) {
    deadlineChip = {
      text: t('opportunities.daysLeft', { count: daysLeft }),
      classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    };
  } else if (opportunity.deadline) {
    deadlineChip = {
      text: formatDeadline(opportunity.deadline, lang),
      classes: 'bg-accent text-foreground border-border',
    };
  }

  return (
    <article className={cn('relative h-full', className)}>
      <SaveButton slug={opportunity.slug} className="absolute end-3 top-3 z-10 print:hidden" />
      {spotlight && !expired && !opportunity.featured && (
        <span
          dir="auto"
          className="absolute start-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-gradient-to-r from-primary/20 to-chart-2/10 px-2 py-0.5 text-[11px] font-bold text-primary backdrop-blur-sm print:hidden"
        >
          <Star className="h-3 w-3" aria-hidden="true" />
          {t('spotlight.todaysPick')}
        </span>
      )}
      {isNew && !expired && !opportunity.featured && !spotlight && (
        <span
          dir="auto"
          className="absolute start-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 backdrop-blur-sm dark:text-emerald-300 print:hidden"
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {t('opportunities.newBadge')}
        </span>
      )}
      {opportunity.featured && !expired && (
        <span
          dir="auto"
          className="absolute start-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/25 to-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 backdrop-blur-sm dark:text-amber-300 print:hidden"
        >
          <Crown className="h-3 w-3" aria-hidden="true" />
          {t('opportunities.promoted')}
        </span>
      )}
      <Link
        href={`/${lang}/opportunities/${opportunity.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300/70 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-amber-300/40"
      >
        {/* Brand accent line — gold, grows in on hover (inset, RTL-safe) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 origin-center scale-x-0 bg-gradient-to-r from-primary via-amber-300 to-primary transition-transform duration-300 group-hover:scale-x-100 motion-reduce:transition-none"
        />
        {/* Category banner */}
        <div className={cn('flex items-center gap-3 py-3 pe-4', hasTopBadge ? 'ps-28' : 'ps-4', style.banner)}>
          <span
            aria-hidden="true"
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              style.iconBox
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            {opportunity.categoryLabel && (
              <span
                dir="auto"
                className={cn('block truncate text-xs font-semibold', style.label)}
              >
                {opportunity.categoryLabel}
              </span>
            )}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <h3
            dir="auto"
            className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary"
          >
            {opportunity.title}
          </h3>

          {(opportunity.organization || opportunity.locationLabel || opportunity.country) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {opportunity.organization && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span dir="auto" className="truncate">
                    {opportunity.organization}
                  </span>
                </span>
              )}
              {(opportunity.locationLabel || opportunity.country) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span dir="auto">{opportunity.locationLabel || opportunity.country}</span>
                </span>
              )}
            </div>
          )}

          {opportunity.summary && (
            <p dir="auto" className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {opportunity.summary}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {opportunity.jobType && (
              <span
                dir="auto"
                className="inline-flex max-w-full items-center truncate rounded-full border bg-accent/60 px-2.5 py-0.5 text-[11px] font-medium"
              >
                {opportunity.jobType}
              </span>
            )}
            {deadlineChip && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                  deadlineChip.classes
                )}
              >
                <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span dir="auto">{deadlineChip.text}</span>
              </span>
            )}
            {/* Directional cue — nudges toward the reading direction on hover */}
            <span
              aria-hidden="true"
              className="ms-auto inline-flex items-center text-muted-foreground/50 transition-all duration-200 group-hover:text-primary ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 motion-reduce:transition-none"
            >
              <ArrowRight
                className={cn('h-4 w-4', lang !== 'en' && '-scale-x-100')}
              />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
