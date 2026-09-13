'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useLangStore } from '@/lib/lang-store';
import { translate } from '@/lib/i18n';

const KEY = 'aria-saved-jobs';

export function getSavedSlugs(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleSavedSlug(slug: string): string[] {
  const current = getSavedSlugs();
  const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('aria-saved-jobs-changed'));
  } catch {}
  return next;
}

/** Mounted flag via callback ref — avoids setState-in-effect lint errors. */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

/**
 * Bookmark toggle shown on opportunity cards. Server-rendered cards embed
 * this client island; state initializes after mount to avoid hydration
 * mismatch (localStorage is not available during SSR).
 */
export function SaveButton({ slug, className }: { slug: string; className?: string }) {
  const [saved, setSaved] = useState(false);
  const mounted = useMounted();
  const lang = useLangStore((s) => s.code);

  useEffect(() => {
    // localStorage is unavailable during SSR — subscribe to external state
    // (the custom event fires on every save change, including our initial
    // dispatch below).
    const sync = () => setSaved(getSavedSlugs().includes(slug));
    window.addEventListener('aria-saved-jobs-changed', sync);
    window.dispatchEvent(new CustomEvent('aria-saved-jobs-changed'));
    return () => window.removeEventListener('aria-saved-jobs-changed', sync);
  }, [slug]);

  const label = translate(lang, saved ? 'opportunities.savedBadge' : 'opportunities.save');

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved(toggleSavedSlug(slug).includes(slug));
      }}
      className={`grid h-8 w-8 place-items-center rounded-full border bg-background/80 backdrop-blur transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 ${
        saved && mounted ? 'border-primary text-primary' : 'border-border/60 text-muted-foreground'
      } ${className || ''}`}
    >
      <Bookmark className={`h-4 w-4 ${saved && mounted ? 'fill-current' : ''}`} />
    </button>
  );
}

/**
 * Full-width labeled variant for the opportunity DETAIL page (sidebar, mobile
 * share rows and the sticky mobile action bar). Same localStorage store as
 * SaveButton, so both stay in sync via the shared custom event.
 */
export function DetailSaveButton({
  slug,
  className = '',
}: {
  slug: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const mounted = useMounted();
  const lang = useLangStore((s) => s.code);

  useEffect(() => {
    const sync = () => setSaved(getSavedSlugs().includes(slug));
    window.addEventListener('aria-saved-jobs-changed', sync);
    window.dispatchEvent(new CustomEvent('aria-saved-jobs-changed'));
    return () => window.removeEventListener('aria-saved-jobs-changed', sync);
  }, [slug]);

  // SSR + first client render both show the unsaved look; a previously-saved
  // slug flips right after mount (same strategy as the card SaveButton).
  const isSaved = saved && mounted;
  const label = translate(lang, isSaved ? 'opportunities.savedBadge' : 'opportunities.save');

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        isSaved
          ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
          : 'border-border bg-background text-foreground/80 hover:bg-accent hover:text-foreground'
      } ${className}`}
      onClick={() => setSaved(toggleSavedSlug(slug).includes(slug))}
    >
      <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
      {label}
    </button>
  );
}
