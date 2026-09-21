'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, MapPin, Building2, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '../section-heading';
import { SmartImage } from '../smart-image';
import { useT } from '@/hooks/use-t';
import { useLangHref } from '@/hooks/use-lang-href';
import { useLangStore } from '@/lib/lang-store';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { Opportunity, OpportunityCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

export function OpportunitiesSection({
  opportunities,
  categories,
  phone,
}: {
  opportunities: Opportunity[];
  categories: OpportunityCategory[];
  phone?: string | null;
}) {
  // `phone` is kept for API compatibility with the homepage props (cards now
  // deep-link to detail pages instead of opening a modal).
  void phone;

  const t = useT();
  const hrefFn = useLangHref();
  const [active, setActive] = useState<string>('all');

  // Show a single card on narrow viewports (matching the previous behaviour,
  // without setState-in-effect). Reads the viewport once on hydration.
  const isMobileViewport = useSyncExternalStore(
    () => () => {},
    () => window.innerWidth < 768,
    () => false
  );
  const visibleCount = isMobileViewport ? 1 : 6;

  const filtered = (active === 'all' ? opportunities : opportunities.filter((o) => o.category?.slug === active)).slice(0, visibleCount);
  const tabs = [{ id: 'all', name: t('common.all') }, ...categories.map((c) => ({ id: c.slug, name: c.name }))];

  return (
    <section id="opportunities" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('opportunities.eyebrow')}
          title={t('opportunities.title')}
          subtitle={t('opportunities.subtitle')}
        />

        {/* Tabs */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                active === tab.id
                  ? 'border-primary bg-primary text-primary-foreground shadow-float'
                  : 'border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="mt-10 grid place-items-center py-16 text-muted-foreground">{t('empty.opportunities')}</div>
        ) : (
        <>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((o, i) => (
                <motion.div
                  key={o.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: (i % 3) * 0.05 }}
                >
                  <OpportunityCard opportunity={o} t={t} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-12 flex justify-center">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-primary to-chart-2 px-8 font-semibold shadow-float">
              <Link href={hrefFn('/opportunities')}>{t('opportunities.viewAll') || 'View All Opportunities'}</Link>
            </Button>
          </div>
        </>
        )}
      </div>
    </section>
  );
}

function OpportunityCard({ opportunity, t }: { opportunity: Opportunity; t: (k: string) => string }) {
  const lang = useLangStore((s) => s.code);

  // Get localized content. Cards show a 2-line snippet — prefer the compact
  // aiSummary (getSiteData no longer ships full 3-language descriptions to
  // cut hosted-DB transfer); fall back to description when present.
  const title = getLocalizedContent(opportunity.title, opportunity.titleI18n as any, lang);
  const o = opportunity as any;
  const description =
    getLocalizedContent(o.aiSummary ?? '', o.aiSummaryI18n, lang) ||
    getLocalizedContent(o.description ?? '', o.descriptionI18n, lang);

  const deadline = opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : null;
  const plainDescription = description ? description.replace(/<[^>]*>?/gm, '') : '';

  // Apply goes to the employer's own channel (email / form / portal).
  // The scraped source page is NEVER exposed to users — admin-only.
  const applyLink = opportunity.applyUrl || null;
  const detailHref = `/${lang}/opportunities/${opportunity.slug}`;

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-border/60 p-0 shadow-premium transition-all duration-500 hover:-translate-y-1.5 hover:shadow-float">
      <Link href={detailHref} className="block w-full text-start" aria-label={title}>
        <div className="relative aspect-[16/9] overflow-hidden">
          <SmartImage
            src={opportunity.image}
            alt={title}
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            gradient="from-primary/30 via-chart-2/20 to-chart-3/20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          {opportunity.category && (
            <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground backdrop-blur-sm">
              {opportunity.category.name}
            </span>
          )}
          {opportunity.featured && (
            <span className="absolute right-3 top-3 rounded-full bg-chart-4 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
              Featured
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link href={detailHref} className="block">
          <h3 dir="auto" className="line-clamp-2 text-base font-bold leading-tight transition-colors group-hover:text-primary">{title}</h3>
        </Link>
        <p dir="auto" className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-2">{plainDescription}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-muted-foreground">
          {opportunity.organization && (
            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{opportunity.organization}</span>
          )}
          {opportunity.country && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{opportunity.country}</span>
          )}
        </div>
        {deadline && (
          <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-accent/60 px-3 py-1.5 text-xs font-medium">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">{t('opportunities.deadline')}:</span>
            <span className="font-semibold">{deadline}</span>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1 rounded-lg text-xs">
            <Link href={detailHref}>{t('detail.viewDetails')}</Link>
          </Button>
          {applyLink && (
            <Button asChild size="sm" className="flex-1 rounded-lg bg-gradient-to-r from-primary to-chart-2 text-xs">
              <a href={applyLink} target="_blank" rel="noopener noreferrer">
                {t('opportunities.apply')}
                <ArrowUpRight className="ms-1 h-3.5 w-3.5 rtl-flip" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
