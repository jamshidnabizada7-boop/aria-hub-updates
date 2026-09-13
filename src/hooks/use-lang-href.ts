'use client';

import { useLangStore } from '@/lib/lang-store';
import { useLangContext } from '@/components/site/lang-context';
import { langHref } from '@/lib/lang-route';

/**
 * Returns a function that prefixes internal (root-relative) hrefs with the
 * current language, e.g. '/services' -> '/fa/services'.
 * Anchors (#...), external URLs and already-prefixed paths pass through.
 */
export function useLangHref() {
  // Context (URL language) first — SSR-safe; store as fallback outside /[lang].
  const ctxLang = useLangContext();
  const storeCode = useLangStore((s) => s.code);
  const lang = ctxLang ?? storeCode;
  return (href: string) => langHref(lang, href);
}
