'use client';

import { useEffect, useState } from 'react';

// A subtle global cursor spotlight that follows the mouse across the page,
// adding a premium ambient glow. Only visible on devices with a fine pointer.
export function CursorSpotlight() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Check if fine pointer is available on mount
    setEnabled(window.matchMedia('(pointer: fine)').matches);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setPos({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-500"
      style={{
        background: `radial-gradient(500px circle at ${pos.x}px ${pos.y}px, color-mix(in oklab, var(--primary) 8%, transparent), transparent 65%)`,
      }}
      aria-hidden
    />
  );
}
