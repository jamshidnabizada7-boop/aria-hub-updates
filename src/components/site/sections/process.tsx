'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '../section-heading';
import { Reveal, revealItem } from '../reveal';
import { Icon } from '../icon';
import { useT } from '@/hooks/use-t';
import { useLangStore } from '@/lib/lang-store';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { ProcessStep } from '@/lib/types';

export function ProcessSection({ steps }: { steps: ProcessStep[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.code);
  if (!steps.length) return null;

  return (
    <section id="process" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/30 via-transparent to-accent/30" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('process.eyebrow')}
          title={t('process.title')}
          subtitle={t('process.subtitle')}
        />

        <div className="relative mt-16">
          {/* Connecting line for desktop */}
          <div className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block" />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, i) => {
              const title = getLocalizedContent(step.title, step.titleI18n as any, lang);
              const description = getLocalizedContent(step.description, step.descriptionI18n as any, lang);
              return (
                <motion.div
                  key={step.id}
                  variants={revealItem}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '0px' }}
                  transition={{ delay: i * 0.12 }}
                  className="relative"
                >
                  {/* Step number circle */}
                  <div className="relative z-10 mx-auto mb-6 grid h-20 w-20 place-items-center lg:mx-0">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-chart-2/10" />
                    <div className="absolute inset-0 rounded-full border border-primary/20" />
                    <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-float">
                      <Icon name={step.icon} className="h-6 w-6" />
                    </div>
                    <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-card text-xs font-black text-primary shadow-premium ring-1 ring-border">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="text-center lg:text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('process.step', { number: i + 1 })}</span>
                    <h3 className="mt-1 text-lg font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                  </div>

                  {/* Arrow between steps (desktop) */}
                  {i < steps.length - 1 && (
                    <div className="absolute -right-3 top-10 hidden -translate-y-1/2 text-primary/40 lg:block">
                      <ArrowRight className="h-5 w-5 rtl-flip" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
