'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, X, ArrowRight, Clock, TrendingUp, FileText, Briefcase, Globe, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useT } from '@/hooks/use-t';
import { useLangHref } from '@/hooks/use-lang-href';
import { useLangStore } from '@/lib/lang-store';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: string;
  title: string;
  subtitle: string;
  url: string;
  image: string | null;
  badge?: string;
}

const RECENT_KEY = 'aria-recent-searches';
const MAX_RECENT = 6;

const TYPE_KEY: Record<string, string> = {
  Opportunity: 'search.type.opportunity',
  Service: 'search.type.service',
  Visa: 'search.type.visa',
};

const TYPE_STYLE: Record<string, string> = {
  Opportunity: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20',
  Service: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
  Visa: 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20',
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Opportunity: Briefcase,
  Service: Sparkles,
  Visa: Globe,
};

/** Popular quick searches per language — gives first-time users an instant path. */
const QUICK: Record<string, string[]> = {
  en: ['scholarship', 'teacher', 'finance', 'internship'],
  fa: ['بورسیه', 'معلم', 'مالی', 'کارآموزی'],
  ps: ['بورس', 'ښوونکی', 'مالي', 'روزنه'],
};

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  try {
    const next = [q, ...loadRecent().filter((x) => x !== q)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* private mode etc. */ }
}

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1); // keyboard navigation index
  const [recent, setRecent] = useState<string[]>([]);
  const t = useT();
  const hrefFn = useLangHref();
  const lang = useLangStore((s) => s.code);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
      // reset transient state each time the dialog opens
      setActive(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ('');
      setResults([]);
      setActive(-1);
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setActive(-1);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&lang=${lang}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setActive(data.results?.length ? 0 : -1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [q, lang]);

  const commitSearch = useCallback(
    (term: string) => {
      if (term.trim().length >= 2) {
        saveRecent(term.trim());
        setRecent(loadRecent());
      }
    },
    []
  );

  const go = useCallback(
    (url: string) => {
      commitSearch(q);
      onOpenChange(false);
      window.location.href = hrefFn(url);
    },
    [commitSearch, q, onOpenChange, hrefFn]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && active >= 0 && results[active]) {
      e.preventDefault();
      go(results[active].url);
    }
  };

  // scroll active item into view during keyboard nav
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const quick = QUICK[lang] ?? QUICK.en;
  const showSuggestions = q.trim().length < 2;

  /** Translated type label with graceful fallback to the raw type name. */
  const typeLabel = (type: string) => {
    const key = TYPE_KEY[type];
    if (!key) return type;
    const label = t(key);
    return label.startsWith('search.') ? type : label;
  };

  const SuggestionRow = ({ label, icon: Icon, onClick }: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition-colors hover:bg-accent"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span dir="auto" className="truncate font-medium">{label}</span>
      <ArrowRight className="ms-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/60 rtl-flip" aria-hidden="true" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0 top-[15%] translate-y-0"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">{t('search.placeholder')}</DialogTitle>

        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && active < 0 && q.trim().length >= 2) commitSearch(q); }}
            placeholder={t('search.placeholder')}
            className="h-14 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
          {q && (
            <button
              onClick={() => { setQ(''); inputRef.current?.focus(); }}
              aria-label={t('search.clear')}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto" ref={listRef}>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {t('search.searching')}
            </div>
          )}

          {/* Suggestions (recent + quick) */}
          {!loading && showSuggestions && (
            <div className="p-2">
              {recent.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-3 pb-1 pt-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('search.recents')}
                    </span>
                    <button
                      onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
                      className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                    >
                      {t('search.clearRecents')}
                    </button>
                  </div>
                  {recent.map((term) => (
                    <SuggestionRow
                      key={`r-${term}`}
                      label={term}
                      icon={Clock}
                      onClick={() => setQ(term)}
                    />
                  ))}
                </>
              )}
              <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('search.popular')}
              </div>
              {quick.map((term) => (
                <SuggestionRow
                  key={`q-${term}`}
                  label={term}
                  icon={TrendingUp}
                  onClick={() => setQ(term)}
                />
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && !showSuggestions && results.length === 0 && (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{t('search.noResults')}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{t('search.noResultsHint')}</p>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs text-muted-foreground" dir="auto">
                {t('search.resultsCount', { count: results.length })}
              </div>
              <div className="p-2">
                {results.map((r, i) => {
                  const Icon = TYPE_ICON[r.type] ?? FileText;
                  return (
                    <button
                      key={`${r.type}-${i}`}
                      data-idx={i}
                      onClick={() => go(r.url)}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-xl p-3 text-start transition-colors',
                        active === i ? 'bg-accent ring-1 ring-primary/30' : 'hover:bg-accent'
                      )}
                    >
                      {r.image ? (
                        <img
                          src={r.image}
                          alt={r.title}
                          loading="lazy"
                          className="h-11 w-11 shrink-0 rounded-lg border border-border/50 bg-muted object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border/50 bg-muted/60 text-muted-foreground"
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            dir="auto"
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                              TYPE_STYLE[r.type] || 'text-muted-foreground bg-muted'
                            )}
                          >
                            {typeLabel(r.type)}
                          </span>
                          {r.badge && (
                            <span dir="auto" className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {r.badge}
                            </span>
                          )}
                        </div>
                        <p dir="auto" className="truncate text-sm font-medium">{r.title}</p>
                        {r.subtitle && (
                          <p dir="auto" className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                        )}
                      </div>
                      <ArrowRight
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-opacity rtl-flip',
                          active === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
            <span>{t('search.navigate')}</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
            <span>{t('search.open')}</span>
          </span>
          <span className="hidden sm:inline">{t('search.poweredBy')}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
