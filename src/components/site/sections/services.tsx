'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '../section-heading';
import { Icon } from '../icon';
import { SmartImage } from '../smart-image';
import { useT } from '@/hooks/use-t';
import { useLangHref } from '@/hooks/use-lang-href';
import { useLangStore } from '@/lib/lang-store';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { Service } from '@/lib/types';

/** Optional server-translated heading overrides (homepage passes these). */
export interface ServicesHeading {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

/**
 * Compact services strip. Each card deep-links to the service's anchor on
 * the /services page (/{lang}/services#{slug}) instead of opening a modal,
 * so menu children and cards share the same destination.
 */
export function ServicesSection({
  services,
  heading,
  viewAllHref,
  className,
}: {
  services: Service[];
  heading?: ServicesHeading;
  /** Absolute (already lang-prefixed) href for the "view all" button. */
  viewAllHref?: string;
  className?: string;
}) {
  const t = useT();

  return (
    <section id="services" className={className ?? 'relative py-14 sm:py-16'}>
      <div className="absolute inset-0 -z-10 bg-dots opacity-[0.4] mask-fade-b" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={heading?.eyebrow ?? t('services.eyebrow')}
          title={heading?.title ?? t('services.title')}
          subtitle={heading?.subtitle ?? t('services.subtitle')}
        />
        {services.length === 0 ? (
          <div className="mt-10 grid place-items-center py-12 text-muted-foreground">
            {t('empty.services')}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px' }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
              >
                <ServiceCard service={s} />
              </motion.div>
            ))}
          </div>
        )}

        {viewAllHref && services.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full px-8 font-semibold"
            >
              <Link href={viewAllHref}>{t('section.viewAll')}</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const t = useT();
  const hrefFn = useLangHref();
  const lang = useLangStore((s) => s.code);

  // Get localized content
  const title = getLocalizedContent(service.title, service.titleI18n as any, lang);
  const excerpt = getLocalizedContent(service.excerpt, service.excerptI18n as any, lang);

  // 3D tilt on mouse move
  const handleMove = (e: React.MouseEvent) => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg) translateY(-6px)`;
  };
  const handleLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = '';
  };

  return (
    <Link
      ref={ref}
      href={`${hrefFn('/services')}#${service.slug}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="group relative block w-full overflow-hidden rounded-3xl text-left shadow-premium transition-[transform,box-shadow] duration-200 will-change-transform hover:shadow-float"
      style={{ transition: 'transform 0.2s ease, box-shadow 0.5s ease' }}
    >
      <Card className="relative h-full overflow-hidden border-border/60 p-0">
        {/* image */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <SmartImage
            src={service.image}
            alt={title}
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            gradient="from-primary/25 via-chart-2/15 to-chart-3/15"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          {service.icon && (
            <div className="absolute -bottom-5 start-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-float ring-4 ring-card">
              <Icon name={service.icon} className="h-5 w-5" />
            </div>
          )}
          {service.featured && (
            <span className="absolute end-3 top-3 rounded-full bg-chart-4/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black backdrop-blur-sm">
              Featured
            </span>
          )}
        </div>
        {/* content */}
        <div className="flex h-full flex-col p-5 pt-8">
          <div className="flex items-start justify-between gap-2">
            <h3 dir="auto" className="text-lg font-bold leading-snug transition-colors group-hover:text-primary">
              {title}
            </h3>
            {service.price && (
              <span className="shrink-0 rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
                {service.price}
              </span>
            )}
          </div>
          <p dir="auto" className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
            {excerpt}
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {t('common.viewDetails')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
          </span>
        </div>
        {/* hover glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </Card>
    </Link>
  );
}
