'use client';

import { motion } from 'framer-motion';
import { Check, X, Minus, Sparkles } from 'lucide-react';
import { SectionHeading } from '../section-heading';
import { useT } from '@/hooks/use-t';
import { useLangStore } from '@/lib/lang-store';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { ComparisonRow } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ComparisonSection({ rows }: { rows: ComparisonRow[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.code);
  if (!rows.length) return null;

  return (
    <section id="comparison" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-dots opacity-30 mask-fade-b" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('comparison.eyebrow')}
          title={t('comparison.title')}
          subtitle={t('comparison.subtitle')}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.6 }}
          className="mt-14 overflow-hidden rounded-3xl border border-border/60 shadow-premium"
        >
          {/* Header row */}
          <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 border-b border-border/60 bg-gradient-to-r from-primary/10 to-chart-2/10 p-5 sm:gap-4 sm:p-6">
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('comparison.feature')}
            </div>
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-chart-2 px-3 py-1 text-xs font-bold text-primary-foreground shadow-float">
                <Sparkles className="h-3 w-3" />
                {t('comparison.aria')}
              </span>
            </div>
            <div className="text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('comparison.others')}
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '0px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={cn(
                'grid grid-cols-[1.5fr_1fr_1fr] items-center gap-2 p-5 transition-colors hover:bg-accent/30 sm:gap-4 sm:p-6',
                i % 2 === 1 && 'bg-accent/10'
              )}
            >
              <div className="text-sm font-medium">{getLocalizedContent(row.feature, row.featureI18n, lang)}</div>
              <div className="text-center">
                <ValueCell value={getLocalizedContent(row.ariaValue, row.ariaValueI18n, lang)} positive />
              </div>
              <div className="text-center">
                <ValueCell value={getLocalizedContent(row.othersValue, row.othersValueI18n, lang)} positive={false} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function ValueCell({ value, positive }: { value: string; positive: boolean }) {
  const isCheck = value === '✓' || value.toLowerCase() === 'yes';
  const isDash = value === '—' || value === '-' || value.toLowerCase() === 'no';

  if (isCheck) {
    return (
      <span className={cn('inline-grid h-8 w-8 place-items-center rounded-full', positive ? 'bg-chart-3/15 text-chart-3' : 'bg-destructive/15 text-destructive')}>
        {positive ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </span>
    );
  }
  if (isDash) {
    return (
      <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground">
        <Minus className="h-4 w-4" />
      </span>
    );
  }
  // Text value like "Hidden fees", "Extra cost"
  const isNegative = /hidden|extra|basic|business hours|~|%/i.test(value);
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
      isNegative ? 'bg-destructive/10 text-destructive' : 'bg-chart-3/10 text-chart-3'
    )}>
      {isNegative && <X className="h-3 w-3" />}
      {value}
    </span>
  );
}
