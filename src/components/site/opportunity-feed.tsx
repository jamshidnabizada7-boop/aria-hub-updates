'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BellRing, ChevronDown, Flag, Loader2 } from 'lucide-react';
import { OpportunityCard } from './opportunity-card';
import { Skeleton } from '@/components/ui/skeleton';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';
import type { OpportunityCardData } from '@/lib/opportunity-shared';
import { cn } from '@/lib/utils';

const PER_PAGE = 12;

/** Wire format from /api/opportunities/list — dates travel as ISO strings. */
type RawItem = Omit<OpportunityCardData, 'deadline' | 'createdAt'> & {
  deadline: string | null;
  createdAt: string;
};

function reviveItem(raw: RawItem): OpportunityCardData {
  return {
    ...raw,
    deadline: raw.deadline ? new Date(raw.deadline) : null,
    createdAt: new Date(raw.createdAt),
  };
}

export interface FeedQuery {
  category: string;
  q: string;
  location: string;
  deadline: string;
  sort: string;
  show: string;
}

/**
 * Client island owning the listing grid: infinite scroll (IntersectionObserver)
 * with an accessible "Load more" fallback, skeleton placeholders while
 * fetching, and an honest end-of-feed marker (no infinite dead scrolling).
 * Page 1 is server-rendered for SEO/no-JS; pages 2+ come from the DB API.
 */
export function OpportunityFeed({
  lang,
  initialItems,
  initialTotalPages,
  spotlightId,
  query,
  adSlot,
  className,
}: {
  lang: Lang;
  initialItems: OpportunityCardData[];
  initialTotalPages: number;
  /** Daily-spotlight opportunity id (for the card badge). */
  spotlightId: string | null;
  /** Active filters — echoed to the API for pages 2+. */
  query: FeedQuery;
  /** Server-rendered node (in-feed ad) inserted after the 4th card. */
  adSlot?: ReactNode;
  className?: string;
}) {
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(lang, key, params),
    [lang]
  );

  const [items, setItems] = useState(initialItems);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMore = page < totalPages;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || page >= totalPages) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const sp = new URLSearchParams({
        lang,
        page: String(page + 1),
        category: query.category,
        q: query.q,
        location: query.location,
        deadline: query.deadline,
        sort: query.sort,
        show: query.show,
      });
      const res = await fetch(`/api/opportunities/list?${sp.toString()}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        items: RawItem[];
        totalPages: number;
      };
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const fresh = data.items
          .map(reviveItem)
          .filter((item) => !seen.has(item.id));
        return [...prev, ...fresh];
      });
      setTotalPages(data.totalPages);
      setPage((p) => p + 1);
    } catch {
      // Honest failure state: keep the loaded cards, require an explicit retry.
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [lang, page, query, totalPages]);

  // Auto-load when the sentinel scrolls near the viewport (JS users).
  // Reduced-motion users still get infinite scroll — it is data loading,
  // not animation — but the appended cards skip their entrance animation.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !error) {
          void loadMore();
        }
      },
      { rootMargin: '480px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, error]);

  const cardClasses =
    'animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none';

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {items.map((opportunity, idx) => {
          const nodes = [
            <div key={opportunity.id} className="h-full">
              <OpportunityCard
                opportunity={opportunity}
                lang={lang}
                spotlight={opportunity.id === spotlightId}
                className={idx >= PER_PAGE ? cardClasses : undefined}
              />
            </div>,
          ];
          // In-feed ad after the 4th card (first page only — server-rendered
          // node passed down so the AdSense client hook stays intact).
          if (idx === 3 && adSlot) {
            nodes.push(
              <div key="in-feed-ad" className="md:col-span-2">
                {adSlot}
              </div>
            );
          }
          return nodes;
        })}

        {/* Skeleton cards while the next page loads */}
        {loading &&
          [0, 1].map((i) => (
            <div
              key={`skeleton-${i}`}
              className="flex h-full flex-col overflow-hidden rounded-xl border bg-card"
              aria-hidden="true"
            >
              <div className="flex items-center gap-3 py-3 pe-4 ps-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <div className="mt-auto flex gap-2 pt-1">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Screen-reader announcement when a page of cards lands */}
      <p aria-live="polite" className="sr-only">
        {loading ? t('opportunities.loadingMore') : ''}
      </p>

      {/* Sentinel watched by the IntersectionObserver */}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />}

      {/* Accessible fallback / retry — always keyboard reachable */}
      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-primary/40 bg-card px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? t('opportunities.loadingMore') : t('opportunities.loadMore')}
          </button>
          {error && (
            <p dir="auto" role="alert" className="text-xs font-medium text-destructive">
              {t('alerts.error')}
            </p>
          )}
        </div>
      )}

      {/* End of feed — honest marker + alert CTA instead of dead scrolling */}
      {!hasMore && items.length > 0 && (
        <div className="relative mt-12 overflow-hidden rounded-2xl border border-dashed border-amber-500/30 py-10 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/[0.07] to-transparent"
          />
          <span
            aria-hidden="true"
            className="relative grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto"
          >
            <Flag className="h-6 w-6" />
          </span>
          <p dir="auto" className="relative mt-4 text-base font-bold">
            {t('opportunities.endOfFeed')}
          </p>
          <p dir="auto" className="relative mt-1 text-sm text-muted-foreground">
            {t('opportunities.endOfFeedHint')}
          </p>
          <a
            href="#alerts"
            className="relative mt-5 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 active:scale-[0.98]"
          >
            <BellRing className="h-4 w-4" aria-hidden="true" />
            {t('opportunities.getAlerts')}
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Select that submits its owning form on change (progressive enhancement —
 * the form still works via its submit button without JS).
 */
export function AutoSubmitSelect({
  name,
  defaultValue,
  ariaLabel,
  className,
  children,
}: {
  name: string;
  defaultValue: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      className={className}
      onChange={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.submit();
      }}
    >
      {children}
    </select>
  );
}
