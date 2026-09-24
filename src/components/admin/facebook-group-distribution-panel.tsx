'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ExternalLink, Facebook, Loader2, Pause,
  Play, Plus, RefreshCw, RotateCcw, ShieldAlert, Trash2, XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Group = {
  id: string; name: string; url: string; groupId: string | null;
  language: string | null; audience: string | null; region: string | null;
  active: boolean; postingEligible: boolean; approvalRequired: boolean;
  tags: { id: string; name: string; slug: string }[];
};

type Rule = {
  id: string; name: string; enabled: boolean; contentKinds: string[];
  contentCategories: string[]; includeTags: string[]; excludeTags: string[];
  languages: string[]; regions: string[]; priority: number;
};

type Job = {
  id: string; sourceQueueId: string; status: string; attemptCount: number;
  matchReasons: { type: string; value: string }[];
  errorMessage: string | null; suggestedAction: string | null;
  group: { id: string; name: string; url: string; approvalRequired: boolean };
  campaign: { id: string; sourceContentRef: string | null; sourceQueueId: string | null };
};

type Queue = {
  id: string; scheduledFor: string; templateType: string; contentRef: string | null;
  captionJson: Record<string, string>; status: string;
  facebookGroupDistribution: boolean; facebookGroupMode: string;
};

type Data = {
  controls: { enabled: boolean; paused: boolean };
  counts: { groups: number; activeGroups: number; pendingReview: number; failed: number; completed: number };
  groups: Group[]; rules: Rule[]; jobs: Job[]; queue: Queue[];
  platform: { transport: string; automated: boolean; reason: string };
};

const tone = (s: string) =>
  s === 'completed' ? 'border-emerald-400/60 text-emerald-600 dark:text-emerald-400'
    : s === 'failed' ? 'border-destructive/60 text-destructive'
      : s === 'paused' || s === 'approval_required' ? 'border-amber-400/60 text-amber-600 dark:text-amber-400'
        : 'border-sky-400/60 text-sky-600 dark:text-sky-400';

export function FacebookGroupDistributionPanel() {
  const { toast } = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState({
    name: '', url: '', tags: '', language: 'any', region: '', audience: '', approvalRequired: false,
  });
  const [ruleDraft, setRuleDraft] = useState({
    name: '', contentCategories: '', includeTags: '', languages: '', regions: '',
    requireLanguageMatch: false, requireRegionMatch: false,
  });

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/facebook-groups', { cache: 'no-store' });
      const j = await r.json();
      if (j.ok) setData(j);
    } catch {
      // Keep the previous snapshot on a transient admin-network failure.
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = useCallback(async (body: Record<string, unknown>, key: string, message?: string) => {
    setBusy(key);
    try {
      const r = await fetch('/api/admin/facebook-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Request failed');
      toast({ title: message || 'Facebook Group Distribution updated' });
      await load();
      return j;
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Request failed', variant: 'destructive' });
      return null;
    } finally {
      setBusy(null);
    }
  }, [load, toast]);

  const queueById = useMemo(() => new Map((data?.queue ?? []).map((q) => [q.id, q])), [data?.queue]);

  if (!data) {
    return (
      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-bold"><Loader2 className="h-4 w-4 animate-spin" /> Loading Facebook Group Distribution…</div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Facebook className="h-4 w-4 text-primary" /> Facebook Group Distribution
          </h3>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Queue, match, review and track Facebook Group destinations without changing Facebook Page publishing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="me-1 h-3.5 w-3.5" /> Refresh</Button>
          {data.controls.paused ? (
            <Button size="sm" onClick={() => void act({ action: 'set-emergency-control', control: 'resume-all' }, 'resume', 'Group distribution resumed')}>
              <Play className="me-1 h-3.5 w-3.5" /> Resume
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void act({ action: 'set-emergency-control', control: 'pause-all' }, 'pause', 'Group distribution paused')}>
              <Pause className="me-1 h-3.5 w-3.5" /> Pause all
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-amber-400/40 bg-amber-500/5 p-3 text-xs">
        <div className="flex gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Current transport: manual assist</p>
            <p className="mt-1 text-muted-foreground">
              {data.platform.reason} ARIA HUB prepares each destination, caption and match explanation; an administrator opens the group and publishes manually.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        {[
          ['Groups', data.counts.groups],
          ['Eligible', data.counts.activeGroups],
          ['Review', data.counts.pendingReview],
          ['Completed', data.counts.completed],
          ['Failed', data.counts.failed],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border p-3">
            <h4 className="text-xs font-bold">Add Facebook Group</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div><Label className="text-[10px]">Group name</Label><Input className="mt-1 h-8 text-xs" value={groupDraft.name} onChange={(e) => setGroupDraft((v) => ({ ...v, name: e.target.value }))} /></div>
              <div><Label className="text-[10px]">Group URL</Label><Input className="mt-1 h-8 text-xs" placeholder="https://facebook.com/groups/…" value={groupDraft.url} onChange={(e) => setGroupDraft((v) => ({ ...v, url: e.target.value }))} /></div>
              <div><Label className="text-[10px]">Tags (comma separated)</Label><Input className="mt-1 h-8 text-xs" placeholder="Scholarships, Afghanistan, Students" value={groupDraft.tags} onChange={(e) => setGroupDraft((v) => ({ ...v, tags: e.target.value }))} /></div>
              <div>
                <Label className="text-[10px]">Language</Label>
                <Select value={groupDraft.language} onValueChange={(language) => setGroupDraft((v) => ({ ...v, language }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="fa">Persian</SelectItem><SelectItem value="ps">Pashto</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-[10px]">Region</Label><Input className="mt-1 h-8 text-xs" placeholder="Afghanistan" value={groupDraft.region} onChange={(e) => setGroupDraft((v) => ({ ...v, region: e.target.value }))} /></div>
              <div><Label className="text-[10px]">Audience</Label><Input className="mt-1 h-8 text-xs" placeholder="Students" value={groupDraft.audience} onChange={(e) => setGroupDraft((v) => ({ ...v, audience: e.target.value }))} /></div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs"><Switch checked={groupDraft.approvalRequired} onCheckedChange={(approvalRequired) => setGroupDraft((v) => ({ ...v, approvalRequired }))} /> Approval required</label>
              <Button size="sm" disabled={!groupDraft.name || !groupDraft.url || busy === 'add-group'} onClick={async () => {
                const ok = await act({ action: 'save-group', ...groupDraft }, 'add-group', 'Facebook group saved');
                if (ok) setGroupDraft({ name: '', url: '', tags: '', language: 'any', region: '', audience: '', approvalRequired: false });
              }}>
                {busy === 'add-group' ? <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="me-1 h-3.5 w-3.5" />} Add group
              </Button>
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <h4 className="text-xs font-bold">Groups</h4>
            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pe-1">
              {data.groups.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No groups configured yet.</p> : data.groups.map((g) => (
                <div key={g.id} className="rounded-lg border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a className="flex items-center gap-1 truncate text-xs font-semibold hover:underline" href={g.url} target="_blank" rel="noreferrer">{g.name}<ExternalLink className="h-3 w-3 shrink-0" /></a>
                      <p className="mt-1 text-[10px] text-muted-foreground">{[g.language, g.region, g.audience].filter(Boolean).join(' · ') || 'No targeting metadata'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={cn('text-[10px]', g.active && g.postingEligible ? 'border-emerald-400/60 text-emerald-600' : 'text-muted-foreground')}>{g.active && g.postingEligible ? 'active' : 'paused'}</Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void act({ action: 'remove-group', id: g.id }, `rm-${g.id}`, 'Group removed/archived')}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">{g.tags.map((tag) => <Badge key={tag.id} variant="secondary" className="text-[9px]">{tag.name}</Badge>)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border p-3">
            <h4 className="text-xs font-bold">Distribution Rule</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div><Label className="text-[10px]">Rule name</Label><Input className="mt-1 h-8 text-xs" placeholder="Scholarship groups" value={ruleDraft.name} onChange={(e) => setRuleDraft((v) => ({ ...v, name: e.target.value }))} /></div>
              <div><Label className="text-[10px]">Content categories</Label><Input className="mt-1 h-8 text-xs" placeholder="Scholarship" value={ruleDraft.contentCategories} onChange={(e) => setRuleDraft((v) => ({ ...v, contentCategories: e.target.value }))} /></div>
              <div><Label className="text-[10px]">Include group tags</Label><Input className="mt-1 h-8 text-xs" placeholder="Scholarships, Students" value={ruleDraft.includeTags} onChange={(e) => setRuleDraft((v) => ({ ...v, includeTags: e.target.value }))} /></div>
              <div><Label className="text-[10px]">Languages</Label><Input className="mt-1 h-8 text-xs" placeholder="fa, ps, en" value={ruleDraft.languages} onChange={(e) => setRuleDraft((v) => ({ ...v, languages: e.target.value }))} /></div>
              <div><Label className="text-[10px]">Regions</Label><Input className="mt-1 h-8 text-xs" placeholder="Afghanistan" value={ruleDraft.regions} onChange={(e) => setRuleDraft((v) => ({ ...v, regions: e.target.value }))} /></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-2"><Switch checked={ruleDraft.requireLanguageMatch} onCheckedChange={(requireLanguageMatch) => setRuleDraft((v) => ({ ...v, requireLanguageMatch }))} /> Match language</label>
                <label className="flex items-center gap-2"><Switch checked={ruleDraft.requireRegionMatch} onCheckedChange={(requireRegionMatch) => setRuleDraft((v) => ({ ...v, requireRegionMatch }))} /> Match region</label>
              </div>
              <Button size="sm" disabled={!ruleDraft.name || busy === 'add-rule'} onClick={async () => {
                const ok = await act({ action: 'save-rule', ...ruleDraft }, 'add-rule', 'Distribution rule saved');
                if (ok) setRuleDraft({ name: '', contentCategories: '', includeTags: '', languages: '', regions: '', requireLanguageMatch: false, requireRegionMatch: false });
              }}><Plus className="me-1 h-3.5 w-3.5" /> Add rule</Button>
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <h4 className="text-xs font-bold">Rules</h4>
            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pe-1">
              {data.rules.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No matching rules yet.</p> : data.rules.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 rounded-lg border p-2.5">
                  <div>
                    <p className="text-xs font-semibold">{r.name}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{[r.contentCategories.join(', '), r.includeTags.length ? `tags: ${r.includeTags.join(', ')}` : '', r.regions.join(', ')].filter(Boolean).join(' · ') || 'Broad match'}</p>
                  </div>
                  <div className="flex items-center gap-1"><Badge variant="outline" className="text-[10px]">{r.enabled ? 'enabled' : 'disabled'}</Badge><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void act({ action: 'remove-rule', id: r.id }, `rr-${r.id}`, 'Rule removed')}><Trash2 className="h-3 w-3" /></Button></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h4 className="text-xs font-bold">Queue posts → Group campaigns</h4><p className="mt-1 text-[10px] text-muted-foreground">Enable group distribution only for posts you want matched to configured groups.</p></div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => void act({ action: 'set-emergency-control', control: 'retry-failed' }, 'retry-all', 'Failed jobs returned to review')}><RotateCcw className="me-1 h-3 w-3" /> Retry failed</Button>
            <Button size="sm" variant="outline" onClick={() => void act({ action: 'set-emergency-control', control: 'cancel-pending' }, 'cancel-all', 'Pending group jobs cancelled')}><XCircle className="me-1 h-3 w-3" /> Cancel pending</Button>
          </div>
        </div>
        <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pe-1">
          {data.queue.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold" dir="auto">{q.captionJson?.fa?.slice(0, 70) || q.captionJson?.en?.slice(0, 70) || q.contentRef || q.templateType}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(q.scheduledFor).toLocaleString()} · {q.templateType} · {q.status}</p>
              </div>
              <label className="flex items-center gap-2 text-[10px]">
                Groups
                <Switch checked={q.facebookGroupDistribution} disabled={!data.controls.enabled || busy === `dist-${q.id}`} onCheckedChange={(enabled) => void act({ action: 'enable-distribution', queueId: q.id, enabled, mode: 'auto' }, `dist-${q.id}`, enabled ? 'Group matching enabled' : 'Group matching disabled')} />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-3">
        <h4 className="text-xs font-bold">Distribution jobs</h4>
        <div className="mt-2 max-h-96 space-y-2 overflow-y-auto pe-1">
          {data.jobs.length === 0 ? <p className="py-5 text-center text-xs text-muted-foreground">No Facebook Group distribution jobs yet.</p> : data.jobs.map((j) => {
            const q = queueById.get(j.sourceQueueId);
            const caption = q?.captionJson?.fa || q?.captionJson?.ps || q?.captionJson?.en || '';
            return (
              <div key={j.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{j.group.name}</p>
                    <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground" dir="auto">{caption || j.campaign.sourceContentRef || 'ARIA HUB post'}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px]', tone(j.status))}>{j.status}</Badge>
                </div>
                {j.matchReasons?.length ? <p className="mt-2 text-[10px] text-muted-foreground">Selected because: {j.matchReasons.map((r) => `${r.type}: ${r.value}`).join(' · ')}</p> : null}
                {j.errorMessage ? <p className="mt-1 text-[10px] text-destructive">{j.errorMessage}</p> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {j.status !== 'completed' && j.status !== 'cancelled' ? (
                    <>
                      <Button size="sm" className="h-7 text-[10px]" asChild onClick={() => void act({ action: 'job-action', id: j.id, op: 'open' }, `open-${j.id}`)}>
                        <a href={j.group.url} target="_blank" rel="noreferrer"><ExternalLink className="me-1 h-3 w-3" /> Open group</a>
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={async () => {
                        if (caption) await navigator.clipboard.writeText(caption);
                        toast({ title: caption ? 'Caption copied' : 'No caption available' });
                      }}>Copy caption</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => void act({ action: 'job-action', id: j.id, op: 'complete' }, `done-${j.id}`, 'Distribution marked completed')}><CheckCircle2 className="me-1 h-3 w-3" /> Complete</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => void act({ action: 'job-action', id: j.id, op: 'fail', errorMessage: 'Marked failed by administrator' }, `fail-${j.id}`)}><AlertTriangle className="me-1 h-3 w-3" /> Fail</Button>
                    </>
                  ) : null}
                  {j.status === 'failed' ? <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => void act({ action: 'job-action', id: j.id, op: 'retry' }, `retry-${j.id}`)}><RotateCcw className="me-1 h-3 w-3" /> Retry</Button> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
