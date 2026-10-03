'use client';

/**
 * Discovery Inbox (Phase 10) — the admin's control surface over uncertain
 * imports. Lists every opportunity whose source observation carries a
 * review-band cross-source match (confidence 70-89, recorded by the
 * canonical resolver) and lets the admin act WITHOUT touching the database:
 *
 *   Merge / Keep Separate / Publish / Reject / Edit / Trust Source /
 *   Pause Source / Open Source / Open Application URL
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ExternalLink, GitMerge, Globe, Mail, PauseCircle, ShieldCheck,
  ThumbsDown, ThumbsUp, Trash2, UserCheck,
} from 'lucide-react';

interface DiscoveryItem {
  observationId: string;
  match: { candidateId: string; confidence: number; reasons: string[] };
  opportunity: {
    id: string; title: string; organization: string | null; status: string;
    deadline: string | null; applyUrl: string | null; applyUrlType: string | null;
    applyConfidence: number | null; sourceName: string | null; sourceUrl: string | null;
    importSourceId: string | null; locations: string[];
  };
  candidate: {
    id: string; title: string; organization: string | null; status: string;
    deadline: string | null; sourceName: string | null;
  } | null;
}

interface InboxData {
  items: DiscoveryItem[];
  counts: { total: number; highConfidence: number };
  pendingBySource: Record<string, number>;
}

const fmtDate = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

export function DiscoveryInboxPanel({ onEditOpportunity }: { onEditOpportunity?: (id: string) => void }) {
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmMerge, setConfirmMerge] = useState<string | null>(null); // opportunityId armed for merge

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/discovery');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      toast.error(`Failed to load discovery inbox: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (body: Record<string, unknown>, itemId: string, successMsg: string) => {
    setBusyId(itemId);
    try {
      const res = await fetch('/api/admin/discovery', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success(successMsg);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
      setConfirmMerge(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Discovery Inbox</h2>
          <p className="text-sm text-muted-foreground">
            Uncertain cross-source matches (confidence 70–89%) recorded by the canonical resolver.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <Badge variant="outline">{data.counts.total} pending</Badge>
              {data.counts.highConfidence > 0 && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  {data.counts.highConfidence} ≥ 80%
                </Badge>
              )}
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>Refresh</Button>
        </div>
      </div>

      {data && Object.keys(data.pendingBySource).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.pendingBySource).map(([source, n]) => (
            <Badge key={source} variant="secondary" className="text-xs">{source}: {n}</Badge>
          ))}
        </div>
      )}

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}

      {!loading && data?.items.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nothing awaiting review. Uncertain matches will appear here automatically.
        </div>
      )}

      <div className="space-y-3">
        {data?.items.map((item) => {
          const opp = item.opportunity;
          const cand = item.candidate;
          const busy = busyId === item.observationId;
          const armed = confirmMerge === opp.id;
          return (
            <div key={item.observationId} className="rounded-lg border bg-card p-4">
              {/* confidence header */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    item.match.confidence >= 85
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {item.match.confidence}% match confidence
                </Badge>
                <Badge variant="outline">{opp.status}</Badge>
                {opp.sourceName && <Badge variant="secondary">{opp.sourceName}</Badge>}
                <span className="text-xs text-muted-foreground">
                  {item.match.reasons.map((r) => `✓ ${r}`).join('  ·  ')}
                </span>
              </div>

              {/* incoming vs candidate */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border bg-background/50 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Incoming</p>
                  <p className="font-semibold leading-snug">{opp.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {opp.organization ?? '—'} · {opp.locations[0] || '—'} · deadline {fmtDate(opp.deadline)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Apply: {opp.applyUrl
                      ? `${opp.applyUrlType ?? 'link'}${opp.applyConfidence != null ? ` (${opp.applyConfidence}%)` : ''}`
                      : 'none'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {opp.sourceUrl && (
                      <a href={opp.sourceUrl} target="_blank" rel="noreferrer noopener">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><Globe className="h-3 w-3" /> Source</Button>
                      </a>
                    )}
                    {opp.applyUrl && (
                      <a href={opp.applyUrl} target="_blank" rel="noreferrer noopener">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><Mail className="h-3 w-3" /> Apply URL</Button>
                      </a>
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-dashed bg-background/50 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Possible existing</p>
                  {cand ? (
                    <>
                      <p className="font-semibold leading-snug">{cand.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cand.organization ?? '—'} · {cand.sourceName ?? '—'} · {cand.status} · deadline {fmtDate(cand.deadline)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-600">Candidate no longer exists (may have been merged already).</p>
                  )}
                </div>
              </div>

              {/* actions */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {armed ? (
                  <>
                    <Button
                      size="sm" className="h-8 gap-1 bg-red-600 hover:bg-red-700" disabled={busy || !cand}
                      onClick={() => void act(
                        { action: 'merge', opportunityId: opp.id, candidateId: item.match.candidateId },
                        item.observationId,
                        `Merged into ${cand?.title ?? 'candidate'} — observations preserved`,
                      )}
                    >
                      <GitMerge className="h-3.5 w-3.5" /> Confirm merge
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setConfirmMerge(null)} disabled={busy}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default" size="sm" className="h-8 gap-1" disabled={busy || !cand}
                    onClick={() => setConfirmMerge(opp.id)}
                  >
                    <GitMerge className="h-3.5 w-3.5" /> Merge
                  </Button>
                )}
                <Button
                  variant="outline" size="sm" className="h-8 gap-1" disabled={busy}
                  onClick={() => void act({ action: 'keep-separate', observationId: item.observationId }, item.observationId, 'Kept separate — removed from inbox')}
                >
                  <UserCheck className="h-3.5 w-3.5" /> Keep separate
                </Button>
                <Button
                  variant="outline" size="sm" className="h-8 gap-1" disabled={busy}
                  onClick={() => void act({ action: 'publish', opportunityId: opp.id }, item.observationId, 'Published')}
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> Publish
                </Button>
                <Button
                  variant="outline" size="sm" className="h-8 gap-1 text-red-600 hover:text-red-700" disabled={busy}
                  onClick={() => void act({ action: 'reject', opportunityId: opp.id }, item.observationId, 'Rejected (archived)')}
                >
                  <ThumbsDown className="h-3.5 w-3.5" /> Reject
                </Button>
                {onEditOpportunity && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => onEditOpportunity(opp.id)}>
                    <ExternalLink className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                {opp.importSourceId && (
                  <>
                    <Button
                      variant="ghost" size="sm" className="h-8 gap-1" disabled={busy}
                      onClick={() => void act({ action: 'trust-source', importSourceId: opp.importSourceId }, item.observationId, 'Source trusted (+10 trust score)')}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Trust source
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="h-8 gap-1" disabled={busy}
                      onClick={() => void act({ action: 'pause-source', importSourceId: opp.importSourceId }, item.observationId, 'Source paused')}
                    >
                      <PauseCircle className="h-3.5 w-3.5" /> Pause source
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost" size="sm" className="h-8 gap-1 text-red-600 hover:text-red-700" disabled={busy}
                  onClick={() => void act({ action: 'reject', opportunityId: opp.id }, item.observationId, 'Archived')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
