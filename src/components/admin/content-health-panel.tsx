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
  translation: {
    trilingual: number; partial: number; englishOnly: number; publishedTotal: number;
    engine?: {
      faComplete: number; faActive: number; psComplete: number; psWaiting: number;
      failedChunks: number; pendingChunks: number;
    } | null;
    schedule?: { lastAt: string | null; lastFinishedAt: string | null; unitsToday: number; dailyLimit: number; lastProcessed: number | null; backoffUntil: string | null };
  };
  matchability: { publishedTotal: number; coreReady: number; eligibilityRich: number; weakData: number; noCategory: number; noCountry: number; noEvidence: number; freshVerified: number; normalizedProfiles: number; reviewedProfiles: number };
  deadlines: { expiring7: number; expiring30: number; noApplyLink: number; noStoredApplyLink: number; sourceFallback: number };
  issueQueue: { issue: HealthIssue; page: number; total: number; items: Array<{ id: string; title: string; sourceName: string | null; sourceUrl: string | null; originalUrl: string | null; applyType: string; missing: string[]; faStatus: string | null; psStatus: string | null }> };
  submissions: { pending: number };
  alerts: { pending: number; active: number; unsubscribed: number };
  matcherProduct: { alertPending: number; alertActive: number; alertUnsubscribed: number; helpful: number; notRelevant: number };
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

type HealthIssue = 'apply' | 'core' | 'evidence' | 'translation';

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ContentHealthPanel({ onEditOpportunity }: { onEditOpportunity: (id: string, issue: HealthIssue) => void }) {
  const [data, setData] = useState<ContentHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [issue, setIssue] = useState<HealthIssue>('apply');
  const [issuePage, setIssuePage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/content-health?issue=${issue}&page=${issuePage}`, { cache: 'no-store' })
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
  }, [reloadKey, issue, issuePage]);

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

  const { opportunities: opp, translation, matchability, deadlines, submissions, alerts, matcherProduct } = data;
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
        <StatCard label="No usable apply link" value={deadlines.noApplyLink} sub={`${deadlines.noStoredApplyLink} absent · ${deadlines.sourceFallback} source articles`} icon={ExternalLink} accent={deadlines.noApplyLink > 0 ? 'amber' : 'emerald'} />
        <StatCard
          label="Matcher core fields present"
          value={matchability.coreReady}
          sub={`${matchability.eligibilityRich} eligibility-rich · ${matchability.weakData} weak-data`}
          icon={CheckCircle2}
          accent={matchability.weakData > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Matcher data quality */}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Opportunity Matcher data quality
          </CardTitle>
          <Badge variant="secondary">
            {matchability.coreReady}/{matchability.publishedTotal} category + country
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Eligibility-rich</p>
              <p className="mt-1 text-xl font-black tabular-nums">{matchability.eligibilityRich}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">3+ structured/free-text eligibility signals</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Fresh source checks</p>
              <p className="mt-1 text-xl font-black tabular-nums">{matchability.freshVerified}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">source recorded and checked within 30 days</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Normalized profiles</p>
              <p className="mt-1 text-xl font-black tabular-nums">{matchability.normalizedProfiles}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">opportunities with first-class match facts</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Human-reviewed</p>
              <p className="mt-1 text-xl font-black tabular-nums">{matchability.reviewedProfiles}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">normalized profiles explicitly reviewed</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Match alerts</p>
              <p className="mt-1 text-xl font-black tabular-nums">{matcherProduct.alertActive}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{matcherProduct.alertPending} pending confirmation · {matcherProduct.alertUnsubscribed} unsubscribed</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Matcher feedback</p>
              <p className="mt-1 text-xl font-black tabular-nums">{matcherProduct.helpful + matcherProduct.notRelevant}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{matcherProduct.helpful} helpful · {matcherProduct.notRelevant} not relevant</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Weak match data</p>
              <p className="mt-1 text-xl font-black tabular-nums text-amber-600 dark:text-amber-400">{matchability.weakData}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{matchability.noCategory} no category · {matchability.noCountry} no country · {matchability.noEvidence} no eligibility evidence</p>
            </div>
          </div>
          {matchability.normalizedProfiles === 0 && matchability.publishedTotal > 0 &&
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              No normalized match profiles exist yet. The matcher can use source text, but structured profile facts require the separate explicit-data backfill and review.
            </p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Repair opportunities</CardTitle>
          <p className="text-xs text-muted-foreground">Open a record to correct the source-backed fields. Counts can overlap.</p>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {([
              ['apply', 'No usable apply link', deadlines.noApplyLink],
              ['core', 'Missing category or country', matchability.publishedTotal - matchability.coreReady],
              ['evidence', 'Weak match data', matchability.weakData],
              ['translation', 'Full translation pending', translation.publishedTotal - (translation.engine?.psComplete ?? 0)],
            ] as const).map(([key, label, count]) => (
              <Button key={key} size="sm" variant={issue === key ? 'default' : 'outline'} onClick={() => { setIssue(key); setIssuePage(1); setLoading(true); }}>
                {label} ({count})
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {data.issueQueue.items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.title}>{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sourceName || 'Manual'} · {issue === 'apply' ? item.applyType.replaceAll('_', ' ') : issue === 'translation' ? `Persian ${item.faStatus || 'pending'} · Pashto ${item.psStatus || 'pending'}` : item.missing.join(', ') || 'Eligibility details need review'}
                  </p>
                </div>
                {(() => {
                  const source = [item.originalUrl, item.sourceUrl].find((url) => url && /^https?:\/\//i.test(url));
                  return source && <Button asChild size="sm" variant="outline"><a href={source} target="_blank" rel="noopener noreferrer">Check source</a></Button>;
                })()}
                <Button size="sm" onClick={() => onEditOpportunity(item.id, issue)}>Edit exact record</Button>
              </div>
            ))}
            {data.issueQueue.total === 0 && <p className="py-4 text-sm text-muted-foreground">No records in this queue.</p>}
          </div>
          {data.issueQueue.total > 25 && <div className="mt-3 flex items-center justify-between text-xs">
            <Button size="sm" variant="outline" disabled={issuePage === 1} onClick={() => { setIssuePage((p) => p - 1); setLoading(true); }}>Previous</Button>
            <span>Page {issuePage} of {Math.ceil(data.issueQueue.total / 25)}</span>
            <Button size="sm" variant="outline" disabled={issuePage * 25 >= data.issueQueue.total} onClick={() => { setIssuePage((p) => p + 1); setLoading(true); }}>Next</Button>
          </div>}
        </CardContent>
      </Card>

      {/* Translation coverage */}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="h-4 w-4 text-primary" />
            Translation coverage
          </CardTitle>
          <Badge variant="secondary">
            {translation.trilingual}/{translation.publishedTotal} title/summary in FA+PS
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Translation coverage bars">
            <div className="bg-emerald-500 transition-all" style={{ width: `${coveragePct}%` }} title={`Trilingual ${translation.trilingual}`} />
            <div className="bg-amber-500 transition-all" style={{ width: `${partialPct}%` }} title={`Partial ${translation.partial}`} />
            <div className="bg-muted-foreground/30 transition-all" style={{ width: `${Math.max(0, 100 - coveragePct - partialPct)}%` }} title={`English only ${translation.englishOnly}`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <Legend color="bg-emerald-500" label={`Title/summary in FA+PS: ${translation.trilingual}`} />
            <Legend color="bg-amber-500" label={`Partial: ${translation.partial}`} />
            <Legend color="bg-muted-foreground/30" label={`English only: ${translation.englishOnly}`} />
          </div>
          {translation.englishOnly > 20 && (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              {translation.englishOnly} published records have no Farsi/Pashto title or summary. The engine status below tracks full-field translation progress.
            </p>
          )}
          {translation.engine && (
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Persian-first engine (authoritative)
              </p>
              {translation.schedule && <p className="mt-1 text-xs text-muted-foreground">
                Last scheduled unit: {translation.schedule.lastFinishedAt ? new Date(translation.schedule.lastFinishedAt).toLocaleString() : 'not recorded'} · {translation.schedule.unitsToday}/{translation.schedule.dailyLimit} units used today
                {translation.schedule.backoffUntil && new Date(translation.schedule.backoffUntil) > new Date() ? ` · provider backoff until ${new Date(translation.schedule.backoffUntil).toLocaleString()}` : ''}
              </p>}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <span>
                  <strong className="tabular-nums">{translation.engine.faComplete}</strong>
                  <span className="text-muted-foreground">/{translation.engine.faActive} Persian complete</span>
                </span>
                <span>
                  <strong className="tabular-nums">{translation.engine.psComplete}</strong>
                  <span className="text-muted-foreground"> Pashto complete</span>
                </span>
                <span>
                  <strong className="tabular-nums">{translation.engine.psWaiting}</strong>
                  <span className="text-muted-foreground"> Pashto waiting for Persian</span>
                </span>
                <span>
                  <strong className={cn('tabular-nums', translation.engine.failedChunks > 0 && 'text-amber-600 dark:text-amber-400')}>
                    {translation.engine.failedChunks}
                  </strong>
                  <span className="text-muted-foreground"> failed chunks (auto-retry daily)</span>
                </span>
                <span>
                  <strong className="tabular-nums">{translation.engine.pendingChunks}</strong>
                  <span className="text-muted-foreground"> chunks in queue</span>
                </span>
              </div>
            </div>
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
