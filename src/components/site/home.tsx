import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BadgeCheck,
  RefreshCw,
  Gift,
  HeartHandshake,
  Quote,
  Star,
  Layers,
  Briefcase,
  GraduationCap,
  Users,
  Trophy,
  Presentation,
  Heart,
  Globe2,
  BookOpen,
  Search,
  FileText,
  MousePointerClick,
  AlarmClock,
  Sparkles,
  CalendarDays,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { FloatingSocial } from './floating-social';
import { ScrollToTop } from './scroll-to-top';
import { CookieBanner } from './cookie-banner';
import { VisitTracker } from './visit-tracker';
import { ReadingProgress } from './reading-progress';
import { SectionIndicator } from './section-indicator';
import dynamic from 'next/dynamic';
import { Hero } from './sections/hero';
import { ProcessSection } from './sections/process';
import { ServicesSection } from './sections/services';
import { CtaBannerSection } from './sections/cta-banner';
import { CountersSection } from './sections/counters';
import { NewsSection } from './sections/news';

const VisasSection = dynamic(() => import('./sections/visas').then((m) => m.VisasSection));
const PromoteSection = dynamic(() => import('./sections/promote').then((m) => m.PromoteSection));
const PricingSection = dynamic(() => import('./sections/pricing').then((m) => m.PricingSection));
const PaymentsSection = dynamic(() => import('./sections/payments').then((m) => m.PaymentsSection));
const GallerySection = dynamic(() => import('./sections/gallery').then((m) => m.GallerySection));
const PartnersSection = dynamic(() => import('./sections/partners').then((m) => m.PartnersSection));
const TeamSection = dynamic(() => import('./sections/team').then((m) => m.TeamSection));
const FaqsSection = dynamic(() => import('./sections/faqs').then((m) => m.FaqsSection));
const ComparisonSection = dynamic(() => import('./sections/comparison').then((m) => m.ComparisonSection));
const WhyChooseUsSection = dynamic(() => import('./sections/why-choose-us').then((m) => m.WhyChooseUsSection));
import { OpportunityCard } from './opportunity-card';
import { Reveal } from './reveal';
import { translate } from '@/lib/i18n';
import { getLocalizedContent } from '@/lib/i18n-content';
import { daysUntilDeadline } from '@/lib/opportunity-shared';
import type { Lang } from '@/lib/lang-route';
import type { SiteData, Testimonial } from '@/lib/types';
import type { CategoryFacet, OpportunityCardData } from '@/lib/opportunity-shared';
import type { StoryCard } from '@/lib/success-story-queries';
import { translateStoryType } from '@/lib/success-story-queries';

/**
 * Homepage data resolved on the server (page.tsx) and handed to this shell:
 * real counts, live category facets and the 8 newest opportunities.
 */
export interface HomeData {
  latest: OpportunityCardData[];
  closingSoon: OpportunityCardData[];
  categories: CategoryFacet[];
  /** Deterministic "Opportunity of the Day" pick (null when nothing active). */
  spotlight: OpportunityCardData | null;
  /** Deterministic "Scholarship of the Week" pick (may equal spotlight). */
  weeklyScholarship: OpportunityCardData | null;
  /** Latest/featured community success story (homepage social proof teaser). */
  featuredStory: StoryCard | null;
  liveCounters?: { id: string; label: string; value: number; suffix: string; icon: string }[];
  stats: {
    activeOpportunities: number;
    organizations: number;
    categories: number;
  };
}

/** Category hue accents (same palette family as the opportunity cards). */
const CATEGORY_ACCENTS: Record<string, { icon: LucideIcon; iconBox: string }> = {
  jobs: { icon: Briefcase, iconBox: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  scholarships: { icon: GraduationCap, iconBox: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  internships: { icon: Users, iconBox: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  competitions: { icon: Trophy, iconBox: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
  conferences: { icon: Presentation, iconBox: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400' },
  volunteer: { icon: Heart, iconBox: 'bg-teal-500/15 text-teal-600 dark:text-teal-400' },
  'exchange-programs': { icon: Globe2, iconBox: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  training: { icon: BookOpen, iconBox: 'bg-slate-500/15 text-slate-600 dark:text-slate-400' },
};
const DEFAULT_CATEGORY_ACCENT = { icon: Layers, iconBox: 'bg-primary/10 text-primary' };

const TRUST_ITEMS = [
  { icon: BadgeCheck, key: 'home.trustBadge1' },
  { icon: RefreshCw, key: 'home.trustBadge2' },
  { icon: Gift, key: 'home.trustBadge3' },
  { icon: HeartHandshake, key: 'home.trustBadge4' },
] as const;

export function Home({ data, lang, home }: { data: SiteData; lang: Lang; home: HomeData }) {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  const services = data.services.slice(0, 6);
  const testimonials = data.testimonials.slice(0, 2);
  // CMS gate: every DB-backed section below can be toggled from Admin → Sections.
  // A section renders ONLY if it exists in the database AND enabled === true.
  // If deleted or enabled === false, it is hidden immediately.
  const on = (key: string) => Boolean(data.sections.find((s) => s.key === key)?.enabled);

  return (
    <div className="flex min-h-screen flex-col">
      <VisitTracker />
      <ReadingProgress />
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />
      {/* Scroll-spy dots (desktop) — DB-gated sections without an anchor are
          filtered out inside the component, so no dot is ever dead. */}
      <SectionIndicator
        navLabel={t('nav.menu')}
        sections={[
          { id: 'home-how', label: t('home.howItWorks.eyebrow') },
          { id: 'home-spotlight', label: t('spotlight.dailyBadge') },
          { id: 'home-closing', label: t('home.closingSoon') },
          { id: 'home-categories', label: t('opportunities.eyebrow') },
          { id: 'home-latest', label: t('home.newDaily') },
          { id: 'counters', label: t('counters.title') },
          { id: 'services', label: t('services.title') },
          { id: 'visas', label: t('visas.title') },
          { id: 'pricing', label: t('pricing.title') },
          { id: 'news', label: t('news.title') },
          { id: 'faqs', label: t('faqs.title') },
          { id: 'contact', label: t('contact.title') },
        ]}
      />

      <main id="main-content" className="flex-1">
        {/* A — Focused, search-first hero with real counts */}
        {on('hero') && <Hero lang={lang} stats={home.stats} />}

        {on('process') && data.processSteps.length>0 && <ProcessSection steps={data.processSteps}/>}

        {/* Opportunities block: spotlight, stories, closing soon, categories, latest */}
        {on('opportunities') && (
          <>
            {/* B0 — Daily / weekly spotlight (homepage changes every day) */}
            {(home.spotlight || home.weeklyScholarship) && (
              <SpotlightBand lang={lang} daily={home.spotlight} weekly={home.weeklyScholarship} t={t} />
            )}

            {/* B0.5 — Success story teaser (social proof + UGC funnel) */}
            {home.featuredStory && <StoryTeaser lang={lang} story={home.featuredStory} t={t} />}

            {/* B — Closing soon: deadline urgency strip (daily-visit driver) */}
            {home.closingSoon.length > 0 && (
              <section aria-labelledby="home-closing" className="py-10 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Reveal>
              <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/[0.07] via-card/60 to-amber-500/[0.07] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    >
                      <AlarmClock className="h-5 w-5" />
                      <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                      </span>
                    </span>
                    <div>
                      <h2 id="home-closing" dir="auto" className="text-lg font-bold leading-tight sm:text-xl">
                        {t('home.closingSoon')}
                      </h2>
                      <p dir="auto" className="text-xs text-muted-foreground sm:text-sm">
                        {t('home.closingSoonSubtitle')}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/${lang}/deadlines`}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
                  >
                    {t('home.viewDeadlines')}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl-flip" aria-hidden="true" />
                  </Link>
                </div>

                <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {home.closingSoon.map((opportunity) => {
                    const days = opportunity.deadline
                      ? daysUntilDeadline(new Date(opportunity.deadline))
                      : null;
                    const urgency =
                      days === null
                        ? 'neutral'
                        : days <= 1
                          ? 'critical'
                          : days <= 7
                            ? 'high'
                            : 'medium';
                    const urgencyStyles = {
                      critical: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse',
                      high: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
                      medium: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
                      neutral: 'bg-muted text-muted-foreground border-border',
                    } as const;
                    const countdown =
                      days === null
                        ? ''
                        : days <= 0
                          ? t('home.deadlineToday')
                          : t('opportunities.daysLeft', { count: days });
                    return (
                      <li key={opportunity.id}>
                        <Link
                          href={`/${lang}/opportunities/${opportunity.slug}`}
                          className="group flex h-full flex-col gap-2.5 rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-500/40 hover:shadow-float"
                        >
                          <span
                            className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${urgencyStyles[urgency]}`}
                          >
                            <AlarmClock className="h-3 w-3" aria-hidden="true" />
                            {countdown && <span dir="auto">{countdown}</span>}
                          </span>
                          <span dir="auto" className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                            {opportunity.title}
                          </span>
                          <span dir="auto" className="mt-auto truncate text-xs text-muted-foreground">
                            {opportunity.organization || opportunity.categoryLabel}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
              </Reveal>
            </div>
          </section>
        )}
        {/* C — Category directory (live counts) */}
        <section aria-labelledby="home-categories" className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2
              id="home-categories"
              className="text-center text-xs font-semibold uppercase tracking-wider text-primary"
            >
              {t('opportunities.eyebrow')}
            </h2>
            <Reveal>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {home.categories.map((facet) => {
                const accent =
                  CATEGORY_ACCENTS[facet.slug] ?? DEFAULT_CATEGORY_ACCENT;
                const Icon = accent.icon;
                const label = t(
                  `opportunities.${facet.slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}`
                );
                const chipLabel = label.startsWith('opportunities.') ? facet.name : label;
                const zeroCount = facet.count === 0;

                // Zero-count categories are upcoming, not broken — render
                // them muted and non-clickable with a localized "coming soon".
                if (zeroCount) {
                  return (
                    <div
                      key={facet.slug}
                      aria-disabled="true"
                      title={t('home.comingSoon')}
                      className="flex cursor-not-allowed select-none items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-4 opacity-50 backdrop-blur-sm"
                    >
                      <span
                        aria-hidden="true"
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accent.iconBox}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span dir="auto" className="block truncate text-sm font-semibold">
                          {chipLabel}
                        </span>
                        <span dir="auto" className="block text-xs font-medium text-muted-foreground">
                          {t('home.comingSoon')}
                        </span>
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={facet.slug}
                    href={`/${lang}/opportunities?category=${facet.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-float"
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accent.iconBox}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span
                        dir="auto"
                        className="block truncate text-sm font-semibold transition-colors group-hover:text-primary"
                      >
                        {chipLabel}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {facet.count}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
            </Reveal>
          </div>
        </section>

        {/* C — Latest opportunities (the meat) */}
        <section aria-labelledby="home-latest" className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <h2 id="home-latest" dir="auto" className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {t('home.newDaily')}
                </h2>
                <p dir="auto" className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {t('home.newDailySubtitle')}
                </p>
              </div>
              <Link
                href={`/${lang}/opportunities`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                {t('home.viewAllOpportunities')}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip"
                  aria-hidden="true"
                />
              </Link>
            </div>
            </Reveal>

            {home.latest.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {home.latest.map((opportunity, i) => (
                  <Reveal key={opportunity.id} delay={Math.min(i, 4) * 0.06} y={20} className="h-full">
                    <OpportunityCard opportunity={opportunity} lang={lang} spotlight={opportunity.id === home.spotlight?.id} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="mt-8 grid place-items-center rounded-xl border border-dashed py-16 text-center text-muted-foreground">
                {t('empty.opportunities')}
              </div>
            )}
            </div>
          </section>
          </>
        )}

        {/* C2 — Impact counters (DB: Counter) */}
        {on('counters') && (
          <CountersSection
            counters={
              home.liveCounters?.length
                ? home.liveCounters.map((c) => ({
                    ...c,
                    labelI18n: null,
                    icon: c.icon,
                    order: 0,
                  }))
                : data.counters
            }
          />
        )}

        {/* D — Services strip (6 cards) */}
        {on('services') && services.length > 0 && (
          <ServicesSection
          lang={lang}
            services={services}
            heading={{
              eyebrow: t('services.eyebrow'),
              title: t('home.servicesTitle'),
              subtitle: t('home.servicesSubtitle'),
            }}
            viewAllHref={`/${lang}/services`}
          />
        )}

        {/* D2 — Featured visas (DB: Visa) */}
        {on('visas') && data.visas.length > 0 && <VisasSection visas={data.visas} />}

        {/* D3 — Promote / advertise band (menu anchor #promote) */}
        {on('promote') && <PromoteSection />}

        {/* E — Trust + testimonials (compact band) */}
        {on('testimonials') && (
          <section aria-label={t('home.trustBadge4')} className="border-y border-border/40 bg-card/30 py-16 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Reveal>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TRUST_ITEMS.map(({ icon: Icon, key }) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-3 backdrop-blur-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/15 to-chart-2/15 text-primary"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span dir="auto" className="text-sm font-semibold leading-tight">
                      {t(key)}
                    </span>
                  </div>
                ))}
              </div>
              </Reveal>

              {testimonials.length > 0 && (
                <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
                  {testimonials.map((tm) => (
                    <TestimonialCard key={tm.id} testimonial={tm} lang={lang} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* E2 — Rate card (DB: PricingPackage) + accepted payment methods (DB: PaymentMethod) */}
        {on('pricing') && data.pricingPackages.length > 0 && <PricingSection packages={data.pricingPackages} />}
        {on('payments') && data.paymentMethods.length > 0 && <PaymentsSection methods={data.paymentMethods} />}

        {/* E3 — Latest news (DB: News) */}
        {on('news') && data.news.length > 0 && <NewsSection news={data.news} lang={lang} />}

        {/* E4 — Gallery (DB: GalleryItem) + partners (DB: Partner) */}
        {on('gallery') && data.gallery.length > 0 && <GallerySection items={data.gallery} />}
        {on('partners') && data.partners.length > 0 && <PartnersSection partners={data.partners} />}

        {/* E5 — Team (DB: TeamMember) */}
        {on('team') && data.teamMembers.length > 0 && <TeamSection members={data.teamMembers} />}

        {/* E6 — FAQs (DB: Faq) */}
        {on('faqs') && data.faqs.length > 0 && <FaqsSection faqs={data.faqs} />}

        {/* E7 — Comparison (DB: ComparisonRow) */}
        {on('comparison') && data.comparisonRows.length > 0 && <ComparisonSection rows={data.comparisonRows} lang={lang} />}

        {/* E8 — Why choose us (DB: WhyChooseUsFeature) */}
        {on('whyChooseUs') && data.whyFeatures.length > 0 && <WhyChooseUsSection features={data.whyFeatures} lang={lang} />}

        {/* F — CTA + contact-lite */}
        {on('ctaBanner') && (
          data.ctaBanners.length > 0 ? (
            <CtaBannerSection banners={data.ctaBanners} />
          ) : (
            <section className="py-16 sm:py-24">
              <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
                <Reveal>
                <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-chart-2/10 p-8 text-center shadow-premium sm:p-12">
                  <h2 dir="auto" className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('home.heroTitle')} {t('home.heroHighlight')}?
                  </h2>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href={`/${lang}/contact`}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:bg-primary/90"
                    >
                      {t('contact.title')}
                      <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden="true" />
                    </Link>
                    <Link
                      href={`/${lang}/contact`}
                      className="inline-flex h-11 items-center rounded-xl border border-border bg-card/50 px-6 text-sm font-semibold transition-colors hover:bg-accent"
                    >
                      {t('home.advertise')}
                    </Link>
                  </div>
                </div>
                </Reveal>
              </div>
            </section>
          )
        )}

        {/* Contact-lite: advertise + direct contact links */}
        {on('contact') && (
          <div id="contact" className="pb-12 text-center">
            <p dir="auto" className="text-sm text-muted-foreground">
              {t('home.advertiseSubtitle')}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium">
              <Link
                href={`/${lang}/contact`}
                className="inline-flex items-center gap-1.5 text-primary transition-colors hover:underline"
              >
                {t('contact.title')}
                <ArrowRight className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
              </Link>
              <span aria-hidden="true" className="text-border">|</span>
              <Link
                href={`/${lang}/contact`}
                className="text-muted-foreground transition-colors hover:text-foreground hover:underline"
              >
                {t('home.advertise')}
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer
        settings={data.settings}
        footer={data.footer}
        socialLinks={data.socialLinks}
      />
      <FloatingSocial socials={data.socialLinks} settings={data.settings} />
      <ScrollToTop />
      <CookieBanner />
    </div>
  );
}

function TestimonialCard({ testimonial, lang }: { testimonial: Testimonial; lang: Lang }) {
  const name = getLocalizedContent(testimonial.name, testimonial.nameI18n as Record<string, string> | null, lang);
  const role = getLocalizedContent(testimonial.role, testimonial.roleI18n as Record<string, string> | null, lang);
  const company = getLocalizedContent(testimonial.company, testimonial.companyI18n as Record<string, string> | null, lang);
  const content = getLocalizedContent(testimonial.content, testimonial.contentI18n as Record<string, string> | null, lang);
  const rating = Math.min(Math.max(testimonial.rating || 0, 0), 5);

  return (
    <figure className="relative flex h-full flex-col rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur-sm">
      <Quote className="absolute end-5 top-5 h-6 w-6 text-primary/20" aria-hidden="true" />
      <div className="flex items-center gap-1" role="img" aria-label={`${rating}/5`}>
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-chart-4 text-chart-4" aria-hidden="true" />
        ))}
      </div>
      <blockquote dir="auto" className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {content}
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        {testimonial.avatar ? (
          <Image
            src={testimonial.avatar}
            alt={name}
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/30"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-2 text-sm font-bold text-primary-foreground"
          >
            {name.charAt(0)}
          </span>
        )}
        <span className="min-w-0">
          <span dir="auto" className="block truncate text-sm font-bold">{name}</span>
          {(role || company) && (
            <span dir="auto" className="block truncate text-xs text-muted-foreground">
              {[role, company].filter(Boolean).join(' · ')}
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

// ─── B0 — Daily / weekly spotlight band ───────────────────────────────────────

type SpotlightT = (key: string, params?: Record<string, string | number>) => string;

/**
 * "Opportunity of the Day" hero slot + "Scholarship of the Week" side card.
 * Both picks are deterministic per UTC day / ISO week (see opportunity-queries),
 * so the band changes every day without manual curation — the homepage always
 * has one fresh, shareable thing to look at.
 */
function SpotlightBand({
  lang,
  daily,
  weekly,
  t,
}: {
  lang: Lang;
  daily: OpportunityCardData | null;
  weekly: OpportunityCardData | null;
  t: SpotlightT;
}) {
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const countdown = (deadline: Date | null): string | null => {
    if (!deadline) return null;
    const days = daysUntilDeadline(new Date(deadline));
    if (days <= 0) return t('home.deadlineToday');
    return t('opportunities.daysLeft', { count: days });
  };

  const weeklyCard = weekly && weekly.id !== daily?.id ? weekly : null;

  return (
    <section aria-labelledby="home-spotlight" className="py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="home-spotlight" className="sr-only">
          {t('spotlight.dailyBadge')}
        </h2>
        <Reveal>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {daily && (
            <Link
              href={`/${lang}/opportunities/${daily.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.10] via-card/70 to-teal-500/[0.08] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-float sm:p-6 lg:col-span-2"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl transition-opacity group-hover:opacity-80"
              />
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('spotlight.dailyBadge')}
                </span>
                {countdown(daily.deadline) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    <AlarmClock className="h-3 w-3" aria-hidden="true" />
                    {countdown(daily.deadline)}
                  </span>
                )}
              </div>
              <h3
                dir="auto"
                className="mt-3.5 line-clamp-2 text-lg font-bold leading-snug transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-300 sm:text-xl"
              >
                {daily.title}
              </h3>
              <p dir="auto" className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {daily.organization && <span className="font-medium">{daily.organization}</span>}
                {daily.organization && daily.categoryLabel && <span aria-hidden="true">·</span>}
                {daily.categoryLabel && <span>{daily.categoryLabel}</span>}
              </p>
              {daily.summary && (
                <p dir="auto" className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {daily.summary}
                </p>
              )}
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {t('spotlight.viewApply')}
                <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" aria-hidden="true" />
              </span>
            </Link>
          )}

          {weeklyCard && (
            <Link
              href={`/${lang}/opportunities/${weeklyCard.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.09] via-card/70 to-orange-500/[0.07] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-float"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {t('spotlight.weeklyBadge')}
              </span>
              <h3
                dir="auto"
                className="mt-3.5 line-clamp-3 text-sm font-bold leading-snug transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-300"
              >
                {weeklyCard.title}
              </h3>
              <p dir="auto" className="mt-1.5 truncate text-xs text-muted-foreground">
                {weeklyCard.organization || weeklyCard.categoryLabel}
              </p>
              {countdown(weeklyCard.deadline) && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <AlarmClock className="h-3 w-3" aria-hidden="true" />
                  {countdown(weeklyCard.deadline)}
                </p>
              )}
            </Link>
          )}
        </div>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Success-story teaser — one community win as social proof between the
 * spotlight band and the closing-soon strip. Links to /success-stories.
 */
function StoryTeaser({
  lang,
  story,
  t,
}: {
  lang: Lang;
  story: StoryCard;
  t: SpotlightT;
}) {
  const Arrow = lang === 'en' ? ArrowRight : ArrowLeft;

  return (
    <section aria-labelledby="home-stories" className="py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] via-card/70 to-orange-500/[0.05] p-5 sm:p-6">
          <Quote
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 end-4 h-20 w-20 rotate-12 text-amber-500/10"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                {t('stories.eyebrow')}
              </p>
              <h2 id="home-stories" className="mt-1.5 line-clamp-1 text-base font-bold leading-snug text-foreground sm:text-lg">
                {story.title}
              </h2>
              <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                {story.excerpt}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{story.authorAlias}</span>
                {' · '}
                {translateStoryType(story.storyType, lang)}
                {' · '}
                {story.year}
              </p>
            </div>
            <Link
              href={`/${lang}/success-stories/${story.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/40 bg-card px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
            >
              {t('stories.readStory')}
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  );
}
