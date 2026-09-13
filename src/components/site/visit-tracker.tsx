'use client';

import { useEffect } from 'react';

/**
 * Records a homepage visit once per browser session (guarded against
 * React StrictMode double-fire). Extracted from the old client-side Home
 * wrapper so the homepage shell can be a server component.
 */
export function VisitTracker({ path = '/' }: { path?: string }) {
  useEffect(() => {
    if (sessionStorage.getItem('aria-tracked')) return;
    sessionStorage.setItem('aria-tracked', '1');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  }, [path]);

  return null;
}
