'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '../section-heading';
import { Icon } from '../icon';
import { useT } from '@/hooks/use-t';
import { useLangStore } from '@/lib/lang-store';
import { getLocalizedContent, getLocalizedArray } from '@/lib/i18n-content';
import type { PricingPackage } from '@/lib/types';
import { cn } from '@/lib/utils';

export function PricingSection({ packages }: { packages: PricingPackage[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.code);
  if (!packages.length) return null;

  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-dots opacity-30 mask-fade-b" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('pricing.eyebrow')}
          title={t('pricing.title')}
          subtitle={t('pricing.subtitle')}
        />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {packages.map((pkg, i) => {
            const name = getLocalizedContent(pkg.name, pkg.nameI18n as any, lang);
            const description = getLocalizedContent(pkg.description, pkg.descriptionI18n as any, lang);
            const features = getLocalizedArray(pkg.features, pkg.featuresI18n as any, lang);
            const isFeatured = pkg.featured;
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={cn('relative', isFeatured && 'lg:-mt-4 lg:mb-4')}
              >
                <Card
                  className={cn(
                    'relative flex h-full flex-col overflow-hidden border p-7 transition-all duration-500',
                    isFeatured
                      ? 'gradient-border border-primary/50 bg-gradient-to-b from-primary/[0.06] to-card shadow-float lg:scale-[1.03]'
                      : 'gradient-border border-border/60 bg-card/50 hover:-translate-y-1 hover:border-primary/30 hover:shadow-premium'
                  )}
                >
                  {/* Featured glow */}
                  {isFeatured && (
                    <>
                      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                      <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-chart-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-float">
                        <Sparkles className="h-3 w-3" />
                        {pkg.badge || t('pricing.popular')}
                      </div>
                    </>
                  )}

                  {/* Icon + name */}
                  <div className="relative mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-chart-2/15 text-primary">
                    <Icon name={pkg.icon} className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold">{name}</h3>
                  {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}

                  {/* Price */}
                  <div className="mt-5 flex items-end gap-1">
                    <span className="text-4xl font-black tracking-tight text-gradient-static">{pkg.price}</span>
                    <span className="mb-1 text-sm text-muted-foreground">/ {pkg.period}</span>
                  </div>

                  {/* Features */}
                  <ul className="mt-6 flex-1 space-y-3">
                    {features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-sm">
                        <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full', isFeatured ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    asChild
                    className={cn(
                      'mt-7 h-12 w-full rounded-xl text-sm font-semibold transition-all',
                      isFeatured
                        ? 'bg-gradient-to-r from-primary to-chart-2 shadow-float hover:opacity-90'
                        : 'bg-card border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground'
                    )}
                  >
                    <a href={pkg.ctaUrl || '#contact'}>
                      {pkg.ctaLabel || t('pricing.choose')}
                      <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
                    </a>
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t('pricing.includesNote')} <a href="#contact" className="font-semibold text-primary hover:underline">{t('pricing.contactUs')}</a>.
        </p>
      </div>
    </section>
  );
}
