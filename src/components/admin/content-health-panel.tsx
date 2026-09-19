'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Languages,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ─── Types ────────────────────────────────────────────────────────────── */

interface ContentHealth {
  opportunities: { total: number; published: number; expired: number; draft: number };
  translation: { trilingual: number; partial: number; englishOnly: number; publishedTotal: number };
  deadlines: { expiring7: number; expiring30: number; noApplyLink: number };
  submissions: { pending: number };
  alerts: { pending: number; active: number; unsubscribed: number };
  categories: { id: string; name: string; slug: string; count: number }[];
  sources: {
    id: string;
    name: string;
    enabled: boolean;
    lastRun: {
      status: string;
      startedAt: string;
      finishedAt: string | null;
      found: number;
      imported: number;
      updated: number;
      failed: number;
    } | null;
  }[];
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ContentHealthPanel() {
  const [data, setData] = useState<ContentHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/content-health', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d.error ? null : d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const fetchHealth = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed py-20 text-center text-muted-foreground">
        <AlertTriangle className="mb-2 h-8 w-8 text-amber-500" />
        <p className="text-sm font-medium">Failed to load content health data</p>
        <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={fetchHealth}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  const { opportunities: opp, translation, deadlines, submissions, alerts } = data;
  const coveragePct = translation.publishedTotal
    ? Math.round((translation.trilingual / translation.publishedTotal) * 100)
    : 0;
  const partialPct = translation.publishedTotal
    ? Math.round((translation.partial / translation.publishedTotal) * 100)
    : 0;
  const maxCatCount = Math.max(...data.categories.map((c) => c.count), 1);

  return (
    <div className="space-y-4">
      {/* Top stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total opportunities" value={opp.total} sub={`${opp.published} published · ${opp.expired} expired · ${opp.draft} draft`} />
        <StatCard label="Pending submissions" value={submissions.pending} sub="community queue" icon={Activity} accent={submissions.pending > 0 ? 'amber' : 'emerald'} />
        <StatCard
          label="Alert subscribers"
          value={(alerts?.pending ?? 0) + (alerts?.active ?? 0)}
          sub={`${alerts?.pending ?? 0} pending · ${alerts?.active ?? 0} active${alerts?.unsubscribed ? ` · ${alerts.unsubscribed} unsubscribed` : ''}`}
          icon={BellRing}
          accent="sky"
        />
        <StatCard label="Expiring ≤ 7 days" value={deadlines.expiring7} sub={`${deadlines.expiring30} within 30 days`} icon={CalendarClock} accent={deadlines.expiring7 > 0 ? 'rose' : 'emerald'} />
        <StatCard label="Missing apply link" value={deadlines.noApplyLink} sub="published records" icon={ExternalLink} accent={deadlines.noApplyLink > 0 ? 'amber' : 'emerald'} />
      </div>

      {/* Translation coverage */}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="h-4 w-4 text-primary" />
            Translation coverage
          </CardTitle>
          <Badge variant="secondary">
            {translation.trilingual}/{translation.publishedTotal} fully trilingual
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Translation coverage bars">
            <div className="bg-emerald-500 transition-all" style={{ width: `${coveragePct}%` }} title={`Trilingual ${translation.trilingual}`} />
            <div className="bg-amber-500 transition-all" style={{ width: `${partialPct}%` }} title={`Partial ${translation.partial}`} />
            <div className="bg-muted-foreground/30 transition-all" style={{ width: `${Math.max(0, 100 - coveragePct - partialPct)}%` }} title={`English only ${translation.englishOnly}`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <Legend color="bg-emerald-500" label={`Fully trilingual (fa+ps): ${translation.trilingual}`} />
            <Legend color="bg-amber-500" label={`Partial: ${translation.partial}`} />
            <Legend color="bg-muted-foreground/30" label={`English only: ${translation.englishOnly}`} />
          </div>
          {translation.englishOnly > 20 && (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              {translation.englishOnly} published records have no Farsi/Pashto content yet — run the
              translation backfill to fill them in.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category distribution */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Category distribution (published)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs font-medium sm:w-40">{c.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all"
                    style={{ width: `${(c.count / maxCatCount) * 100}%` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums">{c.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Import source health */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Import source health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sources.map((s) => {
              const run = s.lastRun;
              const statusColor =
                !s.enabled
                  ? 'bg-muted-foreground/30'
                  : !run
                    ? 'bg-muted-foreground/30'
                    : run.status === 'ok' || run.status === 'partial'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500';
              return (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', statusColor)} />
                      {s.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {run
                        ? `Last run ${new Date(run.startedAt).toLocaleString()} · found ${run.found} · imported ${run.imported} · updated ${run.updated}${run.failed ? ` · failed ${run.failed}` : ''}`
                        : 'Never run'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {s.enabled ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <XCircle className="h-3 w-3 text-muted-foreground" /> disabled
                      </Badge>
                    )}
                    {run?.status && (
                    <p className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">{run.status}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Small building blocks ─────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'default',
}: {
  label: string;
  value: number;
  sub: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: 'default' | 'amber' | 'rose' | 'emerald' | 'sky';
}) {
  const accents = {
    default: 'text-foreground',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    sky: 'text-sky-600 dark:text-sky-400',
  };
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className={cn('mt-1.5 text-2xl font-black tabular-nums', accents[accent])}>{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-sm', color)} />
      {label}
    </span>
  );
}
