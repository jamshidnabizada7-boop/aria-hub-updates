import Link from 'next/link';
import {
  Sparkles,
  Search,
  Briefcase,
  GraduationCap,
  Users,
  BookOpen,
  ArrowRight,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { SmartImage } from '../smart-image';
import { CountUp } from '../count-up';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';

export interface HeroStats {
  activeOpportunities: number;
  organizations: number;
  categories: number;
}

/** Placeholder used to split a translated template around its count. */
const SENTINEL = '\u2063'; // invisible separator

/**
 * A stat pill whose number counts up on first paint.
 * The translated template (e.g. "{count} active opportunities") is split on
 * the sentinel so only the numeral becomes a client island.
 */
function StatChip({
  template,
  value,
  icon,
  className,
}: {
  template: string;
  value: number;
  icon: React.ReactNode;
  className: string;
}) {
  const idx = template.indexOf(SENTINEL);
  const before = idx >= 0 ? template.slice(0, idx) : '';
  const after = idx >= 0 ? template.slice(idx + SENTINEL.length) : template;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${className}`}
    >
      {icon}
      <span dir="auto">
        {before}
        {idx >= 0 ? (
          <CountUp value={value} />
        ) : (
          <span className="tabular-nums">{value}</span>
        )}
        {after}
      </span>
    </span>
  );
}

/** Quick-access categories rendered as chips under the hero search box. */
const QUICK_CATEGORIES = [
  { slug: 'jobs', icon: Briefcase, key: 'opportunities.jobs' },
  { slug: 'scholarships', icon: GraduationCap, key: 'opportunities.scholarships' },
  { slug: 'internships', icon: Users, key: 'opportunities.internships' },
  { slug: 'training', icon: BookOpen, key: 'opportunities.training' },
] as const;

/**
 * Focused, search-first hero (server-rendered).
 * Keeps the original visual language — hero background image, gradient
 * overlays, grid pattern, floating orbs — while putting opportunity search
 * front and center and replacing fake counters with real DB counts.
 */
export function Hero({ lang, stats }: { lang: Lang; stats: HeroStats }) {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  return (
    <section id="home" className="relative overflow-hidden pt-32 pb-16 sm:pt-36">
      {/* Background layers (same recipe as the original hero) */}
      <div className="absolute inset-0 -z-10">
        <SmartImage
          src="/images/hero/hero-bg.webp"
          alt={
            lang === 'fa'
              ? 'آریا هاب — پورتال جامع بورسیه‌های تحصیلی، وظایف و فرصت‌های جهانی'
              : lang === 'ps'
              ? 'آریا هاب — د تحصیلي بورسونو، کاري فرصتونو او نړیوالو امکاناتو پورتال'
              : 'ARIA HUB — Global Opportunities, Scholarships, and Career Platform'
          }
          priority={true}
          fetchPriority="high"
          sizes="100vw"
          className="absolute inset-0 h-full w-full opacity-60 dark:opacity-80"
          imgClassName="h-full w-full object-cover"
          gradient="from-primary/40 via-chart-2/30 to-background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background dark:from-background/30 dark:via-background/50 dark:to-background" />
        <div className="absolute inset-0 bg-grid opacity-[0.15]" />
        {/* floating orbs (CSS-animated — no client JS needed) */}
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
        <div
          className="absolute -right-32 bottom-1/4 h-[28rem] w-[28rem] rounded-full bg-chart-2/20 blur-3xl animate-float-slow"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t('home.newDaily')}
        </div>

        {/* Headline */}
        <h1 className="mt-6 text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          {t('home.heroTitle')}{' '}
          <span className="text-gradient">{t('home.heroHighlight')}</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {t('home.heroSubtitle')}
        </p>

        {/* Primary CTA — opportunity search */}
        <form
          role="search"
          action={`/${lang}/opportunities`}
          method="get"
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute inset-y-0 start-4 my-auto h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              placeholder={t('opportunities.searchPlaceholder')}
              aria-label={t('opportunities.searchPlaceholder')}
              className="h-12 w-full rounded-xl border border-border bg-card/80 ps-12 pe-4 text-base text-foreground shadow-float outline-none backdrop-blur-sm transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-chart-2 px-7 text-base font-semibold text-primary-foreground shadow-float transition-opacity hover:opacity-90"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {t('common.search')}
          </button>
        </form>

        {/* Quick category chips */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {QUICK_CATEGORIES.map(({ slug, icon: Icon, key }) => (
            <Link
              key={slug}
              href={`/${lang}/opportunities?category=${slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm font-medium text-foreground/80 backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(key)}
            </Link>
          ))}
        </div>

        {/* Real stats (fetched server-side, number animated client-side) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <StatChip
            template={t('home.statOpportunities', { count: SENTINEL })}
            value={stats.activeOpportunities}
            icon={<Briefcase className="h-4 w-4 shrink-0" aria-hidden="true" />}
            className="border-primary/25 bg-primary/[0.07] text-primary hover:bg-primary/15"
          />
          <StatChip
            template={t('home.statOrganizations', { count: SENTINEL })}
            value={stats.organizations}
            icon={<Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
            className="border-chart-2/25 bg-chart-2/10 text-foreground/80 hover:bg-chart-2/20"
          />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm">
            <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('home.trustBadge2')}
          </span>
        </div>

        {/* Secondary CTA — services */}
        <div className="mt-8">
          <Link
            href={`/${lang}/services`}
            className="group inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card/50 px-6 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-accent"
          >
            {t('hero.ctaPrimary')}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
