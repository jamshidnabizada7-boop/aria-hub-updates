'use client';

/**
 * Organizations Panel (Phase 11) — manage organization records and their
 * official sources without touching the database. Two tabs:
 *   Organizations — list with verified badge, active jobs, sources + health;
 *                   edit / verify / unverify / merge / add source / pause /
 *                   resume / run source / view active jobs
 *   Sources       — flat view of every official source with its owner org
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  BadgeCheck, Building2, ExternalLink, GitMerge, PauseCircle, Play,
  PlusCircle, RefreshCw, ShieldOff,
} from 'lucide-react';

interface OrgSource {
  id: string; name: string; scraperKey: string; enabled: boolean;
  healthStatus: string; lastRunAt: string | null; lastRunStatus: string | null; lastSuccessAt: string | null;
}

interface OrgRow {
  id: string; name: string; slug: string; organizationType: string | null;
  website: string | null; careersUrl: string | null; officialDomains: unknown;
  verified: boolean; verificationMethod: string | null; verifiedAt: string | null;
  active: boolean; activeJobs: number; sourceCount: number; sources: OrgSource[];
}

const fmt = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') : '—');

export function OrganizationsPanel({ onNavigate }: { onNavigate?: (key: string) => void }) {
  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'orgs' | 'sources'>('orgs');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<string | null>(null); // target org id
  const [addSourceFor, setAddSourceFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/organizations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setOrgs(json.organizations);
    } catch (e) {
      toast.error(`Failed to load organizations: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (body: Record<string, unknown>, successMsg: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/organizations', {
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
      setBusy(false);
      setMergeMode(null);
      setAddSourceFor(null);
      setEditFor(null);
    }
  };

  const runSource = async (sourceId: string, name: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/import/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Import started for ${name}`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const allSources = (orgs ?? []).flatMap((o) => o.sources.map((s) => ({ ...s, org: o })));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Organizations</h2>
          <p className="text-sm text-muted-foreground">Canonical organization records and their official sources.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={tab === 'orgs' ? 'default' : 'outline'} size="sm" onClick={() => setTab('orgs')}>
            <Building2 className="mr-1 h-3.5 w-3.5" /> Organizations
          </Button>
          <Button variant={tab === 'sources' ? 'default' : 'outline'} size="sm" onClick={() => setTab('sources')}>
            Official sources
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}

      {tab === 'orgs' && !loading && (
        <div className="space-y-2">
          {(orgs ?? []).map((org) => (
            <div key={org.id} className="rounded-lg border bg-card">
              <button
                className="flex w-full flex-wrap items-center gap-2 p-3 text-left"
                onClick={() => setExpanded(expanded === org.id ? null : org.id)}
              >
                <span className="font-semibold">{org.name}</span>
                {org.verified && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" title={org.verificationMethod ?? ''}>
                    <BadgeCheck className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                )}
                <Badge variant="outline">{org.organizationType ?? 'unknown type'}</Badge>
                <Badge variant="secondary">{org.activeJobs} active jobs</Badge>
                <Badge variant="secondary">{org.sourceCount} sources</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{org.slug}</span>
              </button>

              {expanded === org.id && (
                <div className="border-t p-3">
                  <div className="mb-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    <p>Website: {org.website ? <a className="underline" href={org.website} target="_blank" rel="noreferrer noopener">{org.website}</a> : '—'}</p>
                    <p>Careers: {org.careersUrl ? <a className="underline" href={org.careersUrl} target="_blank" rel="noreferrer noopener">{org.careersUrl}</a> : '—'}</p>
                    <p>Official domains: {Array.isArray(org.officialDomains) && org.officialDomains.length ? (org.officialDomains as string[]).join(', ') : '—'}</p>
                    <p>Verified: {org.verified ? `yes (${org.verificationMethod}, ${fmt(org.verifiedAt)})` : 'no'}</p>
                  </div>

                  <div className="mb-3 space-y-1.5">
                    {org.sources.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                        <span className="font-medium">{s.name}</span>
                        <Badge variant="outline" className="h-5">{s.scraperKey}</Badge>
                        <Badge
                          variant="outline"
                          className={
                            s.healthStatus === 'healthy'
                              ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                              : s.healthStatus === 'paused'
                                ? 'border-amber-500/40 text-amber-700 dark:text-amber-400'
                                : 'border-red-500/40 text-red-600'
                          }
                        >
                          {s.healthStatus}
                        </Badge>
                        <span className="text-muted-foreground">
                          last run {fmt(s.lastRunAt)} ({s.lastRunStatus ?? '—'}), last success {fmt(s.lastSuccessAt)}
                        </span>
                        <div className="ml-auto flex gap-1.5">
                          <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs" disabled={busy}
                            onClick={() => void runSource(s.id, s.name)}>
                            <Play className="h-3 w-3" /> Run
                          </Button>
                          {s.healthStatus === 'paused' ? (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" disabled={busy}
                              onClick={() => void act({ action: 'resume-source', importSourceId: s.id }, `${s.name} resumed`)}>
                              Resume
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" disabled={busy}
                              onClick={() => void act({ action: 'pause-source', importSourceId: s.id }, `${s.name} paused`)}>
                              <PauseCircle className="h-3 w-3" /> Pause
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {org.sources.length === 0 && <p className="text-xs text-muted-foreground">No sources yet.</p>}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {editFor === org.id ? (
                      <InlineEdit org={org} busy={busy} onSave={(patch) => void act({ action: 'edit', id: org.id, patch }, `${org.name} updated`)}
                        onCancel={() => setEditFor(null)} />
                    ) : (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setEditFor(org.id)}>Edit</Button>
                    )}
                    {org.verified ? (
                      <Button variant="outline" size="sm" className="h-8 gap-1" disabled={busy}
                        onClick={() => void act({ action: 'unverify', id: org.id }, `${org.name} unverified`)}>
                        <ShieldOff className="h-3.5 w-3.5" /> Unverify
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 gap-1" disabled={busy}
                        onClick={() => void act({ action: 'verify', id: org.id }, `${org.name} verified`)}>
                        <BadgeCheck className="h-3.5 w-3.5" /> Verify
                      </Button>
                    )}
                    {mergeMode === org.id ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <select
                          className="h-8 rounded-md border bg-background px-2 text-xs"
                          defaultValue=""
                          onChange={(e) => { const src = e.target.value; if (src) void act({ action: 'merge', targetId: org.id, sourceId: src }, 'Organizations merged'); }}
                        >
                          <option value="" disabled>Merge another org into this one…</option>
                          {(orgs ?? []).filter((o) => o.id !== org.id).map((o) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => setMergeMode(null)}>Cancel</Button>
                      </span>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 gap-1" disabled={busy || (orgs ?? []).length < 2}
                        onClick={() => setMergeMode(org.id)}>
                        <GitMerge className="h-3.5 w-3.5" /> Merge
                      </Button>
                    )}
                    {addSourceFor === org.id ? (
                      <AddSourceForm busy={busy} onSave={(payload) => void act({ action: 'add-source', organizationId: org.id, ...payload }, 'Source added (autoPublish stays off)')}
                        onCancel={() => setAddSourceFor(null)} />
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setAddSourceFor(org.id)}>
                        <PlusCircle className="h-3.5 w-3.5" /> Add source
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 gap-1"
                      onClick={() => onNavigate?.('opportunity')}>
                      <ExternalLink className="h-3.5 w-3.5" /> View jobs
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!loading && (orgs ?? []).length === 0 && (
            <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No organizations yet — create them via the Phase 2 backfill or the seed script.
            </p>
          )}
        </div>
      )}

      {tab === 'sources' && !loading && (
        <div className="space-y-1.5">
          {allSources.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs">
              <span className="font-medium">{s.name}</span>
              <Badge variant="outline" className="h-5">{s.scraperKey}</Badge>
              <Badge variant="secondary" className="h-5">{s.org.name}</Badge>
              <Badge variant="outline" className={
                s.healthStatus === 'healthy' ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                  : s.healthStatus === 'paused' ? 'border-amber-500/40 text-amber-700 dark:text-amber-400'
                    : 'border-red-500/40 text-red-600'
              }>{s.healthStatus}</Badge>
              <span className="text-muted-foreground">last run {fmt(s.lastRunAt)} ({s.lastRunStatus ?? '—'})</span>
              <div className="ml-auto flex gap-1.5">
                <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs" disabled={busy}
                  onClick={() => void runSource(s.id, s.name)}>
                  <Play className="h-3 w-3" /> Run
                </Button>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" disabled={busy}
                  onClick={() => void act({ action: s.healthStatus === 'paused' ? 'resume-source' : 'pause-source', importSourceId: s.id },
                    s.healthStatus === 'paused' ? `${s.name} resumed` : `${s.name} paused`)}>
                  {s.healthStatus === 'paused' ? 'Resume' : 'Pause'}
                </Button>
              </div>
            </div>
          ))}
          {allSources.length === 0 && (
            <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No official sources yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function InlineEdit({ org, busy, onSave, onCancel }: {
  org: OrgRow; busy: boolean;
  onSave: (patch: Record<string, unknown>) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(org.name);
  const [website, setWebsite] = useState(org.website ?? '');
  const [careersUrl, setCareersUrl] = useState(org.careersUrl ?? '');
  const [type, setType] = useState(org.organizationType ?? '');
  const [domains, setDomains] = useState(Array.isArray(org.officialDomains) ? (org.officialDomains as string[]).join(', ') : '');
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Input className="h-8 w-40 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <Input className="h-8 w-44 text-xs" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" />
      <Input className="h-8 w-52 text-xs" value={careersUrl} onChange={(e) => setCareersUrl(e.target.value)} placeholder="Careers URL" />
      <Input className="h-8 w-32 text-xs" value={type} onChange={(e) => setType(e.target.value)} placeholder="Type (ngo…)" />
      <Input className="h-8 w-52 text-xs" value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="Domains, comma separated" />
      <Button size="sm" className="h-8" disabled={busy}
        onClick={() => onSave({ name, website: website || null, careersUrl: careersUrl || null, organizationType: type || null, officialDomains: domains })}>
        Save
      </Button>
      <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>Cancel</Button>
    </span>
  );
}

function AddSourceForm({ busy, onSave, onCancel }: {
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => void; onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [scraperKey, setScraperKey] = useState('officialHtml');
  const [baseUrl, setBaseUrl] = useState('');
  const [schedule, setSchedule] = useState('30');
  const [config, setConfig] = useState('');
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Input className="h-8 w-40 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="Source name" />
      <select className="h-8 rounded-md border bg-background px-2 text-xs" value={scraperKey} onChange={(e) => setScraperKey(e.target.value)}>
        {['officialHtml', 'rssOpportunity', 'jsonApi', 'greenhouse', 'lever', 'wpApi', 'reliefweb'].map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <Input className="h-8 w-56 text-xs" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="List/feed URL (https://…)" />
      <Input className="h-8 w-16 text-xs" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="min" />
      <Input className="h-8 w-64 text-xs" value={config} onChange={(e) => setConfig(e.target.value)} placeholder='config JSON (selectors, boardToken…)' />
      <Button size="sm" className="h-8" disabled={busy || !name || !baseUrl}
        onClick={() => {
          let parsed: Record<string, unknown> | undefined;
          if (config.trim()) {
            try { parsed = JSON.parse(config); } catch { toast.error('Config is not valid JSON'); return; }
          }
          onSave({ name, scraperKey, baseUrl, scheduleMinutes: Number(schedule) || 30, config: parsed });
        }}>
        Add
      </Button>
      <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>Cancel</Button>
    </span>
  );
}
