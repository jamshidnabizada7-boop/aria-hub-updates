'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionIndicatorProps {
  sections: { id: string; label: string }[];
  /** Localized accessible name for the dot navigation. */
  navLabel?: string;
}

// Vertical dot indicator on the inline-end side that shows the current
// section and allows quick navigation. Hidden on mobile and until the hero
// has scrolled out of view. Sections whose anchors are not in the DOM
// (DB-gated homepage sections) are filtered out so no dot is ever dead.
export function SectionIndicator({ sections, navLabel }: SectionIndicatorProps) {
  const [active, setActive] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const [available, setAvailable] = useState(sections);
  const reduceMotion = useReducedMotion();

  // Keep only sections that actually rendered (homepage sections are
  // DB-toggleable — a dot pointing at a missing anchor would be a lie).
  // Measured one frame after mount (outside the effect body) so the DOM
  // is settled and React state updates are not cascaded synchronously.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setAvailable(sections.filter((s) => document.getElementById(s.id)));
    });
    return () => cancelAnimationFrame(raf);
  }, [sections]);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      setVisible(scrollY > window.innerHeight * 0.8);

      // Find active section
      let current = '';
      for (const s of available) {
        const el = document.getElementById(s.id);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.top <= window.innerHeight * 0.4 && r.bottom >= window.innerHeight * 0.4) {
            current = s.id;
          }
        }
      }
      setActive(current);
    };
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [available]);

  if (available.length === 0) return null;

  // Slide in from the screen edge the indicator lives on: inline-end = right
  // in LTR, left in RTL (the fixed position uses logical `end-5`).
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const slide = reduceMotion ? 0 : isRtl ? -20 : 20;

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ opacity: 0, x: reduceMotion ? 0 : slide }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduceMotion ? 0 : slide }}
          transition={{ duration: reduceMotion ? 0 : 0.3 }}
          className="fixed end-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-2 lg:flex"
          aria-label={navLabel || 'Section navigation'}
        >
          {available.map((s) => {
            const isActive = active === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="group flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label={s.label}
              >
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium opacity-0 transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100',
                    isActive ? 'bg-card text-foreground shadow-float' : 'bg-card/80 text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
                <span
                  className={cn(
                    'block rounded-full transition-all duration-300',
                    isActive
                      ? 'h-6 w-1.5 bg-gradient-to-b from-primary to-amber-300'
                      : 'h-1.5 w-1.5 bg-border group-hover:bg-primary/60'
                  )}
                />
              </a>
            );
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
