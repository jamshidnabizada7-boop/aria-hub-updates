'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, CalendarPlus, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OpportunityCard } from '@/components/site/opportunity-card';
import { getSavedSlugs, toggleSavedSlug } from '@/components/site/save-button';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';
import type { OpportunityCardData } from '@/lib/opportunity-shared';

type ApiItem = Omit<OpportunityCardData, 'deadline' | 'createdAt'> & {
  deadline: string | null;
  createdAt: string | null;
};

export function SavedOpportunities({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  const refresh = useCallback(async () => {
    const slugs = getSavedSlugs();
    if (!slugs.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/opportunities/by-slugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs, lang }),
      });
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    const id = setTimeout(refresh, 50);
    const onChange = () => refresh();
    window.addEventListener('aria-saved-jobs-changed', onChange);
    return () => {
      clearTimeout(id);
      window.removeEventListener('aria-saved-jobs-changed', onChange);
    };
  }, [refresh]);

  const remove = (slug: string) => {
    toggleSavedSlug(slug);
    setItems((prev) => prev.filter((item) => item.slug !== slug));
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bookmark className="h-6 w-6 text-primary" aria-hidden="true" />
            {t('opportunities.saved')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? '' : t('opportunities.resultsCount', { count: items.length })}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/${lang}/opportunities`}>{t('opportunities.browseAll')}</Link>
        </Button>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-16 text-center">
          <SearchX className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{t('opportunities.savedEmpty')}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t('opportunities.savedEmptyHint')}
          </p>
          <Button asChild>
            <Link href={`/${lang}/opportunities`}>{t('opportunities.browseAll')}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const deadline = item.deadline ? new Date(item.deadline) : null;
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const calendarAvailable = !!deadline && deadline.getTime() >= today.getTime();
            return (
              <div key={item.id} className="relative">
                <OpportunityCard
                  opportunity={{
                    ...item,
                    deadline,
                    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
                  }}
                  lang={lang}
                />
                <button
                  type="button"
                  onClick={() => remove(item.slug)}
                  className="absolute -top-2 start-3 z-20 rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  {t('opportunities.removeSaved')}
                </button>
                {calendarAvailable && (
                  <a
                    href={`/api/opportunities/${item.slug}/calendar?lang=${lang}`}
                    download={`${item.slug}-deadline.ics`}
                    aria-label={t('detail.addCalendar')}
                    title={t('detail.addCalendar')}
                    className="absolute -top-2 end-3 z-20 grid h-6 w-6 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-destructive" role="alert">
          {t('opportunities.savedError')}
        </p>
      )}
    </div>
  );
}
