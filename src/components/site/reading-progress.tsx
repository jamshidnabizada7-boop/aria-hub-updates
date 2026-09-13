'use client';

import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion';

// Reading progress bar — a slim gold brand line at the top of the viewport
// that fills as the user scrolls down the page. Grows from the inline start
// (left in LTR, right in RTL — pure CSS, no dir probing) and skips spring
// smoothing for users who prefer reduced motion.
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const reduceMotion = useReducedMotion();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  const value = reduceMotion ? scrollYProgress : smooth;

  return (
    <motion.div
      style={{ scaleX: value }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-gradient-to-r from-primary via-[#F8D898] to-chart-4 ltr:origin-left rtl:origin-right rtl:bg-gradient-to-l"
      aria-hidden
    />
  );
}
