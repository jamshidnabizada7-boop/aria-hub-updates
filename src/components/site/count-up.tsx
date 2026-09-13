'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Animated count-up number (client island).
 *
 * Server-renders the final value (SEO/no-JS correct), then on hydration —
 * before first paint — resets to 0 and eases up to the value by writing
 * directly to the DOM node (no re-renders per frame).
 * Respects prefers-reduced-motion (keeps the SSR value).
 */
export function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || value <= 0) return; // keep the SSR value

    let frame = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(eased * value));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    el.textContent = '0';
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums" aria-label={String(value)}>
      {value}
    </span>
  );
}
