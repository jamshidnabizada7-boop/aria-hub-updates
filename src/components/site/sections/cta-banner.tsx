'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MagneticButton } from '../magnetic-button';
import { useT } from '@/hooks/use-t';
import { useLangStore } from '@/lib/lang-store';
import { useLangHref } from '@/hooks/use-lang-href';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { CtaBanner as CtaBannerType } from '@/lib/types';

export function CtaBannerSection({ banners }: { banners: CtaBannerType[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.code);
  const hrefFn = useLangHref();
  if (!banners.length) return null;
  const banner = banners[0];

  const title = getLocalizedContent(banner.title, banner.titleI18n as any, lang);
  const subtitle = getLocalizedContent(banner.subtitle, banner.subtitleI18n as any, lang);
  const buttonText = getLocalizedContent(banner.buttonText, banner.buttonTextI18n as any, lang);

  return (
    <section id="cta-banner" className="relative py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2.5rem] border border-primary/30 bg-gradient-to-br from-primary via-primary to-chart-2 p-6 text-center shadow-premium sm:p-12"
        >
          {/* Decorative layers */}
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float-slow" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-chart-3/20 blur-3xl animate-float-slow" style={{ animationDelay: '2s' }} />
          {/* Shimmer sweep */}
          <div className="shimmer absolute inset-0" />

          <div className="relative">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mx-auto max-w-2xl text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl"
            >
              {title}
            </motion.h2>

            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mx-auto mt-4 max-w-xl text-pretty text-white/85 sm:text-lg"
              >
                {subtitle}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <MagneticButton
                href={hrefFn(banner.buttonUrl)}
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-base font-semibold text-primary shadow-float transition-transform hover:scale-[1.02]"
              >
                <Calendar className="h-4 w-4" />
                {buttonText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
              </MagneticButton>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/75">
                <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> {t('ctaBanner.noCommitment')}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {t('ctaBanner.minSession')}</span>
                <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> {t('ctaBanner.expertAdvice')}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
