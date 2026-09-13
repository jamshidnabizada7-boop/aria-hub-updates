'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface ConfettiProps {
  active: boolean;
}

// Lightweight CSS-based confetti burst. Renders 24 colored particles that
// animate outward from the center when `active` is true.
export function Confetti({ active }: ConfettiProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        angle: (i / 24) * Math.PI * 2,
        color: ['#0A66C2', '#0EA5E9', '#22D3EE', '#f59e0b', '#10b981', '#8b5cf6'][i % 6],
        size: 6 + Math.random() * 6,
        distance: 80 + Math.random() * 60,
        delay: Math.random() * 0.1,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
      <AnimatePresence>
        {active && (
          <>
            {particles.map((p) => (
              <motion.span
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(p.angle) * p.distance,
                  y: Math.sin(p.angle) * p.distance - 20,
                  opacity: 0,
                  scale: 0.3,
                  rotate: Math.random() * 720 - 360,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
                className="absolute rounded-sm"
                style={{ width: p.size, height: p.size, backgroundColor: p.color }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
