'use client';

import { motion } from 'framer-motion';
import { SectionHeading } from '../section-heading';
import { useT } from '@/hooks/use-t';
import type { Partner } from '@/lib/types';

export function PartnersSection({ partners }: { partners: Partner[] }) {
  const t = useT();
  if (!partners.length) return null;
  const doubled = [...partners, ...partners];

  return (
    <section id="partners" className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('partners.eyebrow')}
          title={t('partners.title')}
          subtitle={t('partners.subtitle')}
        />
      </div>
      <div className="relative mt-12 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-background to-transparent" />
        <motion.div
          className="flex w-max gap-6"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        >
          {doubled.map((p, i) => (
            <div
              key={i}
              className="flex h-20 w-52 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card/50 px-6 backdrop-blur-sm transition-colors hover:border-primary/40"
            >
              {p.logo ? (
                <img src={p.logo} alt={p.name} className="max-h-10 w-auto object-contain" />
              ) : (
                <span className="text-lg font-bold text-muted-foreground transition-colors hover:text-foreground">{p.name}</span>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
