'use client';

import { motion } from 'framer-motion';
import { Megaphone, TrendingUp, Eye, MousePointerClick, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-t';

export function PromoteSection() {
  const t = useT();
  return (
    <section id="promote" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-primary via-primary to-chart-2 p-8 shadow-premium sm:p-14"
        >
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-chart-3/20 blur-3xl" />

          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                <Megaphone className="h-3.5 w-3.5" /> {t('promote.eyebrow')}
              </span>
              <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                {t('promote.title')}
              </h2>
              <p className="mt-4 max-w-lg text-white/85">{t('promote.subtitle')}</p>
              <Button asChild size="lg" className="mt-8 h-12 rounded-xl bg-white px-6 text-base font-semibold text-primary shadow-float hover:bg-white/90">
                <a href="#contact">
                  {t('promote.cta')}
                  <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
                </a>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Eye, value: '50K+', label: t('promote.monthlyReach') },
                { icon: MousePointerClick, value: '4.2%', label: t('promote.avgCtr') },
                { icon: TrendingUp, value: '3x', label: t('promote.roiGrowth') },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center text-white backdrop-blur-sm"
                >
                  <s.icon className="mx-auto mb-2 h-5 w-5" />
                  <p className="text-2xl font-black">{s.value}</p>
                  <p className="text-[11px] text-white/80">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
