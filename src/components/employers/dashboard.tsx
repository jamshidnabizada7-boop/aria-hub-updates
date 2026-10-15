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
import { Building2, Copy, LogOut, Plus, RefreshCw } from 'lucide-react';
import {OrganizationWorkspace,PendingOrganizations} from './organization-workspace';
import {ApplicationInbox,EmployerTeam} from './application-inbox';
import { AF_PROVINCES } from '@/lib/geo/provinces';

const PROVINCE_OPTIONS = AF_PROVINCES as readonly string[];

interface EmployerOrg {
  organizationId: string; organizationName: string; organizationSlug: string;
  organizationVerified: boolean; role: 'owner' | 'recruiter' | 'viewer';
}

interface JobRow {
  id: string; slug: string; title: string; status: string;
  deadline: string | null; createdAt: string; location: string | null;
  salary: string | null; jobType: string | null;description:string;country:string|null;acceptsNativeApplications:boolean;
}

const fmt = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

export function EmployerDashboard({ userName, organizations,initialClaim='',lang='en' }: { userName: string; organizations: EmployerOrg[];initialClaim?:string;lang?:'en'|'fa'|'ps' }) {
  const labels=lang==='fa'?{overview:'نمای کلی',jobs:'وظایف من',applications:'درخواست‌ها',post:'نشر وظیفه',profile:'مشخصات سازمان',team:'تیم و دسترسی',organization:'افزودن سازمان',account:'تنظیمات حساب'}:lang==='ps'?{overview:'لنډیز',jobs:'زما دندې',applications:'غوښتنلیکونه',post:'دنده خپرول',profile:'د ادارې معلومات',team:'ټیم او لاسرسی',organization:'اداره زیاتول',account:'د حساب تنظیمات'}:{overview:'Overview',jobs:'My vacancies',applications:'Application inbox',post:'Post a vacancy',profile:'Organization profile',team:'Team & access',organization:'Add organization',account:'Account settings'};
  const logout=async()=>{try{const r=await fetch('/api/employers/auth/logout',{method:'POST'});if(r.ok)window.location.assign('/'+lang+'/employers/login');else toast.error('Could not sign out.');}catch{toast.error('Could not sign out.');}};
  const [activeOrgId, setActiveOrgId] = useState<string | null>(organizations[0]?.organizationId ?? null);
  const [jobs, setJobs] = useState<{ active: JobRow[]; pending: JobRow[]; closed: JobRow[] } | null>(null);
  const [analytics,setAnalytics]=useState<{total:number;published:number;pending:number;closed:number;expiringSoon:number}|null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'overview' | 'jobs' | 'post' | 'profile' | 'team' | 'account' | 'applications' | 'organization'>(initialClaim?'organization':'overview');
  const [posting, setPosting] = useState(false);
  const [claimSlug, setClaimSlug] = useState(initialClaim);
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
      const metrics=await fetch('/api/employers/jobs/analytics?organizationId='+encodeURIComponent(orgId),{cache:'no-store'});
      if(metrics.ok)setAnalytics(await metrics.json());else setAnalytics(null);
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
      <div id="main-content" role="main" className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
        <PendingOrganizations lang={lang}/>
        <OrganizationWorkspace lang={lang}/>
        <h2 className="mt-8 text-xl font-bold">{lang==='fa'?'سازمان شما قبلاً وجود دارد؟':lang==='ps'?'ستاسې اداره مخکې ثبت شوې؟':'Organization already listed?'}</h2>
        <p className="mt-2 text-sm text-muted-foreground"><a href={'/'+lang+'/organizations'} className="text-primary underline">{lang==='fa'?'یافتن سازمان و درخواست دسترسی':lang==='ps'?'اداره ومومئ او د لاسرسي غوښتنه وکړئ':'Find your organization and request access'}</a></p>
        <div className="mt-4 space-y-2 rounded-lg border bg-card p-4">
          <Input placeholder="Organization slug (e.g. acted)" value={claimSlug} onChange={(e) => setClaimSlug(e.target.value)} />
          <Input placeholder="Your email at the organization (evidence)" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} />
          <Button className="w-full" disabled={!claimSlug || !claimEmail} onClick={() => void claimOrg()}>
            Request ownership
          </Button>
          <p className="text-xs text-muted-foreground">
            Signed in as {userName} · <button className="underline" onClick={()=>void logout()}>Sign out</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="main-content" role="main" className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[220px_1fr]" dir={lang==='en'?'ltr':'rtl'}>
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-[#102c46] p-7 text-white lg:col-span-2">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest text-teal-200"><Building2 className="h-4 w-4"/>ARIA HUB · EMPLOYERS</p><h1 className="text-2xl font-bold">{activeOrg.organizationName}</h1>
          <p className="mt-2 text-sm text-slate-200">
            {lang==='fa'?'بخش کارفرما':lang==='ps'?'د کار ورکوونکي برخه':'Employer workspace'} · {activeOrg.role}
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
          <Button onClick={()=>void logout()} variant="outline" size="sm" className="gap-1 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"><LogOut className="h-3.5 w-3.5" /> Sign out</Button>
        </div>
      </div>

      <nav aria-label="Employer workspace" className="flex h-fit flex-wrap gap-2 rounded-2xl border bg-card p-3 lg:sticky lg:top-6 lg:flex-col">
        {(['overview', 'jobs', 'applications', 'post', 'profile', 'team', 'organization', 'account'] as const).filter(t=>t==='team'?activeOrg.role==='owner':['post','applications'].includes(t)?canManage:true).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm"
            className="min-h-11 justify-start rounded-xl"
            onClick={() => setTab(t)}>
            {labels[t]}
          </Button>
        ))}
      <a href={'/'+lang+'/organizations/'+activeOrg.organizationSlug} className="mt-4 border-t px-3 py-4 text-xs font-semibold text-primary">{lang==='fa'?'دیدن صفحۀ عمومی':lang==='ps'?'عامه پاڼه وګورئ':'View public organization'} ↗</a><a href={'/'+lang+'/portal'} className="px-3 py-2 text-xs text-muted-foreground">{lang==='fa'?'رفتن به بخش جوینده':lang==='ps'?'د فرصت لټوونکي برخې ته':'Switch to jobseeker'}</a></nav>
      <div className="min-w-0 space-y-6">

      {tab === 'overview' && jobs && (
        <section aria-label="Employer vacancy analytics" className="space-y-5"><div className="rounded-3xl border bg-card p-6"><h2 className="text-xl font-bold">{lang==='fa'?'استخدام بعدی خود را آغاز کنید':lang==='ps'?'خپل راتلونکی استخدام پیل کړئ':'Your next hire starts here'}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{lang==='fa'?'مشخصات سازمان را تکمیل کنید، وظیفه نشر کنید و درخواست‌ها را با تیم خود بررسی کنید.':lang==='ps'?'د ادارې معلومات بشپړ کړئ، دنده خپره کړئ او له خپل ټیم سره غوښتنلیکونه وڅېړئ.':'Complete your organization profile, publish a vacancy and review applications with your team.'}</p><div className="mt-5 flex flex-wrap gap-2">{canManage&&<Button className="min-h-11 rounded-xl" onClick={()=>setTab('post')}>{labels.post}</Button>}<Button variant="outline" className="min-h-11 rounded-xl" onClick={()=>setTab('profile')}>{labels.profile}</Button></div><p className="mt-5 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Organization slug: <strong className="text-foreground">{activeOrg.organizationSlug}</strong> · Share this with colleagues when they request access.</p></div>
         <p className="text-xs text-muted-foreground">Organization-only vacancy counts. These are not applicant views or confirmed applications.</p>
         <div className="grid gap-3 md:grid-cols-4">
          {([['Active jobs',analytics?.published??jobs.active.length],['Pending moderation',analytics?.pending??jobs.pending.length],
             ['Closed jobs',analytics?.closed??jobs.closed.length],['Expiring within 7 days',analytics?.expiringSoon??0]] as const)
           .map(([label,value])=><div className="rounded-lg border bg-card p-4" key={label}><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
         </div>
        </section>
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
                      <a href={`/${lang}/opportunities/${job.slug}`} hidden={bucket!=='active'} target="_blank" rel="noreferrer noopener">
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
                    {canManage&&<JobEditForm job={job} busy={busy} onSave={patch=>void act(job.id,{action:'edit',...patch},'Changes submitted for review')}/>}
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

      {tab === 'post' && canManage && (
        <PostJobForm busy={posting} onSubmit={(form) => void postJob(form)} />
      )}

      {tab === 'profile' && activeOrg && <OrganizationWorkspace key={activeOrgId} lang={lang} id={activeOrg.organizationId} readOnly={activeOrg.role!=='owner'}/>}
      {tab === 'team' && activeOrg && <EmployerTeam key={activeOrgId} organizationId={activeOrg.organizationId}/>}
      {tab === 'applications' && activeOrg && <ApplicationInbox key={activeOrgId} organizationId={activeOrg.organizationId} lang={lang}/>}
      {tab === 'organization' && <><PendingOrganizations lang={lang}/><OrganizationWorkspace lang={lang}/><div className="space-y-3 rounded-2xl border bg-card p-6"><h2 className="font-bold">Request access to an existing organization</h2><Input aria-label="Organization slug" placeholder="Organization slug" value={claimSlug} onChange={e=>setClaimSlug(e.target.value)}/><Input aria-label="Work email evidence" placeholder="Your work email (evidence)" type="email" value={claimEmail} onChange={e=>setClaimEmail(e.target.value)}/><Button disabled={!claimSlug||!claimEmail} onClick={()=>void claimOrg()}>Request access</Button></div></>}

      {tab === 'account' && (
        <AccountPanel />
      )}
      </div>
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
    deadline: '', applyUrl: '', applyEmail: '', applyPhone: '',applyMethod:'ariahub',
    vacancyNumber: '', numberOfVacancies: '', province: '', city: '', district: '',
    contractType: '', contractDuration: '', genderRequirement: '', nationalityRequirement: '',
    salaryGrade: '', education: '', experience: '', responsibilities: '', requirements: '',
    guidelines: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const valid = form.title.length >= 5 && form.description.length >= 80 && (
    form.applyMethod==='ariahub'?true:form.applyMethod==='website'?Boolean(form.applyUrl):
    form.applyMethod==='email'?Boolean(form.applyEmail):
    form.applyMethod==='phone'||form.applyMethod==='whatsapp'?Boolean(form.applyPhone):
    form.guidelines.trim().length>=12
  );

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
        <label className="text-sm">How candidates apply
          <select className="mt-1 w-full rounded-md border bg-background p-2" value={form.applyMethod} onChange={set('applyMethod')}>
            <option value="ariahub">Receive applications on ARIA HUB (private employer inbox)</option>
            <option value="website">Official HTTPS application page</option>
            <option value="email">Application email</option>
            <option value="phone">Call by telephone</option>
            <option value="whatsapp">Contact employer by WhatsApp</option>
            <option value="in_person">Apply in person (address in guidelines)</option>
          </select>
        </label>
        {form.applyMethod==='website'&&<Input placeholder="Application URL (https://…)" value={form.applyUrl} onChange={set('applyUrl')} />}
        {form.applyMethod==='email'&&<Input type="email" placeholder="Application email" value={form.applyEmail} onChange={set('applyEmail')} />}
        {(form.applyMethod==='phone'||form.applyMethod==='whatsapp')&&<Input type="tel" dir="ltr" placeholder="+93700123456" value={form.applyPhone} onChange={set('applyPhone')} />}
        <p className="text-xs text-muted-foreground md:col-span-2">Application contact details and in-person instructions become public if the job is approved. WhatsApp here means applicant-to-employer contact, not automatic ARIA HUB messaging.</p>
      </div>

      <details className="rounded-md border bg-background/50 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
          Additional professional details (recommended)
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input placeholder="Vacancy / reference number" value={form.vacancyNumber} onChange={set('vacancyNumber')} />
          <Input type="number" min={1} max={999} placeholder="Number of vacancies" value={form.numberOfVacancies} onChange={set('numberOfVacancies')} />
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={form.province} onChange={set('province')}>
            <option value="">Province (optional)</option>
            {PROVINCE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <Input placeholder="City" value={form.city} onChange={set('city')} />
          <Input placeholder="District" value={form.district} onChange={set('district')} />
          <Input placeholder="Contract type" value={form.contractType} onChange={set('contractType')} />
          <Input placeholder="Contract duration" value={form.contractDuration} onChange={set('contractDuration')} />
          <Input placeholder="Gender requirement (if stated)" value={form.genderRequirement} onChange={set('genderRequirement')} />
          <Input placeholder="Nationality requirement (if stated)" value={form.nationalityRequirement} onChange={set('nationalityRequirement')} />
          <Input placeholder="Salary grade" value={form.salaryGrade} onChange={set('salaryGrade')} />
          <Input placeholder="Education" value={form.education} onChange={set('education')} />
          <Input placeholder="Experience" value={form.experience} onChange={set('experience')} />
        </div>
        <textarea className="mt-3 min-h-24 w-full rounded-md border bg-background p-3 text-sm" placeholder="Responsibilities" value={form.responsibilities} onChange={set('responsibilities')} />
        <textarea className="mt-2 min-h-24 w-full rounded-md border bg-background p-3 text-sm" placeholder="Requirements / required documents" value={form.requirements} onChange={set('requirements')} />
        <textarea className="mt-2 min-h-20 w-full rounded-md border bg-background p-3 text-sm" placeholder="Submission guideline" value={form.guidelines} onChange={set('guidelines')} />
      </details>

      <Button className="gap-1" disabled={busy || !valid}
        onClick={() => onSubmit(form)}>
        <Plus className="h-4 w-4" /> Submit for review
      </Button>
      <p className="text-xs text-muted-foreground">
        Submissions are created as drafts — the ARIA HUB team reviews and publishes them
        within our stated review window (timing may vary). Persian and Pashto
        translations are added manually by the team.
      </p>
    </div>
  );
}


/** AUDIT §22 — account settings: session-authenticated password change. */
function AccountPanel() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/employers/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Password updated.');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        toast.error(data.error || 'Password change failed.');
      }
    } catch {
      toast.error('Network error — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md rounded-lg border bg-card p-4">
      <h3 className="mb-1 text-sm font-semibold">Change password</h3>
      <p className="mb-4 text-xs text-muted-foreground">Requires your current password. Other sessions stay signed in until they expire.</p>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-xs font-medium">
          Current password
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" className="h-9" />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          New password (min 8 characters)
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="h-9" />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Confirm new password
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="h-9" />
        </label>
        <Button type="submit" size="sm" disabled={busy || !currentPassword || !newPassword}>
          {busy ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}

function JobEditForm({job,busy,onSave}:{job:JobRow;busy:boolean;onSave:(patch:Record<string,unknown>)=>void}){
 return <details className="w-full border-t pt-2"><summary className="cursor-pointer text-xs font-semibold text-primary">Edit / preview job details</summary><form className="my-4 space-y-3" onSubmit={e=>{e.preventDefault();onSave(Object.fromEntries(new FormData(e.currentTarget)));}}><p className="text-xs text-muted-foreground">Edits return the job to moderation and translation review. Existing applications remain available.</p><label className="block text-sm">Title<input name="title" required minLength={5} maxLength={200} defaultValue={job.title} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3"/></label><label className="block text-sm">Description<textarea name="description" required minLength={80} maxLength={40000} defaultValue={job.description} className="mt-1 min-h-48 w-full rounded-lg border bg-background p-3"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Location<input name="location" defaultValue={job.country||''} maxLength={200} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3"/></label><label className="text-sm">Salary<input name="salary" defaultValue={job.salary||''} maxLength={200} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3"/></label><label className="text-sm">Deadline<input name="deadline" type="date" defaultValue={job.deadline?.slice(0,10)||''} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3"/></label></div><button disabled={busy} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Save & submit for review</button></form></details>;
}
