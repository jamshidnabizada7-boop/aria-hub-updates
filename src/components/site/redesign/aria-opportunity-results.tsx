'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { AriaOpportunityCard } from './aria-opportunity-card';
import type { OpportunityCardData } from '@/lib/opportunity-shared';
import type { Lang } from '@/lib/lang-route';

type WireItem = Omit<OpportunityCardData, 'deadline' | 'createdAt'> & {
  deadline: string | null;
  createdAt: string;
};
export type AriaFeedFilters = {
  category: string; q: string; country: string; province: string;
  deadline: string; sort: string; show: string;
};
const copy = {
  en: { more:'Load more opportunities', loading:'Loading opportunities', error:'Could not load more opportunities.', retry:'Try again', end:'You have reached the end.' },
  fa: { more:'نمایش فرصت‌های بیشتر', loading:'در حال بارگذاری فرصت‌ها', error:'دریافت فرصت‌های بیشتر ممکن نشد.', retry:'تلاش دوباره', end:'به پایان فهرست رسیدید.' },
  ps: { more:'نور فرصتونه وښایئ', loading:'فرصتونه راښکته کېږي', error:'نور فرصتونه ترلاسه نه شول.', retry:'بیا هڅه وکړئ', end:'د لړلیک پای ته ورسېد.' },
} as const;
const revive = (raw: WireItem): OpportunityCardData => ({
  ...raw, deadline: raw.deadline ? new Date(raw.deadline) : null,
  createdAt: new Date(raw.createdAt),
});
export function AriaOpportunityResults({
  lang, initialItems, initialPage, totalPages, filters,
}: {
  lang: Lang; initialItems: OpportunityCardData[]; initialPage:number;
  totalPages:number; filters:AriaFeedFilters;
}) {
  const [items, setItems] = useState(initialItems);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const nextController = useRef<AbortController|null>(null);
  const loading = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; nextController.current?.abort(); };
  }, []);
  const more = currentPage < totalPages;
  const loadMore = useCallback(async () => {
    if (loading.current || currentPage >= totalPages) return;
    loading.current = true;
    setPending(true);
    setError(false);
    const controller = new AbortController();
    nextController.current = controller;
    try {
      const search = new URLSearchParams({ ...filters, lang, page: String(currentPage + 1) });
      const response = await fetch('/api/opportunities/list?' + search.toString(), {
        credentials: 'same-origin', signal: controller.signal,
      });
      if (!response.ok) throw new Error('fetch failed');
      const result = await response.json() as {items:WireItem[]; totalPages:number};
      if (!Array.isArray(result.items)) throw new Error('invalid feed');
      if (!mounted.current || controller.signal.aborted) return;
      setItems(prev => {
        const ids = new Set(prev.map(i=>i.id));
        const additional = result.items.map(revive).filter(i=>!ids.has(i.id));
        return [...prev, ...additional];
      });
      // Server pagination is the source of truth; don't invent total page numbers.
      setCurrentPage(n => n + 1);
    } catch (err) {
      if (!controller.signal.aborted && mounted.current) setError(true);
    } finally {
      if (mounted.current) setPending(false);
      if (nextController.current === controller) nextController.current = null;
      loading.current = false;
    }
  }, [filters,lang,currentPage,totalPages]);
  const w=copy[lang];
  return (
    <section aria-label={lang === 'en' ? 'Opportunity results' : lang === 'fa' ? 'نتایج فرصت‌ها' : 'د فرصتونو پایلې'}>
      <div className="aria-directory-grid">
        {items.map(item => <AriaOpportunityCard key={item.id} lang={lang} item={item}/>)}
      </div>
      {more && <div className="aria-feed-more" role="status" aria-live="polite">
        {error ? <p>{w.error}</p> : null}
        <button type="button" className="aria-button aria-button--outline" onClick={()=>void loadMore()} disabled={pending}>
          {pending ? <><LoaderCircle className="aria-spin" size={16}/>{w.loading}</> : error ? w.retry : w.more}
        </button>
      </div>}
      {!more && items.length > 0 ? <p className="aria-feed-finish">{w.end}</p> : null}
    </section>
  );
}
