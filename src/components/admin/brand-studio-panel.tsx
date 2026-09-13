'use client';

/**
 * BrandStudioPanel — the ARIA HUB social-branding automation.
 *
 * Two tabs:
 *  1. Today's Plan — the deterministic daily calendar: ordered, share-ready
 *     posts (image + caption) decided by the code planner from live DB pools.
 *  2. Template Lab — any of the 8 branded formats with any item from the same
 *     pools, for ad-hoc posts.
 *
 * Branding is 100% CODE-DRIVEN (no LLM image prompts): every canvas is a
 * deterministic template with the same navy/gold chrome, logo lockup and one
 * gold keyword per headline. The LLM only ever polishes CAPTION text, with the
 * deterministic brand caption as guaranteed fallback.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClock, BarChart3, CalendarDays, Check, Copy, Download, Eye, GraduationCap,
  Lightbulb, Loader2, Newspaper, Palette, Quote, RefreshCw, Search, Sparkles, Star, Wand2,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';
import { cn } from '@/lib/utils';
import { translate } from '@/lib/i18n';
import { getLocalizedContent } from '@/lib/i18n-content';
import { toEasternDigits, formatDateLong } from '@/lib/date-format';
import type { Lang } from '@/lib/lang-route';
import { OpportunityPoster, buildPosterData } from '@/components/site/opportunity-poster';
import { SocialCanvas, type PosterSize } from '@/lib/social/templates';
import { TEMPLATE_DEFS, type PostTemplate } from '@/lib/social/brand';
import { buildCaption, type CaptionInput } from '@/lib/social/captions';
import type { DailyPlan, PlanIdea, PlanNews, PlanOpp, PlanPost, PlanStat, PlanStory } from '@/lib/social/plan';

const TEMPLATES: PostTemplate[] = TEMPLATE_DEFS.map((d) => d.key);

const TYPE_ICON: Record<PostTemplate, React.ComponentType<{ className?: string }>> = {
  spotlight: Star,
  deadline: AlarmClock,
  tip: Lightbulb,
  quote: Quote,
  promo: Sparkles,
  news: Newspaper,
  stat: BarChart3,
  story: GraduationCap,
};

interface RawIdea { id: string; kind: string; text: string; textI18n: Record<string, string> | null }
interface RawNews { slug: string; title: string; titleI18n: Record<string, string> | null; excerpt: string; excerptI18n: Record<string, string> | null; publishedAt: string }
interface RawStory { id: string; title: string; titleI18n: Record<string, string> | null; content: string; contentI18n: Record<string, string> | null; country: string | null; program: string | null; year: string | null }
/** Search result from /api/admin/social-kit-opps — same shape as PlanOpp. */
interface SearchedOpp {
  id: string;
  slug: string;
  title: string;
  titleI18n: Record<string, string> | null;
  deadline: string | null;
  featured: boolean;
  organization: string | null;
  salary: string | null;
  salaryI18n: Record<string, string> | null;
  country: string | null;
  category: { name: string; nameI18n: Record<string, string> | null; slug: string } | null;
}

const TYPE_FILTERS: { value: string; labelKey: string }[] = [
  { value: 'all', labelKey: 'admin.studio.filterAll' },
  { value: 'jobs', labelKey: 'admin.studio.filterJobs' },
  { value: 'scholarships', labelKey: 'admin.studio.filterScholarships' },
  { value: 'internships', labelKey: 'admin.studio.filterInternships' },
  { value: 'trainings', labelKey: 'admin.studio.filterTrainings' },
];

const LANGS: { value: Lang; label: string }[] = [
  { value: 'fa', label: 'دری / فارسی' },
  { value: 'ps', label: 'پښتو' },
  { value: 'en', label: 'English' },
];

const i18n = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, string>) : null);
const trimTo = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const daysLeftOf = (d: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);

export function BrandStudioPanel() {
  const t = useT();
  const { toast } = useToast();
  const tt = useCallback(
    (key: string, params?: Record<string, string | number>) => translate('en', key, params),
    [],
  );

  const [tab, setTab] = useState<'plan' | 'lab'>('plan');
  const [lang, setLang] = useState<Lang>('fa');
  const [size, setSize] = useState<PosterSize>('square');

  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [labTemplate, setLabTemplate] = useState<PostTemplate | null>(null);
  const [labItemKey, setLabItemKey] = useState<string | null>(null);

  // ── lab content picker: search + type filter ──
  const [pickerQuery, setPickerQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  // results + total live in ONE state object so they can never get out of sync
  // (a half-applied response used to show "0 of N" with an empty list).
  const [library, setLibrary] = useState<{ results: SearchedOpp[]; total: number }>({ results: [], total: 0 });
  const [searching, setSearching] = useState(false);
  // The FULL library is always fetched for opportunity formats — no need to
  // type first (owner asked for access to ALL opportunities, not just today's
  // plan pools). Typing only narrows the list server-side.
  const searchMode = labTemplate === 'spotlight' || labTemplate === 'deadline';

  const [captionOverrides, setCaptionOverrides] = useState<Record<string, { caption: string; source: 'template' | 'ai' }>>({});
  const [aiBusyKey, setAiBusyKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const fetchSeq = useRef(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/social/plan?lang=${lang}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error('plan_failed');
      setPlan(data.plan as DailyPlan);
      setCaptionOverrides({});
      setSelectedKey((data.plan as DailyPlan).posts[0]?.key ?? null);
    } catch {
      setLoadError(true);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // debounce the picker query
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(pickerQuery), 300);
    return () => clearTimeout(id);
  }, [pickerQuery]);

  // server-side opportunity library (any language) while the lab picker is open
  useEffect(() => {
    if (!searchMode) return;
    // guard: only the LATEST request may touch state (older responses are ignored)
    const reqId = ++fetchSeq.current;
    setSearching(true);
    const typeQ = typeFilter !== 'all' ? `&type=${encodeURIComponent(typeFilter)}` : '';
    fetch(`/api/admin/social-kit-opps?q=${encodeURIComponent(debouncedQuery.trim())}${typeQ}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const results = Array.isArray(d.items) ? d.items : [];
        const total = Number.isFinite(d.total) ? d.total : results.length;
        setLibrary({ results, total });
      })
      .catch(() => { setLibrary((prev) => ({ ...prev, results: [] })); })
      .finally(() => { if (fetchSeq.current === reqId) setSearching(false); });
    return () => { fetchSeq.current++; };
  }, [searchMode, debouncedQuery, typeFilter]);

  // ── localization helpers ──────────────────────────────────────────────────
  const loc = useCallback(
    (base: string | null | undefined, obj: unknown) =>
      getLocalizedContent(base ?? '', i18n(obj), lang) || base || '',
    [lang],
  );
  const tr = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  );

  // ── lab item resolution ───────────────────────────────────────────────────
  const labPost: PlanPost | null = useMemo(() => {
    if (tab !== 'lab' || !plan || !labTemplate || !labItemKey) return null;
    const pools = plan.pools;
    if (labTemplate === 'spotlight' || labTemplate === 'deadline') {
      // Searched opportunities (prefix 'search:') carry their full data inline.
      if (labItemKey.startsWith('search:')) {
        const slug = labItemKey.slice(7);
        const s = library.results.find((o) => o.slug === slug);
        if (!s) return null;
        return buildOppPost(
          labTemplate,
          {
            slug: s.slug,
            title: s.title,
            titleI18n: s.titleI18n,
            organization: s.organization,
            country: s.country,
            deadline: s.deadline,
            featured: s.featured,
            salary: s.salary,
            salaryI18n: s.salaryI18n,
            category: s.category ? { name: s.category.name, nameI18n: s.category.nameI18n } : null,
          },
          lang, loc, tr,
        );
      }
      const opp = pools[labTemplate === 'spotlight' ? 'opportunity' : 'closingSoon'].find((o) => o.slug === labItemKey);
      if (!opp) return null;
      return buildOppPost(labTemplate, opp, lang, loc, tr);
    }
    if (labTemplate === 'tip' || labTemplate === 'quote' || labTemplate === 'promo') {
      const pool = labTemplate === 'tip' ? pools.ideaTip : labTemplate === 'quote' ? pools.ideaQuote : pools.ideaPromo;
      const idea = (pool as RawIdea[]).find((i) => i.id === labItemKey);
      if (!idea) return null;
      return buildIdeaPost(labTemplate, idea, lang, loc, tr, pool.indexOf(idea) + 1);
    }
    if (labTemplate === 'news') {
      const news = pools.news.find((n) => n.slug === labItemKey);
      if (!news) return null;
      return buildNewsPost(news as unknown as RawNews, lang, loc, tr);
    }
    if (labTemplate === 'stat') {
      const stat = pools.stats.find((s) => s.labelKey === labItemKey);
      if (!stat) return null;
      return buildStatPost(stat, lang, tr);
    }
    const story = pools.story.find((s) => s.id === labItemKey);
    if (!story) return null;
    return buildStoryPost(story as unknown as RawStory, lang, loc, tr);
  }, [tab, plan, labTemplate, labItemKey, lang, loc, tr, library.results]);

  const activePost: PlanPost | null = useMemo(() => {
    if (tab === 'lab') return labPost;
    if (!plan) return null;
    return plan.posts.find((p) => p.key === selectedKey) ?? plan.posts[0] ?? null;
  }, [tab, labPost, plan, selectedKey]);

  // ── caption for the active post (override > deterministic) ────────────────
  const activeCaption = useMemo(() => {
    if (!activePost) return '';
    return captionOverrides[activePost.key]?.caption ?? activePost.caption;
  }, [activePost, captionOverrides]);

  const captionSource = activePost ? captionOverrides[activePost.key]?.source ?? 'template' : 'template';

  // ── QR for the active post ────────────────────────────────────────────────
  useEffect(() => {
    if (!activePost) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    const seg = lang;
    let url = `https://www.myariahub.com/${seg}`;
    if ((activePost.template === 'spotlight' || activePost.template === 'deadline') && activePost.opp) {
      url = `https://www.myariahub.com/${seg}/opportunities/${activePost.opp.slug}`;
    } else if (activePost.template === 'news') {
      url = `https://www.myariahub.com/${seg}/blog`;
    } else if (activePost.template === 'story') {
      url = `https://www.myariahub.com/${seg}/success-stories`;
    }
    QRCode.toDataURL(url, { margin: 0, width: 168, color: { dark: '#1B2440', light: '#FFFBF2' } })
      .then((u) => !cancelled && setQrDataUrl(u))
      .catch(() => !cancelled && setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [activePost, lang]);

  // ── actions ───────────────────────────────────────────────────────────────
  const copyCaption = useCallback(async () => {
    if (!activeCaption || !activePost) return;
    try {
      await navigator.clipboard.writeText(activeCaption);
      setCopiedKey(activePost.key);
      setTimeout(() => setCopiedKey(null), 1600);
      toast({ title: t('admin.studio.copied') });
    } catch {
      toast({ title: 'Clipboard blocked', variant: 'destructive' });
    }
  }, [activeCaption, activePost, t, toast]);

  const aiPolish = useCallback(async () => {
    if (!activePost || aiBusyKey) return;
    const input = captionInputFor(activePost, lang, loc, tr);
    setAiBusyKey(activePost.key);
    try {
      const res = await fetch('/api/social/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: activePost.template, lang, mode: 'ai', input }),
      });
      const data = await res.json();
      if (data.ok) {
        setCaptionOverrides((prev) => ({ ...prev, [activePost.key]: { caption: data.caption, source: data.source } }));
        if (data.source === 'template') toast({ title: t('admin.studio.aiFailed') });
      } else {
        toast({ title: t('admin.studio.aiFailed') });
      }
    } catch {
      toast({ title: t('admin.studio.aiFailed') });
    } finally {
      setAiBusyKey(null);
    }
  }, [activePost, aiBusyKey, lang, loc, tr, t, toast]);

  const downloadPng = useCallback(async () => {
    const node = canvasWrapRef.current?.firstElementChild as HTMLElement | null;
    if (!node || !activePost) return;
    setExporting(true);
    try {
      const w = 1080;
      const h = size === 'portrait' ? 1350 : 1080;
      await toPng(node, { pixelRatio: 1, width: w, height: h, cacheBust: true });
      const url = await toPng(node, { pixelRatio: 1, width: w, height: h, cacheBust: true });
      const a = document.createElement('a');
      const code = lang.toUpperCase();
      a.download = `ariahub-${activePost.key.slice(0, 48)}-${code}-${size}.png`;
      a.href = url;
      a.click();
      toast({ title: t('admin.studio.download') });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [activePost, size, lang, t, toast]);

  // ── lab pool helpers ──────────────────────────────────────────────────────
  const labPoolItems: { key: string; label: string }[] = useMemo(() => {
    if (!plan || !labTemplate) return [];
    const pools = plan.pools;
    const q = debouncedQuery.trim().toLowerCase();
    const matches = (label: string) => !q || label.toLowerCase().includes(q);
    const catOf = (o: { category?: { name?: string | null } | null }) => (o.category?.name ? o.category.name.toLowerCase() : '');
    switch (labTemplate) {
      case 'spotlight':
        return pools.opportunity
          .filter((o) => matches(loc(o.title, o.titleI18n)) && (typeFilter === 'all' || catOf(o).includes(typeFilter)))
          .map((o) => ({ key: o.slug, label: loc(o.title, o.titleI18n) }));
      case 'deadline':
        return pools.closingSoon
          .filter((o) => matches(loc(o.title, o.titleI18n)) && (typeFilter === 'all' || catOf(o).includes(typeFilter)))
          .map((o) => ({ key: o.slug, label: loc(o.title, o.titleI18n) }));
      case 'tip':
        return pools.ideaTip.filter((i) => matches(loc(i.text, i.textI18n))).map((i) => ({ key: i.id, label: loc(i.text, i.textI18n) }));
      case 'quote':
        return pools.ideaQuote.filter((i) => matches(loc(i.text, i.textI18n))).map((i) => ({ key: i.id, label: loc(i.text, i.textI18n) }));
      case 'promo':
        return pools.ideaPromo.filter((i) => matches(loc(i.text, i.textI18n))).map((i) => ({ key: i.id, label: loc(i.text, i.textI18n) }));
      case 'news':
        return pools.news.filter((n) => matches(loc(n.title, n.titleI18n))).map((n) => ({ key: n.slug, label: loc(n.title, n.titleI18n) }));
      case 'stat':
        return pools.stats.map((s) => ({ key: s.labelKey, label: `${s.value} ${tr(s.labelKey)}` })).filter((s) => matches(s.label));
      case 'story':
        return pools.story.filter((s) => matches(loc(s.title, s.titleI18n))).map((s) => ({ key: s.id, label: loc(s.title, s.titleI18n) }));
    }
  }, [plan, labTemplate, loc, tr, debouncedQuery, typeFilter]);

  const selectLabTemplate = (tpl: PostTemplate) => {
    setLabTemplate(tpl);
    setLabItemKey(null);
    setPickerQuery('');
    setDebouncedQuery('');
    setLibrary({ results: [], total: 0 });
  };

  // ── preview node ──────────────────────────────────────────────────────────
  const previewNode = useMemo(() => {
    if (!activePost) return null;
    if (activePost.template === 'spotlight' && activePost.opp) {
      const data = buildPosterData(
        {
          slug: activePost.opp.slug,
          title: loc(activePost.opp.title, activePost.opp.titleI18n),
          titleI18n: activePost.opp.titleI18n,
          organization: activePost.opp.organization,
          country: activePost.opp.country,
          deadline: activePost.opp.deadline,
          featured: activePost.opp.featured,
          salary: activePost.opp.salary,
          salaryI18n: activePost.opp.salaryI18n,
          category: activePost.opp.category
            ? { name: activePost.opp.category.name, nameI18n: i18n(activePost.opp.category.nameI18n) }
            : null,
        },
        lang,
      );
      return <OpportunityPoster data={data} lang={lang} size={size} qrDataUrl={qrDataUrl} />;
    }
    return <SocialCanvas {...socialPropsFor(activePost, lang, size, qrDataUrl, loc, tr)} />;
  }, [activePost, lang, size, qrDataUrl, loc, tr]);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground">
            <Wand2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">{t('admin.studio.title')}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground" dir="auto">{t('admin.studio.sub')}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[t('admin.studio.pillar1'), t('admin.studio.pillar2'), t('admin.studio.pillar3')].map((p) => (
                <Badge key={p} variant="secondary" className="gap-1 text-[11px] font-medium">
                  <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'plan' | 'lab')}>
          <TabsList>
            <TabsTrigger value="plan" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.studio.tabPlan')}</TabsTrigger>
            <TabsTrigger value="lab" className="gap-1.5"><Palette className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.studio.tabLab')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <SelectTrigger className="h-9 w-[130px]" aria-label={t('admin.studio.lang')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={size} onValueChange={(v) => setSize(v as PosterSize)}>
            <SelectTrigger className="h-9 w-[170px]" aria-label={t('admin.studio.size')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="square">{t('admin.studio.sizeSquare')}</SelectItem>
              <SelectItem value="portrait">{t('admin.studio.sizePortrait')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
        {/* ── left column ── */}
        <div className="space-y-3">
          {loading ? (
            <div className="grid h-40 place-items-center rounded-xl border bg-card">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="text-sm font-medium text-destructive">Failed to load the plan.</p>
              <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={fetchPlan}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
              </Button>
            </div>
          ) : tab === 'plan' ? (
            <PlanList
              plan={plan}
              lang={lang}
              selectedKey={selectedKey ?? undefined}
              onSelect={setSelectedKey}
              tt={tt}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground" dir="auto">{t('admin.studio.labHint')}</p>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('admin.studio.pickTemplate')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((tpl) => {
                    const Icon = TYPE_ICON[tpl];
                    const activeSel = labTemplate === tpl;
                    return (
                      <button
                        key={tpl}
                        type="button"
                        onClick={() => selectLabTemplate(tpl)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border p-2.5 text-start text-xs font-semibold transition-colors',
                          activeSel ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{t(`admin.studio.type.${tpl}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {labTemplate ? (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('admin.studio.pickItem')}</p>
                  {/* search + type filter — server search for opportunity formats */}
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      value={pickerQuery}
                      onChange={(e) => setPickerQuery(e.target.value)}
                      placeholder={t('admin.studio.searchPlaceholder')}
                      className="h-9 rounded-xl bg-card ps-8 text-xs"
                      aria-label={t('admin.studio.searchPlaceholder')}
                    />
                    {searching ? <Loader2 className="absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
                  </div>
                  {labTemplate === 'spotlight' || labTemplate === 'deadline' ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {TYPE_FILTERS.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setTypeFilter(f.value)}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                            typeFilter === f.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {t(f.labelKey)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border bg-card p-2">
                    {searchMode ? (
                      /* server library — ANY published opportunity, all languages, browsable without typing */
                      <>
                        {!searching && library.total > library.results.length ? (
                          <p className="px-1 pb-1.5 pt-0.5 text-[10px] text-muted-foreground">
                            {t('admin.studio.showingOf', { shown: library.results.length, total: library.total })}
                          </p>
                        ) : null}
                        {library.results.length === 0 && !searching ? (
                          <p className="py-6 text-center text-xs text-muted-foreground">{t('admin.studio.noResults')}</p>
                        ) : (
                          library.results.map((o) => (
                          <button
                            key={o.slug}
                            type="button"
                            onClick={() => setLabItemKey(`search:${o.slug}`)}
                            className={cn(
                              'block w-full rounded-lg px-3 py-2 text-start text-xs font-medium transition-colors',
                              labItemKey === `search:${o.slug}` ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                            )}
                          >
                            <span className="line-clamp-2 leading-snug">{loc(o.title, o.titleI18n)}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] opacity-70">
                              {o.category?.name ? <span>{loc(o.category.name, o.category.nameI18n)}</span> : null}
                              {o.deadline ? <span>· {formatDateLong(new Date(o.deadline), lang)}</span> : null}
                              {o.featured ? <span>· ★</span> : null}
                            </span>
                          </button>
                        ))
                        )}
                      </>
                    ) : labPoolItems.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">{t('admin.studio.noItems')}</p>
                    ) : (
                      labPoolItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setLabItemKey(item.key)}
                          className={cn(
                            'block w-full rounded-lg px-3 py-2 text-start text-xs font-medium transition-colors',
                            labItemKey === item.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                          )}
                        >
                          <span className="line-clamp-2 leading-snug">{item.label}</span>
                        </button>
                      ))
                    )}
                  </div>
                  {searchMode ? (
                    <p className="mt-1.5 text-[10px] text-muted-foreground">{t('admin.studio.searchHint')}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ── right column: preview + caption ── */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-center overflow-auto rounded-2xl border bg-slate-950 p-6">
            {activePost ? (
              <div
                ref={canvasWrapRef}
                style={{
                  direction: 'ltr',
                  transform: 'scale(0.44)',
                  transformOrigin: 'top left',
                  width: 1080 * 0.44,
                  height: (size === 'portrait' ? 1350 : 1080) * 0.44,
                }}
              >
                {previewNode}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-white/40">
                <Palette className="h-8 w-8" aria-hidden="true" />
                <p className="max-w-56 text-center text-xs">{tab === 'lab' ? t('admin.studio.labHint') : t('admin.studio.empty')}</p>
              </div>
            )}
          </div>

          {activePost ? (
            <div className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    {(() => {
                      const Icon = TYPE_ICON[activePost.template];
                      return <Icon className="h-3 w-3" aria-hidden="true" />;
                    })()}
                    {t(`admin.studio.type.${activePost.template}`)}
                  </Badge>
                  <Badge variant="outline" className={cn('shrink-0', captionSource === 'ai' ? 'border-violet-400/60 text-violet-600 dark:text-violet-400' : '')}>
                    {captionSource === 'ai' ? 'AI' : 'Brand'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2.5" onClick={copyCaption}>
                    {copiedKey === activePost.key ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span className="hidden sm:inline">{t('admin.studio.copy')}</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2.5" disabled={aiBusyKey === activePost.key} onClick={aiPolish}>
                    {aiBusyKey === activePost.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span className="hidden sm:inline">{aiBusyKey === activePost.key ? t('admin.studio.aiBusy') : t('admin.studio.aiPolish')}</span>
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5 px-2.5" disabled={exporting} onClick={downloadPng}>
                    {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span className="hidden sm:inline">{exporting ? t('admin.studio.generating') : t('admin.studio.download')}</span>
                  </Button>
                </div>
              </div>
              <pre
                dir="auto"
                className="max-h-52 overflow-y-auto whitespace-pre-wrap px-4 py-3 font-sans text-[13px] leading-relaxed"
              >
                {activeCaption}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── plan list ───────────────────────────────────────────────────────────────

function PlanList({
  plan, lang, selectedKey, onSelect, tt,
}: {
  plan: DailyPlan | null;
  lang: Lang;
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
  tt: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!plan || plan.posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">
        {tt('admin.studio.empty')}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-muted-foreground" dir="ltr">
          {tt('admin.studio.planFor')} {plan.date}
        </p>
        <Badge variant="secondary" className="text-[11px]">
          {tt('admin.studio.postsReady', { n: toEasternDigits(String(plan.posts.length), lang) })}
        </Badge>
      </div>
      <div className="space-y-2">
        {plan.posts.map((post, i) => {
          const Icon = TYPE_ICON[post.template];
          const active = post.key === selectedKey;
          return (
            <button
              key={post.key}
              type="button"
              onClick={() => onSelect(post.key)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-3 text-start transition-colors',
                active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card hover:bg-muted/60',
              )}
            >
              <span className={cn(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate text-[11px] font-bold uppercase tracking-wide text-primary">
                    {tt(`admin.studio.type.${post.template}`)}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-snug" dir="auto">
                  {post.title}
                </span>
                {post.meta ? (
                  <span className="mt-0.5 line-clamp-1 block text-[11px] text-muted-foreground" dir="auto">{post.meta}</span>
                ) : null}
              </span>
              <Eye className={cn('mt-1 h-3.5 w-3.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground/50')} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── post builders (client-side mirrors of the planner) ─────────────────────

type Loc = (base: string | null | undefined, obj: unknown) => string;
type Tr = (key: string, params?: Record<string, string | number>) => string;

function buildOppPost(
  template: 'spotlight' | 'deadline',
  opp: PlanOpp,
  lang: Lang,
  loc: Loc,
  tr: Tr,
): PlanPost {
  const title = loc(opp.title, opp.titleI18n);
  const dl = opp.deadline ? new Date(opp.deadline) : null;
  const input: CaptionInput = {
    template, lang, title,
    org: opp.organization ?? undefined,
    country: opp.country ?? undefined,
    deadlineText: dl ? formatDateLong(dl, lang) : undefined,
    daysLeft: daysLeftOf(opp.deadline),
    slug: opp.slug,
  };
  return {
    key: `${template}-${opp.slug}`,
    template,
    title,
    meta: [opp.category ? loc(opp.category.name, opp.category.nameI18n) : null, opp.country].filter(Boolean).join(' • ') || undefined,
    opp,
    caption: buildCaption(input),
    brief: '',
  };
}

function buildIdeaPost(
  template: 'tip' | 'quote' | 'promo',
  idea: RawIdea,
  lang: Lang,
  loc: Loc,
  tr: Tr,
  seriesNo: number,
): PlanPost {
  const title = loc(idea.text, idea.textI18n);
  const input: CaptionInput = { template, lang, title, seriesNo };
  return {
    key: `${template}-${idea.id}`,
    template,
    title,
    seriesNo,
    idea: { id: idea.id, kind: idea.kind, text: idea.text, textI18n: idea.textI18n },
    caption: buildCaption(input),
    brief: '',
  };
}

function buildNewsPost(news: RawNews, lang: Lang, loc: Loc, tr: Tr): PlanPost {
  const title = loc(news.title, news.titleI18n);
  const note = trimTo(loc(news.excerpt, news.excerptI18n), 160);
  const input: CaptionInput = { template: 'news', lang, title, note };
  return {
    key: `news-${news.slug}`,
    template: 'news',
    title,
    meta: note,
    news: { ...news, titleI18n: news.titleI18n, excerptI18n: news.excerptI18n },
    caption: buildCaption(input),
    brief: '',
  };
}

function buildStatPost(stat: PlanStat, lang: Lang, tr: Tr): PlanPost {
  const label = tr(stat.labelKey);
  const sub = tr(stat.subKey);
  const title = `${stat.value} ${label}`;
  const input: CaptionInput = { template: 'stat', lang, title, statValue: stat.value, statLabel: label, note: sub };
  return {
    key: `stat-${stat.labelKey}`,
    template: 'stat',
    title,
    meta: sub,
    stat,
    caption: buildCaption(input),
    brief: '',
  };
}

function buildStoryPost(story: RawStory, lang: Lang, loc: Loc, tr: Tr): PlanPost {
  const stitle = loc(story.title, story.titleI18n);
  const content = loc(story.content, story.contentI18n);
  const excerpt = trimTo(content, 190);
  const personMeta = [story.program, story.country].filter(Boolean).join(' • ');
  const input: CaptionInput = { template: 'story', lang, title: excerpt, personName: stitle, personMeta: personMeta || undefined };
  return {
    key: `story-${story.id}`,
    template: 'story',
    title: excerpt,
    meta: stitle,
    story: { ...story, titleI18n: story.titleI18n, contentI18n: story.contentI18n },
    caption: buildCaption(input),
    brief: '',
  };
}

/** CaptionInput mirror used by the AI-polish endpoint (same facts, no more). */
function captionInputFor(post: PlanPost, lang: Lang, loc: Loc, tr: Tr): CaptionInput {
  const dl = post.opp?.deadline ? new Date(post.opp.deadline) : null;
  switch (post.template) {
    case 'spotlight':
    case 'deadline':
      return {
        template: post.template, lang, title: post.title,
        org: post.opp?.organization ?? undefined,
        country: post.opp?.country ?? undefined,
        deadlineText: dl ? formatDateLong(dl, lang) : undefined,
        daysLeft: daysLeftOf(post.opp?.deadline ?? null),
        slug: post.opp?.slug,
      };
    case 'tip':
      return { template: 'tip', lang, title: post.title, seriesNo: post.seriesNo ?? 1 };
    case 'quote':
      return { template: 'quote', lang, title: post.title };
    case 'promo':
      return { template: 'promo', lang, title: post.title };
    case 'news':
      return { template: 'news', lang, title: post.title, note: post.meta };
    case 'stat':
      return { template: 'stat', lang, title: post.title, statValue: post.stat?.value, statLabel: tr(post.stat?.labelKey ?? ''), note: post.meta };
    case 'story':
      return { template: 'story', lang, title: post.title, personName: post.meta, personMeta: undefined };
  }
}

/** SocialCanvas props for a non-spotlight post. */
function socialPropsFor(
  post: PlanPost,
  lang: Lang,
  size: PosterSize,
  qrDataUrl: string | null,
  loc: Loc,
  tr: Tr,
): Parameters<typeof SocialCanvas>[0] {
  const base = { template: post.template, lang, size, qrDataUrl, title: post.title };
  switch (post.template) {
    case 'deadline':
      return {
        ...base,
        deadlineDate: post.opp?.deadline ?? null,
        note: [post.opp?.organization, post.opp?.country].filter(Boolean).join(' • ') || undefined,
      };
    case 'tip':
      return { ...base, seriesNo: post.seriesNo ?? 1 };
    case 'quote':
      return base;
    case 'promo':
      return {
        ...base,
        checklist: [tr('social.post.promoCheck1'), tr('social.post.promoCheck2'), tr('social.post.promoCheck3')],
      };
    case 'news':
      return { ...base, note: post.meta, newsDate: post.news?.publishedAt ?? null };
    case 'stat':
      return {
        ...base,
        stat: { value: post.stat?.value ?? '', label: tr(post.stat?.labelKey ?? ''), sub: tr(post.stat?.subKey ?? '') },
      };
    case 'story':
      return {
        ...base,
        note: undefined,
        person: post.meta ? { name: post.meta, meta: [post.story?.program, post.story?.country].filter(Boolean).join(' • ') } : undefined,
      };
    default:
      return base;
  }
}
