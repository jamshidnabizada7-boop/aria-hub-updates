'use client';

/**
 * Employer dashboard UI (Phase 13). Sections: Overview, Jobs (Active /
 * Pending review / Expired & Closed), Post Job, Organization profile,
 * Team & claims. Every mutation goes through the ownership-enforced
 * employer APIs — the UI cannot act on another organization's jobs.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, LogOut, Plus, RefreshCw } from 'lucide-react';

interface EmployerOrg {
  organizationId: string; organizationName: string; organizationSlug: string;
  organizationVerified: boolean; role: 'owner' | 'recruiter' | 'viewer';
}

interface JobRow {
  id: string; slug: string; title: string; status: string;
  deadline: string | null; createdAt: string; location: string | null;
  salary: string | null; jobType: string | null;
}

const fmt = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

export function EmployerDashboard({ userName, organizations }: { userName: string; organizations: EmployerOrg[] }) {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(organizations[0]?.organizationId ?? null);
  const [jobs, setJobs] = useState<{ active: JobRow[]; pending: JobRow[]; closed: JobRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'overview' | 'jobs' | 'post' | 'profile' | 'team'>('overview');
  const [posting, setPosting] = useState(false);
  const [claimSlug, setClaimSlug] = useState('');
  const [claimEmail, setClaimEmail] = useState('');

  const activeOrg = organizations.find((o) => o.organizationId === activeOrgId) ?? null;
  const canManage = activeOrg?.role === 'owner' || activeOrg?.role === 'recruiter';

  const loadJobs = useCallback(async (orgId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employers/jobs?organizationId=${encodeURIComponent(orgId)}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setJobs({ active: json.active ?? [], pending: json.pending ?? [], closed: json.closed ?? [] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (activeOrgId) void loadJobs(activeOrgId); }, [activeOrgId, loadJobs]);

  const act = async (jobId: string, body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/employers/jobs/${jobId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success(msg);
      if (activeOrgId) await loadJobs(activeOrgId);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const postJob = async (form: Record<string, string>) => {
    if (!activeOrgId) return;
    setPosting(true);
    try {
      const res = await fetch('/api/employers/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: activeOrgId, ...form }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success('Job submitted — it goes live after moderation.');
      setTab('jobs');
      await loadJobs(activeOrgId);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const claimOrg = async () => {
    try {
      const res = await fetch('/api/employers/claims', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationSlug: claimSlug.trim(), claimEmail: claimEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success('Claim submitted — an ARIA HUB admin will review it.');
      setClaimSlug('');
      setClaimEmail('');
      routerRefresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const routerRefresh = () => { window.location.reload(); };

  // ─── No organization yet: claim flow ────────────────────────────────────────
  if (!activeOrg) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You have no organization yet. Claim yours by its ARIA HUB slug — an admin verifies
          every claim manually (we compare your evidence email against the organization&apos;s
          official domains; nothing is auto-approved).
        </p>
        <div className="mt-4 space-y-2 rounded-lg border bg-card p-4">
          <Input placeholder="Organization slug (e.g. acted)" value={claimSlug} onChange={(e) => setClaimSlug(e.target.value)} />
          <Input placeholder="Your email at the organization (evidence)" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} />
          <Button className="w-full" disabled={!claimSlug || !claimEmail} onClick={() => void claimOrg()}>
            Request ownership
          </Button>
          <p className="text-xs text-muted-foreground">
            Signed in as {userName} · <a className="underline" href="/api/employers/auth/logout">sign out</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{activeOrg.organizationName}</h1>
          <p className="text-sm text-muted-foreground">
            Employer dashboard · {activeOrg.role}
            {activeOrg.organizationVerified ? ' · verified organization' : ' · unverified organization'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {organizations.length > 1 && (
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={activeOrgId ?? ''}
              onChange={(e) => setActiveOrgId(e.target.value)}>
              {organizations.map((o) => <option key={o.organizationId} value={o.organizationId}>{o.organizationName}</option>)}
            </select>
          )}
          <a href="/api/employers/auth/logout"><Button variant="outline" size="sm" className="gap-1"><LogOut className="h-3.5 w-3.5" /> Sign out</Button></a>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(['overview', 'jobs', 'post', 'profile', 'team'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm"
            className="capitalize"
            onClick={() => setTab(t)}>
            {t === 'post' ? 'Post job' : t}
          </Button>
        ))}
      </div>

      {tab === 'overview' && jobs && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4"><p className="text-2xl font-bold">{jobs.active.length}</p><p className="text-xs text-muted-foreground">Active jobs</p></div>
          <div className="rounded-lg border bg-card p-4"><p className="text-2xl font-bold">{jobs.pending.length}</p><p className="text-xs text-muted-foreground">Pending review</p></div>
          <div className="rounded-lg border bg-card p-4"><p className="text-2xl font-bold">{jobs.closed.length}</p><p className="text-xs text-muted-foreground">Expired / closed</p></div>
        </div>
      )}

      {tab === 'jobs' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => activeOrgId && void loadJobs(activeOrgId)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {(['active', 'pending', 'closed'] as const).map((bucket) => (
            <div key={bucket}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {bucket === 'active' ? 'Active' : bucket === 'pending' ? 'Pending review' : 'Expired & closed'}
                <span className="ml-2 font-normal">({jobs?.[bucket].length ?? 0})</span>
              </h2>
              <div className="space-y-2">
                {(jobs?.[bucket] ?? []).map((job) => (
                  <div key={job.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
                    <span className="font-medium">{job.title}</span>
                    <Badge variant="outline">{job.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {job.location ?? '—'} · deadline {fmt(job.deadline)} · posted {fmt(job.createdAt)}
                    </span>
                    <div className="ml-auto flex flex-wrap gap-1.5">
                      <a href={`/en/opportunities/${job.slug}`} target="_blank" rel="noreferrer noopener">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">View public</Button>
                      </a>
                      {canManage && bucket !== 'closed' && (
                        <>
                          <ExtendButton busy={busy} onExtend={(date) => void act(job.id, { action: 'extend', deadline: date }, 'Deadline extended')} />
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy}
                            onClick={() => void act(job.id, { action: 'close' }, 'Job closed')}>
                            Close
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={busy}
                            onClick={() => void act(job.id, { action: 'duplicate' }, 'Duplicated as draft')}>
                            <Copy className="h-3 w-3" /> Duplicate
                          </Button>
                        </>
                      )}
                      {canManage && bucket === 'closed' && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy}
                          onClick={() => void act(job.id, { action: 'reopen' }, 'Reopened for review')}>
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {(jobs?.[bucket].length ?? 0) === 0 && (
                  <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">Nothing here.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'post' && (
        <PostJobForm busy={posting} onSubmit={(form) => void postJob(form)} />
      )}

      {tab === 'profile' && activeOrg && (
        <div className="space-y-2 rounded-lg border bg-card p-4 text-sm">
          <p><span className="font-semibold">Organization:</span> {activeOrg.organizationName}</p>
          <p><span className="font-semibold">Slug:</span> {activeOrg.organizationSlug}</p>
          <p><span className="font-semibold">Verified:</span> {activeOrg.organizationVerified ? 'Yes — the verified badge is shown on your jobs' : 'Not yet — an ARIA HUB admin verifies organizations manually'}</p>
          <p><span className="font-semibold">Your role:</span> {activeOrg.role}</p>
          <p className="text-xs text-muted-foreground">Profile edits (logo, description, careers page) go through ARIA HUB admins for now — contact us after claiming.</p>
        </div>
      )}

      {tab === 'team' && (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Team management: colleagues create their own accounts, then request ownership/recruiter
          access for the same organization slug. Every request is reviewed manually by ARIA HUB
          admins before any job access is granted.
        </div>
      )}
    </div>
  );
}

function ExtendButton({ busy, onExtend }: { busy: boolean; onExtend: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => setOpen(true)}>
        Extend deadline
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Input type="date" className="h-7 w-36 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
      <Button size="sm" className="h-7 px-2 text-xs" disabled={busy || !date}
        onClick={() => { onExtend(date); setOpen(false); }}>
        Save
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(false)}>×</Button>
    </span>
  );
}

function PostJobForm({ busy, onSubmit }: { busy: boolean; onSubmit: (form: Record<string, string>) => void }) {
  const [form, setForm] = useState({
    title: '', description: '', location: '', salary: '', jobType: 'full-time',
    deadline: '', applyUrl: '', applyEmail: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const valid = form.title.length >= 5 && form.description.length >= 80 && (form.applyUrl || form.applyEmail);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <Input placeholder="Job title" value={form.title} onChange={set('title')} />
      <textarea
        className="min-h-40 w-full rounded-md border bg-background p-3 text-sm"
        placeholder="Job description (min 80 characters) — responsibilities, requirements, how to apply"
        value={form.description} onChange={set('description')}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Location" value={form.location} onChange={set('location')} />
        <Input placeholder="Salary (optional)" value={form.salary} onChange={set('salary')} />
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={form.jobType} onChange={set('jobType')}>
          {['full-time', 'part-time', 'contract', 'internship', 'remote'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Input type="date" value={form.deadline} onChange={set('deadline')} />
        <Input placeholder="Application URL (https://…)" value={form.applyUrl} onChange={set('applyUrl')} />
        <Input placeholder="…or application email" value={form.applyEmail} onChange={set('applyEmail')} />
      </div>
      <Button className="gap-1" disabled={busy || !valid}
        onClick={() => onSubmit(form)}>
        <Plus className="h-4 w-4" /> Submit for review
      </Button>
      <p className="text-xs text-muted-foreground">
        Submissions are created as drafts — the ARIA HUB team reviews and publishes them
        (usually within a day). Persian and Pashto translations follow automatically.
      </p>
    </div>
  );
}
