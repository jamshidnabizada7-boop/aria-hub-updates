'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { SectionHeading } from '../section-heading';
import { Icon } from '../icon';
import { useT } from '@/hooks/use-t';
import type { Counter } from '@/lib/types';

export function CountersSection({ counters }: { counters: Counter[] }) {
  const t = useT();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px' });

  return (
    <section id="counters" ref={ref} className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-chart-2 opacity-95" />
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-chart-3/30 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center text-white">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {t('counters.eyebrow')}
          </motion.span>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{t('counters.title')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">{t('counters.subtitle')}</p>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {counters.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center text-white"
            >
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                <Icon name={c.icon} className="h-6 w-6" />
              </div>
              <div className="text-4xl font-black sm:text-5xl" aria-label={`${c.value}${c.suffix || ''}`}>
                {inView && <CountUp value={c.value} />}
                {c.suffix}
              </div>
              <p className="mt-2 text-sm font-medium text-white/80">{c.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(value)) return;
    let start = 0;
    const duration = 1800;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setCount(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  if (!Number.isFinite(value)) return <>{String(value)}</>;
  return <span aria-hidden="true">{count.toLocaleString()}</span>;
}
