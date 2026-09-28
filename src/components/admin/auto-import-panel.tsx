'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import {
  Download, Play, RefreshCw, AlertCircle, CheckCircle2, Loader2,
  Newspaper, Briefcase, ShieldCheck, LayoutDashboard, Clock, Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';

/* ─── Types ────────────────────────────────────────────────────────────── */

interface ImportSource {
  id: string; name: string; type: string; scraperKey: string; baseUrl: string;
  enabled: boolean; autoPublish: boolean; scheduleMinutes: number; defaultCategory: string | null;
  lastRunAt: string | null; lastRunStatus: string | null; lastRunStats?: string | null;
}

interface ImportRun {
  id: string; sourceId: string; source?: { name: string; type: string } | null;
  startedAt: string; finishedAt: string | null; status: string;
  found: number; imported: number; updated: number; skipped: number;
  duplicates: number; failed: number; processingMs: number;
  errors: string | null; triggeredBy: string | null;
}

interface ImportStats {
  totalImported: number; totalFailed: number; totalPending: number;
  lastSyncAt: string | null; lastRun: ImportRun | null; successRate: number;
  sources: ImportSource[]; recentRuns: ImportRun[];
}

/** Parsed shape of a source's lastRunStats JSON. */
interface SourceLastStats {
  found?: number; imported?: number; updated?: number; duplicates?: number;
  failed?: number; skipped?: number; filteredOut?: number; message?: string;
}

type TabKey = 'dashboard' | 'opportunity' | 'news' | 'logs';

/* ─── Component ─────────────────────────────────────────────────────────── */

export function AutoImportPanel() {
  const t = useT();
  const { toast } = useToast();

  const [stats, setStats] = useState<ImportStats | null>(null);
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [loading, set_loading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    set_loading(true);
    setStatsError(null);
    setRunsError(null);

    // Independent fetches: a stats failure must NOT blank the whole panel.
    const [statsRes, runsRes] = await Promise.allSettled([
      fetch('/api/admin/import/stats'),
      fetch('/api/admin/import/runs?limit=50'),
    ]);

    if (statsRes.status === 'fulfilled') {
      if (statsRes.value.ok) {
        try { setStats(await statsRes.value.json()); } catch { setStatsError('Bad JSON'); }
      } else {
        setStatsError(statsRes.value.status === 401 ? '401' : `HTTP ${statsRes.value.status}`);
      }
    } else {
      setStatsError('network');
    }

    if (runsRes.status === 'fulfilled' && runsRes.value.ok) {
      try {
        const data = await runsRes.value.json();
        setRuns(data.items || []);
      } catch { setRunsError('Bad JSON'); }
    } else {
      setRunsError('network');
    }

    set_loading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runImport = async (sourceId?: string, type?: string, force?: boolean) => {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/import/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, type, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: t('status.success'), description: `Imported: ${data.summary.imported}, Updated: ${data.summary.updated}, Failed: ${data.summary.failed}` });
      fetchData();
    } catch (e: any) {
      toast({ title: t('status.error'), description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  /** RSS → News import for type='news' sources (dedicated pipeline). */
  const runNewsImport = async (sourceId: string) => {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/import/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const s = data.summary;
      toast({
        title: t('status.success'),
        description: `News — found: ${s.found}, imported: ${s.imported}, off-topic dropped: ${s.filteredOut ?? 0}, duplicates: ${s.duplicates}, failed: ${s.failed}`,
      });
      fetchData();
    } catch (e: any) {
      toast({ title: t('status.error'), description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const retryFailed = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/import/retry-failed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: t('status.success'), description: `Previously failed: ${data.previouslyFailed}` });
      fetchData();
    } catch (e: any) {
      toast({ title: t('status.error'), description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const toggleSource = async (id: string, field: 'enabled' | 'autoPublish', value: boolean) => {
    try {
      await fetch(`/api/admin/import/sources/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      fetchData();
    } catch {
      toast({ title: t('status.error'), description: 'Toggle failed', variant: 'destructive' });
    }
  };

  /** Split sources: news feeds live in their own tab (separate from opportunity sources). */
  const { opportunitySources, newsSources } = useMemo(() => {
    const all = stats?.sources || [];
    return {
      opportunitySources: all.filter((s) => s.type !== 'news'),
      newsSources: all.filter((s) => s.type === 'news'),
    };
  }, [stats]);

  /** Sum of off-topic drops across news sources (from lastRunStats JSON). */
  const totalFiltered = useMemo(
    () => newsSources.reduce((acc, s) => {
      try { return acc + (Number(JSON.parse(s.lastRunStats || '{}')?.filteredOut) || 0); }
      catch { return acc; }
    }, 0),
    [newsSources],
  );

  const formatMs = (ms: number) => (ms < 60000 ? `${Math.round(ms / 1000)}s` : `${(ms / 60000).toFixed(1)}m`);
  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  };

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode; count?: number }> = [
    { key: 'dashboard', label: t('import.dashboard'), icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { key: 'opportunity', label: t('import.opportunitySources'), icon: <Briefcase className="h-3.5 w-3.5" />, count: opportunitySources.length },
    { key: 'news', label: t('import.newsSources'), icon: <Newspaper className="h-3.5 w-3.5" />, count: newsSources.length },
    { key: 'logs', label: t('import.logs'), icon: <Clock className="h-3.5 w-3.5" />, count: runs.length },
  ];

  /* ─── Loading skeleton ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading import data">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-9 w-28 animate-pulse rounded-md bg-muted" />)}
          </div>
        </div>
        <div className="flex gap-2 border-b pb-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-6 w-32 animate-pulse rounded bg-muted" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/40" />)}
        </div>
        <div className="h-56 animate-pulse rounded-lg border bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Actions — the top bar already shows the page title, so no
          duplicated h2 here; just the one-line description + action buttons. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground">
            <Download className="h-5 w-5" />
          </div>
          <p className="max-w-xl pt-1.5 text-sm text-muted-foreground">{t('import.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runImport()} disabled={running} size="sm" title={t('import.runAllHint')}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? t('import.running') : t('import.runAll')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => runImport(undefined, undefined, true)} disabled={running} title={t('import.forceHint')}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Force Import All
          </Button>
          <Button variant="outline" size="sm" onClick={retryFailed} disabled={running} title={t('import.retryHint')}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> {t('import.retryFailed')}
          </Button>
        </div>
      </div>

      {/* Hard error state — replaces the old silent blank screen */}
      {statsError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">{t('import.fetchError')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {statsError === '401'
                    ? 'Session expired — reload the page to sign in again.'
                    : `Reason: ${statsError}. Check the database connection (DATABASE_URL) and try again.`}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="shrink-0">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> {t('import.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Import sections" className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button key={tab.key} role="tab" aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors sm:px-4 ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label={t('import.totalImported')} value={String(stats.totalImported)} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
            <KpiCard label={t('import.successRate')} value={`${stats.successRate}%`} icon={<Play className="h-4 w-4 text-sky-600" />} />
            <KpiCard label={t('import.pending')} value={String(stats.totalPending)} icon={<Clock className="h-4 w-4 text-amber-600" />} tone={stats.totalPending > 0 ? 'warn' : 'ok'} />
            <KpiCard label={t('import.offTopicFiltered')} value={String(totalFiltered)} icon={<Ban className="h-4 w-4 text-rose-600" />} sub={t('import.newsFilteredNote')} />
          </div>

          {stats.totalPending > 0 && (
            <Card className="border-amber-300/60 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-950/20">
              <CardContent className="flex items-center gap-2 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="text-sm">{stats.totalPending} {t('import.pending')} — configure an AI provider to process translations</span>
              </CardContent>
            </Card>
          )}

          {/* Recent runs */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">{t('import.logs')} — recent</h3>
            <div className="overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">{t('import.sourceName')}</th>
                      <th className="px-3 py-2 text-left font-medium">{t('import.logStatus')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('import.logFound')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('import.logImported')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('import.logFailed')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('import.logDuration')}</th>
                      <th className="px-3 py-2 text-left font-medium">{t('import.logStarted')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recentRuns || []).map((r) => (
                      <tr key={r.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/30" onClick={() => setExpandedRun(expandedRun === r.id ? null : r.id)}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <KindChip type={r.source?.type} t={t} />
                            <span className="max-w-[220px] truncate">{r.source?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2"><StatusBadge status={r.status} t={t} /></td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.found}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{r.imported}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-destructive">{r.failed}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatMs(r.processingMs)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(r.startedAt)}</td>
                      </tr>
                    ))}
                    {!stats.recentRuns?.length && (
                      <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{t('import.noLogs')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Opportunity Sources Tab */}
      {activeTab === 'opportunity' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            {t('import.opportunitySources')} — {opportunitySources.length}
          </div>
          {opportunitySources.map((s) => (
            <SourceCard key={s.id} source={s} kind="opportunity" running={running}
              onToggle={toggleSource} onRun={() => runImport(s.id)} formatDate={formatDate} t={t} />
          ))}
          {opportunitySources.length === 0 && <EmptyState text={t('import.noSources')} />}
        </div>
      )}

      {/* News Sources Tab — separated from opportunity sources */}
      {activeTab === 'news' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Newspaper className="h-4 w-4" />
            {t('import.newsSources')} — {newsSources.length}
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> {t('import.topicalFilterOn')}
            </span>
            {totalFiltered > 0 && (
              <span className="text-xs">{totalFiltered} {t('import.newsFilteredNote')}</span>
            )}
          </div>
          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Only platform-relevant news is imported: jobs, scholarships, visas, education, economy &
            opportunities. War, crime, foreign-conflict and sports stories are automatically dropped.
          </p>
          {newsSources.map((s) => (
            <SourceCard key={s.id} source={s} kind="news" running={running}
              onToggle={toggleSource} onRun={() => runNewsImport(s.id)} formatDate={formatDate} t={t} />
          ))}
          {newsSources.length === 0 && <EmptyState text={t('import.noSources')} />}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-2">
          {runsError && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-center gap-2 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {t('import.fetchError')}
              </CardContent>
            </Card>
          )}
          {runs.map((r) => (
            <div key={r.id} className="rounded-lg border">
              <button className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/30" onClick={() => setExpandedRun(expandedRun === r.id ? null : r.id)}>
                <StatusBadge status={r.status} t={t} />
                <KindChip type={r.source?.type} t={t} />
                <span className="flex-1 truncate text-sm font-medium">{r.source?.name || r.sourceId}</span>
                <span className="text-xs text-muted-foreground">{formatDate(r.startedAt)}</span>
              </button>
              {expandedRun === r.id && (
                <div className="space-y-2 border-t bg-muted/20 px-3 py-2 text-sm">
                  <div className="grid grid-cols-4 gap-2 text-center sm:grid-cols-6">
                    <RunStat label={t('import.logFound')} value={r.found} />
                    <RunStat label={t('import.logImported')} value={r.imported} className="text-emerald-600" />
                    <RunStat label={t('import.logUpdated')} value={r.updated} className="text-sky-600" />
                    <RunStat label={t('import.logSkipped')} value={r.skipped} />
                    <RunStat label={t('import.logDuplicates')} value={r.duplicates} />
                    <RunStat label={t('import.logFailed')} value={r.failed} className="text-destructive" />
                  </div>
                  <div className="text-xs text-muted-foreground">{t('import.logDuration')}: {formatMs(r.processingMs)} · {t('import.logTriggeredBy')}: {r.triggeredBy || '—'}</div>
                  {r.errors && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-destructive">{t('import.logErrors')}</summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-background p-2 text-xs">{r.errors}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
          {!runs.length && !runsError && <EmptyState text={t('import.noLogs')} />}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function KpiCard({ label, value, icon, sub, tone }: { label: string; value: string; icon: ReactNode; sub?: string; tone?: 'ok' | 'warn' }) {
  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className={`text-2xl font-bold tabular-nums ${tone === 'warn' ? 'text-amber-600' : ''}`}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function RunStat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-semibold tabular-nums ${className || ''}`}>{value}</div>
    </div>
  );
}

function KindChip({ type, t }: { type?: string; t: (k: string) => string }) {
  const isNews = type === 'news';
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      isNews
        ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300'
        : 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300'
    }`}>
      {isNews ? <Newspaper className="h-2.5 w-2.5" /> : <Briefcase className="h-2.5 w-2.5" />}
      {isNews ? t('import.chipNews') : t('import.chipOpportunity')}
    </span>
  );
}

function SourceCard({ source, kind, running, onToggle, onRun, formatDate, t }: {
  source: ImportSource;
  kind: 'opportunity' | 'news';
  running: boolean;
  onToggle: (id: string, field: 'enabled' | 'autoPublish', value: boolean) => void;
  onRun: () => void;
  formatDate: (d: string | null) => string;
  t: (k: string) => string;
}) {
  let lastStats: SourceLastStats | null = null;
  try { lastStats = source.lastRunStats ? JSON.parse(source.lastRunStats) : null; } catch { lastStats = null; }
  const lastMsg = lastStats && typeof lastStats.message === 'string' ? lastStats.message : null;
  const isNews = kind === 'news';

  return (
    <div className={`rounded-lg border p-4 transition-colors hover:border-muted-foreground/25 ${source.enabled ? '' : 'opacity-70'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Identity */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <KindChip type={source.type} t={t} />
            <span className="truncate font-semibold">{source.name}</span>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              source.enabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
            }`}>
              {source.enabled ? t('import.enabled') : t('import.sourceAction.disable')}
            </span>
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{source.baseUrl} · <code className="rounded bg-muted px-1">{source.scraperKey}</code></div>
          {isNews && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400" title="Off-topic news (war/crime/sport) is dropped at import time">
              <ShieldCheck className="h-3 w-3" /> {t('import.topicalFilterOn')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onToggle(source.id, 'enabled', !source.enabled)} disabled={running}>
            <span className={`h-2 w-2 rounded-full ${source.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
            {source.enabled ? t('import.enabled') : t('import.sourceAction.disable')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onToggle(source.id, 'autoPublish', !source.autoPublish)} disabled={running}
            title={source.autoPublish ? t('import.sourceAction.autoPublishOn') : t('import.sourceAction.autoPublishOff')}>
            <span className={`text-xs font-medium ${source.autoPublish ? 'text-emerald-600' : 'text-muted-foreground'}`}>{source.autoPublish ? '✓ Publish' : 'Draft'}</span>
          </Button>
          {isNews ? (
            <Button size="sm" onClick={onRun} disabled={running} title={t('import.importNews')}>
              {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Newspaper className="h-3 w-3" />}
              <span className="ml-1 text-xs">{t('import.importNews')}</span>
            </Button>
          ) : (
            <Button size="sm" onClick={onRun} disabled={running} title="Run opportunity import">
              {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>

      {/* Last run summary */}
      {(source.lastRunAt || lastStats) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
          <span>{t('import.lastRun')}: {formatDate(source.lastRunAt)}</span>
          {source.lastRunStatus && (
            <span className={`rounded-full px-2 py-0.5 font-medium ${
              source.lastRunStatus === 'ok' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                : source.lastRunStatus === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {source.lastRunStatus}
            </span>
          )}
          {lastStats && typeof lastStats.found === 'number' && (
            <span className="tabular-nums">
              · found {lastStats.found} · imported {lastStats.imported ?? 0} · updated {lastStats.updated ?? 0}
              · duplicates {lastStats.duplicates ?? 0} · failed {lastStats.failed ?? 0}
              {isNews && typeof lastStats.filteredOut === 'number' && (
                <span className="text-rose-600 dark:text-rose-400"> · off-topic {lastStats.filteredOut}</span>
              )}
            </span>
          )}
        </div>
      )}
      {lastMsg && <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">⏳ {lastMsg}</div>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
      <InboxIcon />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function InboxIcon() {
  return (
    <svg className="h-8 w-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h6.75c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-4.875z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9m0-9l-3 3m3-3l3 3" />
    </svg>
  );
}

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const colors: Record<string, string> = {
    ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    partial: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    running: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300',
  };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-muted text-muted-foreground'}`}>
      {status === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : status === 'ok' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {t(`import.status.${status}`) || status}
    </span>
  );
}
