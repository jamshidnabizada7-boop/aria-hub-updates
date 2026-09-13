'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { SectionHeading } from '../section-heading';
import { SmartImage } from '../smart-image';
import { useT } from '@/hooks/use-t';
import type { GalleryItem } from '@/lib/types';
import { cn, normalizeImageUrl } from '@/lib/utils';

export function GallerySection({ items }: { items: GalleryItem[] }) {
  const t = useT();
  const [active, setActive] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Derive categories from items
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => { if (i.category) set.add(i.category); });
    return ['all', ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  const next = () => setActive((i) => (i === null ? i : (i + 1) % filtered.length));
  const prev = () => setActive((i) => (i === null ? i : (i - 1 + filtered.length) % filtered.length));

  // Reset active when filter changes (handled in onClick)

  // Keyboard support for the lightbox
  useEffect(() => {
    if (active === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, filtered.length]);

  return (
    <section id="gallery" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('gallery.eyebrow')}
          title={t('gallery.title')}
          subtitle={t('gallery.subtitle')}
        />

        {/* Filter tabs */}
        {categories.length > 1 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setFilter(cat); setActive(null); }}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-all',
                  filter === cat
                    ? 'border-primary bg-primary text-primary-foreground shadow-float'
                    : 'border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="mt-10 grid place-items-center py-16 text-muted-foreground">{t('empty.gallery')}</div>
        ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, fi) => {
              const big = fi % 7 === 0 || fi % 7 === 3;
              return (
                <motion.button
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: (fi % 4) * 0.05 }}
                  onClick={() => setActive(fi)}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border border-border/60 shadow-premium transition-all duration-500 hover:shadow-float',
                    big ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
                  )}
                >
                  <SmartImage
                    src={normalizeImageUrl(item.url) || ''}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full"
                    imgClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    gradient="from-primary/25 via-chart-2/20 to-chart-3/20"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.category && (
                      <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <ZoomIn className="h-4 w-4" />
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active !== null && filtered[active] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
            onClick={() => setActive(null)}
            role="dialog"
            aria-modal="true"
          >
            <button className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-5 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-5 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <motion.div
              key={active}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-5xl px-4"
            >
              <img src={normalizeImageUrl(filtered[active].url) || ''} alt={filtered[active].title} className="max-h-[85vh] w-auto rounded-2xl object-contain" />
              <p className="mt-4 text-center text-sm text-white/80">{filtered[active].title}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
