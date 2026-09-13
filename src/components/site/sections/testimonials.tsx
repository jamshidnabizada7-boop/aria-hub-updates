'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionHeading } from '../section-heading';
import { useT } from '@/hooks/use-t';
import { useLangStore } from '@/lib/lang-store';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { Testimonial } from '@/lib/types';
import { cn } from '@/lib/utils';

function AvatarWithFallback({ src, name }: { src: string; name: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-2 font-bold text-primary-foreground">
        {name.charAt(0)}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/30" />
  );
}

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.code);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const items = testimonials.length ? testimonials : [];

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % items.length), 5500);
    return () => clearInterval(id);
  }, [paused, items.length]);

  if (items.length === 0) {
    return (
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={t('testimonials.eyebrow')}
            title={t('testimonials.title')}
            subtitle={t('testimonials.subtitle')}
          />
          <div className="mt-14 grid place-items-center py-16 text-muted-foreground">{t('empty.testimonials')}</div>
        </div>
      </section>
    );
  }
  const current = items[active];
  const rating = Math.min(Math.max(current.rating || 0, 0), 5);
  
  // Get localized content
  const name = getLocalizedContent(current.name, current.nameI18n as any, lang);
  const role = getLocalizedContent(current.role, current.roleI18n as any, lang);
  const company = getLocalizedContent(current.company, current.companyI18n as any, lang);
  const content = getLocalizedContent(current.content, current.contentI18n as any, lang);

  return (
    <section
      className="relative overflow-hidden py-24 sm:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('testimonials.eyebrow')}
          title={t('testimonials.title')}
          subtitle={t('testimonials.subtitle')}
        />

        <div className="relative mt-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.4 }}
              className="glass-card relative mx-auto max-w-3xl rounded-3xl p-8 text-center shadow-premium sm:p-12"
            >
              <Quote className="mx-auto mb-6 h-10 w-10 text-primary/30" />
              <div className="mb-4 flex justify-center gap-1">
                {[...Array(rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-chart-4 text-chart-4" />
                ))}
              </div>
              <p className="text-balance text-lg leading-relaxed text-foreground sm:text-xl">
                “{content}”
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                {current.avatar ? (
                  <AvatarWithFallback src={current.avatar} name={name} />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-2 font-bold text-primary-foreground">
                    {name.charAt(0)}
                  </div>
                )}
                <div className="text-left">
                  <p className="font-bold">{name}</p>
                  <p className="text-sm text-muted-foreground">{role}{company ? ` · ${company}` : ''}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setActive((a) => (a - 1 + items.length) % items.length)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/50 transition-colors hover:bg-accent"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5 rtl-flip" />
            </button>
            <div className="flex gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className="flex h-8 w-8 items-center justify-center"
                  aria-label={`Go to testimonial ${i + 1}`}
                >
                  <span className={cn(
                    'h-2 rounded-full transition-all block',
                    i === active ? 'w-8 bg-primary' : 'w-2 bg-border hover:bg-foreground/30'
                  )} />
                </button>
              ))}
            </div>
            <button
              onClick={() => setActive((a) => (a + 1) % items.length)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/50 transition-colors hover:bg-accent"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5 rtl-flip" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
