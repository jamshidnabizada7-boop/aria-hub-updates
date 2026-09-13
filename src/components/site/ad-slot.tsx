'use client';

import { useEffect } from 'react';

/**
 * AdSlot — policy-safe AdSense placement.
 *
 * RENDERS NOTHING unless a real ad-unit slot id is provided (env-configured).
 * This is deliberate AdSense policy hygiene: no empty gray boxes or fake
 * "Advertisement" placeholders on live pages (bad UX + policy risk during
 * review). When the owner creates ad units in the AdSense console, they set:
 *
 *   NEXT_PUBLIC_ADSENSE_SLOT_LISTING  → in-feed unit (opportunities listing)
 *   NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_MID  → detail page, after summary
 *   NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_END  → detail page, end of content
 *
 * The global adsbygoogle.js loader lives in /[lang]/layout.tsx (public pages
 * only — /admin never loads ads, see that file).
 */
export function AdSlot({
  slot,
  format = 'auto',
  layoutKey,
  className = '',
  label,
}: {
  /** AdSense ad-unit id (digits). No slot → renders nothing. */
  slot?: string;
  format?: string;
  /** For "fluid" in-feed units: data-ad-layout-key, e.g. "-fb+5w+4e-db+86" */
  layoutKey?: string;
  className?: string;
  /** Accessible label for screen readers (visually hidden). */
  label?: string;
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-5960471686203476';

  useEffect(() => {
    if (!slot) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle.js not loaded (blocked/offline) — slot stays empty, no error spam
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <aside aria-label={label || 'Advertisement'} className={`w-full ${className}`}>
      <span className="sr-only">{label || 'Advertisement'}</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        {...(format === 'fluid' && layoutKey
          ? { 'data-ad-format': 'fluid', 'data-ad-layout-key': layoutKey }
          : { 'data-ad-format': format })}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
