'use client';

/**
 * AutomationPanel — control room for the R26 automation pipeline:
 *  - Publish channels (Telegram / Facebook / Instagram / X) with tokens + test
 *  - Posting schedule (Afghanistan peak-time slots, AFT) + caption languages
 *  - Auto-import + rate-limit-aware translation settings
 *  - Posting queue with per-row status, Publish now / Cancel
 *  - Pipeline run history + untranslated backlog counters
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, Bot, CalendarClock, Check, Clock, Facebook, Instagram, Linkedin,
  Loader2, MessageCircle, Play, RefreshCw, Send, Settings2, Twitter, X as XIcon, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';
import { cn } from '@/lib/utils';

interface Channel {
  id: string; platform: string; label: string; enabled: boolean;
  credentials: Record<string, unknown> | null;
  lastStatus: string | null; lastError: string | null; lastPublishedAt: string | null;
}
interface QueueRow {
  id: string; scheduledFor: string; templateType: string; contentRef: string | null;
  status: string; imageStatus: string; attempts: number; error: string | null;
  captionJson: Record<string, string>;
  deliveries?: Array<{
    id: string;
    platform: string;
    status: string;
    attempts: number;
    errorCode: string | null;
    error: string | null;
    permalink: string | null;
    publishedAt: string | null;
    nextAttemptAt: string | null;
  }>;
}
interface RunRow {
  id: string; kind: string; status: string; startedAt: string; finishedAt: string | null; message: string | null;
}
interface Status {
  state: {
    publishTimes: string[]; captionLangs?: string[]; translateBatch?: number;
    autoImport?: boolean; autoPublish?: boolean; translateBackoffUntil?: string | null;
    opportunityOnlyAutomation?: boolean;
    opportunityDailyTarget?: number;
    opportunityBatchSize?: number;
    opportunityRepeatDays?: number;
    opportunityBatchTimes?: string[];
    lastSocialTickAt?: string | null;
    lastSocialTickStatus?: string | null;
    lastSocialTickRendered?: number;
    lastSocialTickPublished?: number;
    lastSocialTickFailed?: number;
    lastSocialTickError?: string | null;
  };
  channels: Channel[];
  queue: QueueRow[];
  runs: RunRow[];
  untranslated: { opportunities: number; news: number };
  aiProviders?: { name: string; configured: boolean; cooling: boolean; cooldownSecondsLeft: number; lastError: string | null; usedCount: number }[];
}

const PLATFORM_META: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  credFields: { key: string; label: string; kind?: 'select'; options?: { value: string; label: string }[] }[];
}> = {
  telegram: { icon: Send, credFields: [{ key: 'botToken', label: 'Bot token' }, { key: 'chatId', label: 'Channel ID (@channel or -100…)' }] },
  facebook: { icon: Facebook, credFields: [{ key: 'pageId', label: 'Page ID' }, { key: 'accessToken', label: 'Page access token' }] },
  instagram: { icon: Instagram, credFields: [{ key: 'igUserId', label: 'Instagram business user ID' }, { key: 'accessToken', label: 'Access token' }] },
  x: { icon: XIcon, credFields: [{ key: 'accessToken', label: 'OAuth 2.0 access token' }] },
  linkedin: { icon: Linkedin, credFields: [{ key: 'accessToken', label: 'LinkedIn access token' }, { key: 'authorUrn', label: 'Organization numeric ID or full author URN' }] },
  whatsapp: {
    icon: MessageCircle,
    credFields: [
      {
        key: 'mode',
        label: 'Destination mode',
        kind: 'select',
        options: [
          { value: 'individual', label: 'Individual recipient' },
          { value: 'group', label: 'Meta Groups API group' },
          { value: 'channel', label: 'WhatsApp Channel (not supported by this API)' },
        ],
      },
      { key: 'accessToken', label: 'WhatsApp system-user access token' },
      { key: 'phoneNumberId', label: 'Phone Number ID (Meta Business)' },
      { key: 'recipient', label: 'Recipient phone / WA ID (individual mode)' },
      { key: 'groupId', label: 'Group ID (Groups API mode)' },
      { key: 'channelId', label: 'Legacy Channel ID (diagnostic only)' },
    ],
  },
};

const ALL_TIMES = ['07:00', '08:00', '09:00', '12:00', '12:30', '13:00', '17:00', '19:00', '20:00', '21:00'];
const OPPORTUNITY_TIMES = ['07:00', '08:00', '09:00', '10:30', '12:00', '13:00', '15:30', '17:00', '18:00', '19:00', '20:30', '21:00'];

const statusTone = (s: string) =>
  s === 'published' || s === 'ok' ? 'border-emerald-400/60 text-emerald-600 dark:text-emerald-400'
  : s === 'partial' ? 'border-amber-400/60 text-amber-600 dark:text-amber-400'
  : s === 'failed' || s === 'error' ? 'border-destructive/60 text-destructive'
  : s === 'ready' || s === 'pending' ? 'border-sky-400/60 text-sky-600 dark:text-sky-400'
  : 'border-border text-muted-foreground';

export function AutomationPanel() {
  const t = useT();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [credDrafts, setCredDrafts] = useState<Record<string, Record<string, string>>>({});

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/automation', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setStatus(data);
    } catch { /* keep old */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const act = useCallback(async (body: Record<string, unknown>, busyKey: string, okMsg?: string) => {
    setBusy(busyKey);
    try {
      const res = await fetch('/api/admin/automation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) toast({ title: okMsg || t('admin.automation.saved') });
      else toast({ title: data.error || 'Failed', variant: 'destructive' });
      await fetchStatus();
      return data;
    } catch {
      toast({ title: 'Request failed', variant: 'destructive' });
    } finally { setBusy(null); }
  }, [fetchStatus, t, toast]);

  const runTick = async () => {
    setBusy('tick');
    try {
      const res = await fetch('/api/admin/pipeline/tick', { method: 'POST' });
      const data = await res.json();
      if (data.ok) toast({ title: t('admin.automation.tickDone') });
      await fetchStatus();
    } catch { toast({ title: 'Tick failed', variant: 'destructive' }); } finally { setBusy(null); }
  };

  const toggleTime = (slot: string) => {
    if (!status) return;
    const cur = status.state.publishTimes || [];
    const next = cur.includes(slot) ? cur.filter((x) => x !== slot) : [...cur, slot].sort();
    if (next.length) void act({ action: 'save-state', publishTimes: next }, 'times');
  };

  const toggleOpportunityTime = (slot: string) => {
    if (!status) return;
    const cur = status.state.opportunityBatchTimes || [];
    const next = cur.includes(slot) ? cur.filter((x) => x !== slot) : [...cur, slot].sort();
    if (next.length) void act({ action: 'save-state', opportunityBatchTimes: next }, 'opp-times');
  };

  const saveChannel = async (platform: string, enabled: boolean) => {
    const draft = credDrafts[platform] || {};
    // Credentials are masked by the API (secrets never round-trip), so we send
    // only the fields the user typed; the server merges them with what's
    // stored. Toggling enabled alone leaves credentials untouched.
    const credentials = Object.fromEntries(Object.entries(draft).filter(([, v]) => typeof v === 'string' && v));
    await act({ action: 'save-channel', platform, label: platform, enabled, credentials }, `ch-${platform}`);
    setCredDrafts((prev) => ({ ...prev, [platform]: {} }));
  };

  if (loading && !status) {
    return <div className="grid h-40 place-items-center rounded-xl border bg-card"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!status) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Failed to load automation status.</div>;
  }

  const state = status.state;
  const backoffUntil = state.translateBackoffUntil ? new Date(state.translateBackoffUntil) : null;
  const backoffActive = backoffUntil ? backoffUntil > new Date() : false;

  return (
    <div className="space-y-4">
      {/* header + tick */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold">{t('admin.automation.title')}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground" dir="auto">{t('admin.automation.sub')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={fetchStatus} disabled={busy !== null}>
              <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} /> {t('admin.automation.refresh')}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={runTick} disabled={busy !== null}>
              {busy === 'tick' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {t('admin.automation.runNow')}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3" /> {status.untranslated.opportunities} {t('admin.automation.oppPending')}</Badge>
          <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3" /> {status.untranslated.news} {t('admin.automation.newsPending')}</Badge>
          {(status.aiProviders ?? []).map((p) => (
            <Badge
              key={p.name}
              variant="outline"
              className={cn('gap-1', p.configured ? (p.cooling ? 'border-amber-400/60 text-amber-600 dark:text-amber-400' : 'border-emerald-400/60 text-emerald-600 dark:text-emerald-400') : 'text-muted-foreground')}
              title={p.lastError ?? undefined}
            >
              <Sparkles className="h-3 w-3" /> {p.name}: {p.configured ? (p.cooling ? `cooling ${p.cooldownSecondsLeft}s` : 'ready') : 'no key'}
            </Badge>
          ))}
          {backoffActive ? (
            <Badge variant="outline" className="border-amber-400/60 text-amber-600 dark:text-amber-400">
              {t('admin.automation.backoffUntil')} {backoffUntil?.toLocaleTimeString?.() ?? ''}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-400/60 text-emerald-600 dark:text-emerald-400">{t('admin.automation.quotaHealthy')}</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ── schedule & settings ── */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-primary/20 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Opportunity distribution
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Automatic social publishing uses opportunities only. Quotes, tips, stats, stories and news remain available in Brand Studio for manual use.
                </p>
              </div>
              <Switch
                checked={state.opportunityOnlyAutomation !== false}
                onCheckedChange={(v) => act({ action: 'save-state', opportunityOnlyAutomation: v }, 'opp-only')}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border bg-background/50 px-3 py-2 text-[11px]">
              <span className="font-semibold">Social worker:</span>
              {state.lastSocialTickAt ? (
                <>
                  <Badge variant="outline" className={cn('text-[10px]', statusTone(state.lastSocialTickStatus || 'pending'))}>
                    {state.lastSocialTickStatus || 'unknown'}
                  </Badge>
                  <span className="text-muted-foreground">
                    last cycle {new Date(state.lastSocialTickAt).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">
                    · rendered {state.lastSocialTickRendered ?? 0}
                    {' · '}published {state.lastSocialTickPublished ?? 0}
                    {' · '}failed {state.lastSocialTickFailed ?? 0}
                  </span>
                  {state.lastSocialTickError ? (
                    <span className="w-full truncate text-destructive" title={state.lastSocialTickError}>
                      {state.lastSocialTickError}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  no dedicated social-worker heartbeat recorded yet
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Daily target</Label>
                <Select
                  value={String(state.opportunityDailyTarget ?? 30)}
                  onValueChange={(v) => act({ action: 'save-state', opportunityDailyTarget: Number(v) }, 'opp-target')}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40].map((n) => <SelectItem key={n} value={String(n)}>{n} posts/day</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Posts per batch</Label>
                <Select
                  value={String(state.opportunityBatchSize ?? 5)}
                  onValueChange={(v) => act({ action: 'save-state', opportunityBatchSize: Number(v) }, 'opp-batch')}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Repeat cooldown</Label>
                <Select
                  value={String(state.opportunityRepeatDays ?? 14)}
                  onValueChange={(v) => act({ action: 'save-state', opportunityRepeatDays: Number(v) }, 'opp-repeat')}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[7, 14, 21, 30].map((n) => <SelectItem key={n} value={String(n)}>{n} days</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs">Batch windows (Afghanistan time)</Label>
                <span className="text-[10px] text-muted-foreground">
                  Capacity: {(state.opportunityBatchTimes?.length ?? 0) * (state.opportunityBatchSize ?? 5)} posts/day
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {OPPORTUNITY_TIMES.map((slot) => {
                  const active = (state.opportunityBatchTimes || []).includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleOpportunityTime(slot)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <Clock className="me-1 inline h-3 w-3" />
                      {slot}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Posts inside each batch are staggered by 2 minutes instead of being sent simultaneously.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold"><CalendarClock className="h-4 w-4 text-primary" /> {t('admin.automation.schedule')}</h3>
            <p className="mt-1 text-xs text-muted-foreground" dir="auto">{t('admin.automation.scheduleHint')}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ALL_TIMES.map((slot) => {
                const active = state.publishTimes.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleTime(slot)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Clock className="me-1 inline h-3 w-3" />
                    {slot}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">{t('admin.automation.captionLangs')}</Label>
                <Select
                  value={(state.captionLangs || ['fa', 'ps', 'en']).join(',')}
                  onValueChange={(v) => act({ action: 'save-state', captionLangs: v.split(',') }, 'langs')}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fa,ps,en">fa + ps + en</SelectItem>
                    <SelectItem value="fa,ps">fa + ps</SelectItem>
                    <SelectItem value="fa">fa only</SelectItem>
                    <SelectItem value="en">en only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t('admin.automation.batchSize')}</Label>
                <Select
                  value={String(state.translateBatch ?? 3)}
                  onValueChange={(v) => act({ action: 'save-state', translateBatch: Number(v) }, 'batch')}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} / {t('admin.automation.perTick')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold">{t('admin.automation.autoImport')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('admin.automation.autoImportHint')}</p>
                </div>
                <Switch checked={state.autoImport !== false} onCheckedChange={(v) => act({ action: 'save-state', autoImport: v }, 'ai')} />
              </div>
              <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold">{t('admin.automation.autoPublish')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('admin.automation.autoPublishHint')}</p>
                </div>
                <Switch checked={state.autoPublish !== false} onCheckedChange={(v) => act({ action: 'save-state', autoPublish: v }, 'ap')} />
              </div>
            </div>
          </section>

          {/* ── pipeline runs ── */}
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold"><Settings2 className="h-4 w-4 text-primary" /> {t('admin.automation.runs')}</h3>
            <div className="mt-2 max-h-52 space-y-1.5 overflow-y-auto pe-1">
              {status.runs.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">{t('admin.automation.noRuns')}</p>
              ) : status.runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs">
                  <span className="font-medium">{new Date(r.startedAt).toLocaleTimeString?.() ?? r.startedAt.slice(11, 19)}</span>
                  <Badge variant="outline" className={cn('text-[10px]', statusTone(r.status))}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── channels + queue ── */}
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold"><Bot className="h-4 w-4 text-primary" /> {t('admin.automation.channels')}</h3>
            <div className="mt-3 space-y-3">
              {Object.entries(PLATFORM_META).map(([platform, meta]) => {
                const ch = status.channels.find((c) => c.platform === platform);
                const Icon = meta.icon;
                const draft = credDrafts[platform] ?? {};
                return (
                  <div key={platform} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-semibold capitalize">{platform}</span>
                        {ch?.lastStatus ? (
                          <Badge variant="outline" className={cn('text-[10px]', statusTone(ch.lastStatus))}>
                            {ch.lastStatus}
                          </Badge>
                        ) : null}
                      </div>
                      <Switch
                        checked={ch?.enabled ?? false}
                        onCheckedChange={(v) => saveChannel(platform, v)}
                        disabled={busy === `ch-${platform}`}
                      />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {meta.credFields.map((f) => (
                        <div key={f.key}>
                          <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                          {f.kind === 'select' ? (
                            <Select
                              value={
                                draft[f.key] ??
                                (typeof ch?.credentials?.[f.key] === 'string' ? (ch.credentials[f.key] as string) : 'individual')
                              }
                              onValueChange={(value) =>
                                setCredDrafts((prev) => ({
                                  ...prev,
                                  [platform]: { ...prev[platform], [f.key]: value },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(f.options ?? []).map((option) => (
                                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type="password"
                              className="h-8 text-xs"
                              value={draft[f.key] ?? (typeof ch?.credentials?.[f.key] === 'string' ? (ch?.credentials?.[f.key] as string) : '')}
                              placeholder={ch?.credentials?.[f.key] === true ? 'saved — leave blank to keep' : f.label}
                              onChange={(e) => setCredDrafts((prev) => ({ ...prev, [platform]: { ...prev[platform], [f.key]: e.target.value } }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      {ch?.lastError ? <p className="truncate text-[10px] text-destructive">{ch.lastError}</p> : <span />}
                      <Button
                        size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
                        disabled={busy === `test-${platform}`}
                        onClick={async () => {
                          const draft = credDrafts[platform] || {};
                          if (Object.keys(draft).length) await saveChannel(platform, ch?.enabled ?? true);
                          await act({ action: 'test-channel', platform }, `test-${platform}`);
                        }}
                      >
                        {busy === `test-${platform}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        {t('admin.automation.test')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground" dir="auto">{t('admin.automation.channelsHint')}</p>
          </section>

          {/* ── posting queue ── */}
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold"><Twitter className="h-4 w-4 hidden" /><CalendarClock className="h-4 w-4 text-primary" /> {t('admin.automation.queue')}</h3>
            <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pe-1">
              {status.queue.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">{t('admin.automation.queueEmpty')}</p>
              ) : status.queue.map((q) => (
                <div key={q.id} className="rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold" dir="auto">{q.captionJson?.fa?.slice(0, 60) || q.captionJson?.en?.slice(0, 60) || q.templateType}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(q.scheduledFor).toLocaleString?.() ?? q.scheduledFor.slice(0, 16)} · {q.templateType} · {q.imageStatus}
                        {q.attempts ? ` · ${q.attempts}×` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="outline" className={cn('text-[10px]', statusTone(q.status))}>{q.status}</Badge>
                      {q.status !== 'published' && q.status !== 'cancelled' ? (
                        <>
                          <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px]" disabled={busy === `pub-${q.id}`}
                            onClick={() => act({ action: 'publish-now', id: q.id }, `pub-${q.id}`, t('admin.automation.publishSent'))}>
                            {busy === `pub-${q.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[10px]" disabled={busy === `cx-${q.id}`}
                            onClick={() => act({ action: 'cancel-post', id: q.id }, `cx-${q.id}`)}>
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {q.deliveries?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.deliveries.map((delivery) => (
                        <span
                          key={delivery.id}
                          title={delivery.error || delivery.errorCode || undefined}
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[9px] font-semibold',
                            statusTone(delivery.status),
                          )}
                        >
                          {delivery.platform}: {delivery.status}
                          {delivery.attempts ? ` · ${delivery.attempts}×` : ''}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {q.error ? <p className="mt-1 line-clamp-2 text-[10px] text-destructive">{q.error}</p> : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
