'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, Clock3, Copy, FilePlus2, Inbox, LayoutDashboard, LogOut, MapPin, Plus, RefreshCw, Search, Settings2, UsersRound } from 'lucide-react';
import { OrganizationWorkspace, PendingOrganizations } from './organization-workspace';
import { ApplicationInbox, EmployerTeam } from './application-inbox';
import { HiringBrand, HiringEmpty, HiringLanguages, HiringPublicLink, HiringTheme, type HiringLang } from './workspace-ui';
import { hiringCopy } from './workspace-copy';
import { AF_PROVINCES } from '@/lib/geo/provinces';

const PROVINCE_OPTIONS = AF_PROVINCES as readonly string[];
interface EmployerOrg { organizationId: string; organizationName: string; organizationSlug: string; organizationVerified: boolean; role: 'owner' | 'recruiter' | 'viewer'; }
interface JobRow { id: string; slug: string; title: string; status: string; deadline: string | null; createdAt: string; salary: string | null; jobType: string | null; description: string; country: string | null; acceptsNativeApplications: boolean; }
type Bucket = 'active' | 'pending' | 'closed';
type Tab = 'overview' | 'jobs' | 'applications' | 'post' | 'profile' | 'team' | 'organization' | 'account';
type JobGroups = Record<Bucket, JobRow[]>;
const navigation = { overview: LayoutDashboard, jobs: BriefcaseBusiness, applications: Inbox, post: FilePlus2, profile: Building2, team: UsersRound, organization: Plus, account: Settings2 };
const fmt = (d: string | null) => d && Number.isFinite(Date.parse(d)) ? new Date(d).toISOString().slice(0, 10) : '—';

export function EmployerDashboard({ userName, organizations, initialClaim = '', lang = 'en' }: { userName: string; organizations: EmployerOrg[]; initialClaim?: string; lang?: HiringLang }) {
  const c = hiringCopy[lang];
  const [activeOrgId, setActiveOrgId] = useState<string | null>(organizations[0]?.organizationId ?? null);
  const [jobs, setJobs] = useState<JobGroups | null>(null);
  const [analytics, setAnalytics] = useState<{published:number;pending:number;closed:number;expiringSoon:number} | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [posting, setPosting] = useState(false);
  const [postVersion,setPostVersion] = useState(0);
  const [tab, setTab] = useState<Tab>(initialClaim ? 'organization' : 'overview');
  const [bucket, setBucket] = useState<Bucket | 'all' | 'closing'>('all'), [search, setSearch] = useState('');
  const requestVersion = useRef(0), activeIdRef = useRef(activeOrgId), mutating = useRef(false);
  const activeOrg = organizations.find(o => o.organizationId === activeOrgId) ?? null;
  const canManage = activeOrg?.role === 'owner' || activeOrg?.role === 'recruiter';

  const loadJobs = useCallback(async (orgId: string) => {
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const [response, metrics] = await Promise.all([
        fetch('/api/employers/jobs?organizationId=' + encodeURIComponent(orgId), {cache:'no-store'}),
        fetch('/api/employers/jobs/analytics?organizationId=' + encodeURIComponent(orgId), {cache:'no-store'}),
      ]);
      const data = await response.json();
      if (!response.ok || !data.success) throw Error(data.error || 'Request failed');
      const totals = metrics.ok ? await metrics.json() : null;
      if (version !== requestVersion.current || activeIdRef.current !== orgId) return;
      setJobs({active:data.active ?? [], pending:data.pending ?? [], closed:data.closed ?? []}); setAnalytics(totals);
    } catch {
      if (version === requestVersion.current && activeIdRef.current === orgId) setError('load');
    } finally { if (version === requestVersion.current && activeIdRef.current === orgId) setLoading(false); }
  }, []);
  useEffect(() => { if (activeOrgId) void loadJobs(activeOrgId); return () => { requestVersion.current++; }; }, [activeOrgId, loadJobs]);

  function switchOrg(id: string) { activeIdRef.current = id; requestVersion.current++; setJobs(null); setAnalytics(null); setLoading(true); setError(''); setActiveOrgId(id); setTab('overview'); setSearch(''); }
  async function logout() { try { const r = await fetch('/api/employers/auth/logout', {method:'POST'}); if (r.ok) window.location.assign('/' + lang + '/employers/login'); else toast.error(c.loadError); } catch { toast.error(c.loadError); } }
  async function act(jobId: string, body: Record<string,unknown>, message: string) {
    if (mutating.current) return; mutating.current = true; setBusy(true);
    const orgId = activeOrgId;
    try { const r = await fetch('/api/employers/jobs/' + jobId, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)}); const d = await r.json(); if (!r.ok || !d.success) throw Error(d.error); toast.success(message); if (orgId && activeIdRef.current === orgId) await loadJobs(orgId); }
    catch (e) { toast.error((e as Error).message); } finally { mutating.current = false; setBusy(false); }
  }
  async function postJob(form: Record<string,string>) {
    if (!activeOrgId || mutating.current) return; mutating.current = true; setPosting(true);
    const orgId = activeOrgId;
    try { const r = await fetch('/api/employers/jobs', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({organizationId:orgId,...form})}); const d = await r.json(); if (!r.ok || !d.success) throw Error(d.error); toast.success(c.moderation); if (activeIdRef.current === orgId) { setTab('jobs'); setBucket('pending'); setPostVersion(v=>v+1); await loadJobs(orgId); } }
    catch (e) { toast.error((e as Error).message); } finally { mutating.current = false; setPosting(false); }
  }
  const allJobs = jobs ? [...jobs.active,...jobs.pending,...jobs.closed].sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt)) : [];
  const closingJobs = (jobs?.active ?? []).filter(job => job.deadline && Date.parse(job.deadline) >= Date.now() && Date.parse(job.deadline) <= Date.now()+7*86400000);
  const shownJobs = (bucket === 'all' ? allJobs : bucket === 'closing' ? closingJobs : jobs?.[bucket] ?? []).filter(j => j.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const status = (job:JobRow):Bucket => job.status === 'published' ? 'active' : job.status === 'draft' ? 'pending' : 'closed';
  const statusTag = (job:JobRow) => <span className={'hiring-status ' + status(job)}>{c[status(job)]}</span>;

  return <div className="hiring-ui" dir={lang === 'en' ? 'ltr' : 'rtl'}>
    <header className="workspace-bar"><div className="hiring-topbar"><HiringBrand lang={lang}/><div className="workspace-bar-actions"><HiringLanguages lang={lang} path="employers/dashboard"/><HiringTheme lang={lang}/><button className="hiring-text-button" onClick={() => void logout()}><LogOut size={16}/><span>{c.logout}</span></button></div></div></header>
    {!activeOrg ? <main id="main-content" className="hiring-onboarding"><p className="hiring-eyebrow text-muted-foreground">{c.signed} {userName}</p><h1 className="mt-4">{c.welcome}</h1><p className="hiring-subtitle">{c.welcomeBody}</p><PendingOrganizations lang={lang}/><OrganizationSetup lang={lang} initialClaim={initialClaim}/><Link href={'/'+lang+'/portal'} className="hiring-external mt-5">{c.seeker}<ArrowUpRight size={16}/></Link></main> : <div className="workspace-grid">
      <aside className="workspace-sidebar"><div className="workspace-org"><span className="workspace-org-icon"><Building2 size={22}/></span><div><h2>{activeOrg.organizationName}</h2><p>{c[activeOrg.role]}{activeOrg.organizationVerified ? ' · ' + c.verified : ''}</p></div></div>
        {organizations.length > 1 && <label className="mt-4"><span className="sr-only">{c.organization}</span><select disabled={busy || posting} value={activeOrgId ?? ''} onChange={e => switchOrg(e.target.value)}>{organizations.map(o => <option key={o.organizationId} value={o.organizationId}>{o.organizationName}</option>)}</select></label>}
        <nav className="workspace-nav" aria-label={c.overview}>{(Object.keys(navigation) as Tab[]).filter(t => t === 'team' ? activeOrg.role === 'owner' : t === 'post' || t === 'applications' ? canManage : true).map(t => { const Icon = navigation[t]; return <button key={t} aria-current={tab === t ? 'page' : undefined} disabled={posting} onClick={() => setTab(t)}><Icon size={17} aria-hidden="true"/>{c[t]}{t === 'jobs' && jobs && <small>{allJobs.length}</small>}</button>; })}</nav>
        <label className="workspace-mobile-menu"><span>{lang==='fa'?'بخش مورد نظر':lang==='ps'?'برخه وټاکئ':'Workspace section'}</span><select disabled={posting} value={tab} onChange={e=>setTab(e.target.value as Tab)}>{(Object.keys(navigation) as Tab[]).filter(t=>t==='team'?activeOrg.role==='owner':t==='post'||t==='applications'?canManage:true).map(t=><option key={t} value={t}>{c[t]}</option>)}</select></label>
        <div className="workspace-sidebar-bottom"><HiringPublicLink lang={lang} slug={activeOrg.organizationSlug}>{c.public}</HiringPublicLink><Link href={'/'+lang+'/portal'}>{c.seeker}<ArrowUpRight size={14}/></Link><p className="mt-4 break-words text-[10px] text-muted-foreground">{c.signed} {userName}</p></div>
      </aside>
      <main id="main-content" className="workspace-content">
        <div className="workspace-heading"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{activeOrg.organizationName} / {c[tab]}</p><h1>{tab === 'overview' ? c.hello : c[tab]}</h1><p>{tab === 'overview' ? c.intro : tab === 'jobs' ? c.jobsIntro : tab === 'post' ? c.postIntro : null}</p></div>{canManage && (tab === 'overview' || tab === 'jobs') && <button className="hiring-primary" onClick={() => setTab('post')}><Plus size={17}/>{c.post}</button>}</div>
        {(tab === 'overview' || tab === 'jobs') && <>
          {loading && <div role="status" aria-live="polite"><p className="mb-4 text-sm text-muted-foreground">{c.load}</p><div className="grid grid-cols-2 gap-4"><div className="hiring-skeleton"/><div className="hiring-skeleton"/></div></div>}
          {!loading && error && <div className="hiring-notice is-error" role="alert"><p>{c.loadError}</p><button className="hiring-secondary mt-3" onClick={() => void loadJobs(activeOrgId!)}>{c.retry}</button></div>}
        </>}
        {tab === 'overview' && !loading && !error && jobs && <>
          <div className="workspace-metrics">{([{label:c.active,value:analytics?.published ?? jobs.active.length,icon:CheckCircle2,bucket:'active'},{label:c.pending,value:analytics?.pending ?? jobs.pending.length,icon:Clock3,bucket:'pending'},{label:c.closed,value:analytics?.closed ?? jobs.closed.length,icon:BriefcaseBusiness,bucket:'closed'},{label:c.expiring,value:analytics?.expiringSoon ?? closingJobs.length,icon:CalendarDays,bucket:'closing'}] as const).map(metric => <button className="workspace-metric" key={metric.label} onClick={() => {setBucket(metric.bucket);setTab('jobs');}}><metric.icon className="metric-icon" size={18}/><strong>{metric.value}</strong><span>{metric.label}</span></button>)}</div>
          <p className="mb-6 text-[11px] text-muted-foreground">{c.counts}</p>
          <div className="workspace-overview"><section className="hiring-card"><div className="hiring-card-title"><h2>{c.recent}</h2><button onClick={() => {setBucket('all');setTab('jobs');}}>{c.viewAll} →</button></div>{allJobs.length ? allJobs.slice(0,5).map(job => <div className="workspace-recent" key={job.id}><div><strong dir="auto">{job.title}</strong><p>{job.country || c.unspecified} · {c.deadline} {fmt(job.deadline)}</p></div>{statusTag(job)}</div>) : <HiringEmpty icon={<BriefcaseBusiness size={24}/>} title={c.empty} action={canManage && <button className="hiring-primary" onClick={() => setTab('post')}><Plus size={16}/>{c.post}</button>}>{c.emptyBody}</HiringEmpty>}</section>
          <section className="hiring-card"><div className="hiring-card-title"><h2>{c.next}</h2><ArrowUpRight size={18} className="text-muted-foreground"/></div><div className="hiring-task"><h3>{c.nextProfile}</h3><p>{c.nextProfileBody}</p><button onClick={() => setTab('profile')}>{c.profile}<ArrowRight size={14}/></button></div>{canManage && <div className="hiring-task"><h3>{c.nextInbox}</h3><p>{c.nextInboxBody}</p><button onClick={() => setTab('applications')}>{c.applications}<ArrowRight size={14}/></button></div>}<div className="hiring-task"><h3>{c.teamCode}</h3><code className="my-3 block break-all rounded-lg bg-muted p-3 text-xs" dir="ltr">{activeOrg.organizationSlug}</code><p>{c.teamHint}</p></div><HiringPublicLink lang={lang} slug={activeOrg.organizationSlug}>{c.public}</HiringPublicLink></section></div>
        </>}
        {tab === 'jobs' && !loading && !error && jobs && <>
          <div className="hiring-toolbar"><label className="hiring-search"><span className="sr-only">{c.search}</span><Search size={16}/><input type="search" placeholder={c.search} value={search} onChange={e => setSearch(e.target.value)}/></label><button className="hiring-secondary" onClick={() => void loadJobs(activeOrgId!)}><RefreshCw size={15}/>{c.refresh}</button></div>
          <div className="hiring-filters" aria-label={c.jobs}>{(['all','active','pending','closed','closing'] as const).map(value => <button key={value} aria-pressed={bucket === value} onClick={() => setBucket(value)}>{value === 'all' ? c.all : value === 'closing' ? c.expiring : c[value]} <span className="ms-1 opacity-70">{value === 'all' ? allJobs.length : value === 'closing' ? closingJobs.length : jobs[value].length}</span></button>)}</div>
          {shownJobs.map(job => <article key={job.id} className="vacancy-card"><div className="vacancy-card-top"><h2 dir="auto">{job.title}</h2>{statusTag(job)}</div><div className="vacancy-meta"><span><MapPin size={13}/>{job.country || c.unspecified}</span><span><CalendarDays size={13}/>{c.deadline} {fmt(job.deadline)}</span><span>{job.acceptsNativeApplications ? c.inbox : c.external}</span></div><div className="vacancy-actions">{status(job) === 'active' && <Link href={'/'+lang+'/opportunities/'+job.slug} className="hiring-external">{c.public}<ArrowUpRight size={14}/></Link>}{canManage && <>{status(job) !== 'closed' ? <><ExtendButton lang={lang} busy={busy} onExtend={date => void act(job.id,{action:'extend',deadline:date},c.save)}/><Button variant="ghost" disabled={busy} onClick={() => void act(job.id,{action:'close'},c.closed)}>{c.close}</Button></> : <Button variant="ghost" disabled={busy} onClick={() => void act(job.id,{action:'reopen'},c.pending)}>{c.reopen}</Button>}<Button variant="ghost" disabled={busy} onClick={() => void act(job.id,{action:'duplicate'},c.pending)}><Copy size={13}/>{c.duplicate}</Button></>}</div>{canManage && <JobEditForm lang={lang} job={job} busy={busy} onSave={patch => void act(job.id,{action:'edit',...patch},c.pending)}/>}</article>)}
          {!shownJobs.length && <div className="hiring-card mt-4"><HiringEmpty icon={<Search size={24}/>} title={allJobs.length ? c.noMatch : c.empty} action={!allJobs.length && canManage && <button className="hiring-primary" onClick={() => setTab('post')}>{c.post}</button>}>{allJobs.length ? c.noMatchBody : c.emptyBody}</HiringEmpty></div>}
        </>}
        {canManage && <div hidden={tab !== 'post'}><PostJobForm key={activeOrgId+':'+postVersion} lang={lang} busy={posting} onSubmit={form => void postJob(form)}/></div>}
        {tab === 'profile' && <OrganizationWorkspace key={activeOrgId} lang={lang} id={activeOrg.organizationId} readOnly={activeOrg.role !== 'owner'}/>}
        {tab === 'team' && activeOrg.role === 'owner' && <EmployerTeam key={activeOrgId} organizationId={activeOrg.organizationId} lang={lang}/>}
        {tab === 'applications' && canManage && <ApplicationInbox key={activeOrgId} organizationId={activeOrg.organizationId} lang={lang}/>}
        {tab === 'organization' && <><PendingOrganizations lang={lang}/><OrganizationSetup lang={lang} initialClaim={initialClaim}/></>}
        {tab === 'account' && <AccountPanel lang={lang}/>}
        <div className="mt-8 border-t pt-4 text-[11px] text-muted-foreground lg:hidden"><HiringPublicLink lang={lang} slug={activeOrg.organizationSlug}>{c.public}</HiringPublicLink><Link href={'/'+lang+'/portal'} className="hiring-external ms-4">{c.seeker}</Link></div>
      </main>
    </div>}
  </div>;
}

function OrganizationSetup({lang,initialClaim}:{lang:HiringLang;initialClaim:string}) {
  const c = hiringCopy[lang], [choice,setChoice] = useState<'create'|'claim'>(initialClaim ? 'claim' : 'create');
  const [slug,setSlug] = useState(initialClaim), [email,setEmail] = useState(''), [busy,setBusy] = useState(false), [message,setMessage] = useState('');
  const sending = useRef(false);
  async function claim(e:React.FormEvent) {e.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);setMessage('');try{const r=await fetch('/api/employers/claims',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationSlug:slug.trim(),claimEmail:email.trim()})}),d=await r.json();if(!r.ok)throw Error(d.error);window.location.reload();}catch(e){setMessage((e as Error).message);}finally{sending.current=false;setBusy(false);}}
  return <><div className="hiring-choice-grid">{(['create','claim'] as const).map(value=><button key={value} disabled={busy} aria-pressed={choice===value} onClick={()=>setChoice(value)}>{value==='create'?<Building2 size={23}/>:<UsersRound size={23}/>}<strong>{c[value]}</strong><span>{value==='create'?c.createBody:c.claimBody}</span></button>)}</div>{choice==='create'?<OrganizationWorkspace lang={lang}/>:<section className="hiring-card"><h2 className="text-lg font-semibold">{c.claim}</h2><p className="hiring-subtitle">{c.claimHelp}</p><Link className="hiring-external" href={'/'+lang+'/organizations'}>{c.find}<ArrowUpRight size={16}/></Link><form className="hiring-form" onSubmit={claim}><fieldset disabled={busy}><label>{c.slug}<input required value={slug} onChange={e=>setSlug(e.target.value)} dir="ltr" maxLength={200} placeholder="organization-name"/></label><label>{c.evidence}<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} dir="ltr" placeholder="you@organization.org"/></label></fieldset>{message&&<p role="alert" className="hiring-notice is-error">{message}</p>}<button disabled={busy} className="hiring-primary mt-6">{busy?<RefreshCw size={16} className="animate-spin"/>:null}{c.request}</button></form></section>}</>;
}

function ExtendButton({ busy, onExtend,lang }: { busy: boolean; onExtend: (date: string) => void;lang:HiringLang }) {
  const c=hiringCopy[lang], [open,setOpen]=useState(false), [date,setDate]=useState('');
  if(!open)return <Button variant="ghost" disabled={busy} onClick={()=>setOpen(true)}>{c.extend}</Button>;
  return <span className="inline-flex flex-wrap items-center gap-2"><label><span className="sr-only">{c.deadline}</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button className="hiring-secondary" disabled={busy||!date} onClick={()=>{onExtend(date);setOpen(false);}}>{c.save}</button><button className="hiring-text-button" onClick={()=>setOpen(false)}>{c.cancel}</button></span>;
}

function PostJobForm({ busy,onSubmit,lang }: {busy:boolean;onSubmit:(form:Record<string,string>)=>void;lang:HiringLang}) {
  const c=hiringCopy[lang], [preview,setPreview]=useState(false);
  const previewHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(preview)previewHeading.current?.focus();},[preview]);
  const [form,setForm]=useState({title:'',description:'',location:'',salary:'',jobType:'full-time',deadline:'',applyUrl:'',applyEmail:'',applyPhone:'',applyMethod:'ariahub',vacancyNumber:'',numberOfVacancies:'',province:'',city:'',district:'',contractType:'',contractDuration:'',genderRequirement:'',nationalityRequirement:'',salaryGrade:'',education:'',experience:'',responsibilities:'',requirements:'',guidelines:''});
  const set=(key:keyof typeof form)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>setForm(old=>({...old,[key]:e.target.value}));
  const options=lang==='fa'?['دریافت در صندوق آریا هاب','صفحۀ رسمی درخواست','ایمیل درخواست','تماس تلفنی','واتس‌اپ کارفرما','مراجعۀ حضوری']:lang==='ps'?['د آریا هاب صندوق','رسمي غوښتنلیک پاڼه','د غوښتنلیک برېښنالیک','ټیلیفوني اړیکه','د کار ورکوونکي واتس‌اپ','حضوري غوښتنلیک']:['Receive in ARIA HUB inbox','Official application website','Application email','Telephone','Employer WhatsApp','Apply in person'];
  const detailLabels=lang==='fa'?['شماره مرجع','تعداد بست‌ها','ولایت','شهر','ناحیه','نوع قرارداد','مدت قرارداد','شرط جنسیت (در صورت نیاز)','شرط تابعیت (در صورت نیاز)','درجۀ معاش','تحصیلات','تجربه','مسئولیت‌ها','شرایط و اسناد مورد نیاز','رهنمود درخواست']:lang==='ps'?['د اعلان شمېره','د بستونو شمېر','ولایت','ښار','ولسوالي','د قرارداد ډول','د قرارداد موده','د جنسیت شرط (که وي)','د تابعیت شرط (که وي)','د معاش درجه','زده کړې','تجربه','مسئولیتونه','شرایط او اړین اسناد','د غوښتنلیک لارښود']:['Reference number','Number of positions','Province','City','District','Contract type','Contract duration','Gender requirement (if stated)','Nationality requirement (if stated)','Salary grade','Education','Experience','Responsibilities','Requirements & documents','Application instructions'];
  const typeLabel=(lang==='fa'?['تمام‌وقت','نیمه‌وقت','قراردادی','کارآموزی','از راه دور']:lang==='ps'?['بشپړ وخت','نیم وخت','قرارداد','کارزده کړه','له لرې']:['Full time','Part time','Contract','Internship','Remote'])[['full-time','part-time','contract','internship','remote'].indexOf(form.jobType)];
  const applicationLabel=options[['ariahub','website','email','phone','whatsapp','in_person'].indexOf(form.applyMethod)];
  const field=(key:keyof typeof form,label:string,type='text',required=false)=><label key={key}>{label}{' '}{!required&&<span className="ms-2 text-[10px] font-normal text-muted-foreground">{c.optional}</span>}<input type={type} value={form[key]} onChange={set(key)} required={required} maxLength={key==='title'?200:500} minLength={key==='title'?5:undefined} min={type==='number'?1:undefined} max={type==='number'?999:undefined} dir={['url','email','tel','date','number'].includes(type)?'ltr':undefined}/></label>;
  if(preview)return <section className="hiring-card"><span className="hiring-status pending">{c.preview}</span><h2 ref={previewHeading} tabIndex={-1} className="mt-5 scroll-mt-8 text-2xl font-semibold" dir="auto">{form.title}</h2><div className="vacancy-meta"><span>{form.location||c.unspecified}</span><span>{c.deadline}: {form.deadline||c.unspecified}</span><span>{typeLabel}</span></div><p className="hiring-preview my-7" dir="auto">{form.description}</p><div className="rounded-xl border p-4 text-sm"><strong>{c.apply}</strong><p className="mt-2">{applicationLabel}</p><p className="mt-2 break-all" dir="auto">{form.applyMethod==='website'?form.applyUrl:form.applyMethod==='email'?form.applyEmail:form.applyMethod==='phone'||form.applyMethod==='whatsapp'?form.applyPhone:form.applyMethod==='in_person'?form.guidelines:''}</p></div>{form.salary&&<p className="my-4 text-sm">{c.salary}: {form.salary}</p>}{(['responsibilities','requirements','education','experience','guidelines','vacancyNumber','numberOfVacancies','province','city','district','contractType','contractDuration','genderRequirement','nationalityRequirement','salaryGrade'] as const).filter(key=>form[key]&&!(key==='guidelines'&&form.applyMethod==='in_person')).map(key=><div className="my-5" key={key}><h3 className="text-sm font-semibold">{detailLabels[['vacancyNumber','numberOfVacancies','province','city','district','contractType','contractDuration','genderRequirement','nationalityRequirement','salaryGrade','education','experience','responsibilities','requirements','guidelines'].indexOf(key)]}</h3><p className="hiring-preview mt-2" dir="auto">{form[key]}</p></div>)}<p className="hiring-notice">{c.previewNote}</p><div className="flex flex-wrap gap-3"><button disabled={busy} className="hiring-secondary" onClick={()=>setPreview(false)}>{c.back}</button><button disabled={busy} aria-busy={busy} className="hiring-primary" onClick={()=>onSubmit(form)}>{busy?<RefreshCw size={16} className="animate-spin"/>:<CheckCircle2 size={17}/>} {c.submit}</button></div></section>;
  return <form className="overflow-hidden rounded-2xl border bg-card" onSubmit={e=>{e.preventDefault();setPreview(true);}}>
    <fieldset disabled={busy} className="hiring-form-section"><legend className="sr-only">{c.mainDetails}</legend><div className="hiring-section-heading"><span>01</span><h2>{c.mainDetails}</h2></div><div className="hiring-form-grid"><div className="hiring-field-wide">{field('title',c.title,'text',true)}</div><label className="hiring-field-wide">{c.description}<textarea required minLength={80} maxLength={40000} rows={8} value={form.description} onChange={set('description')} aria-describedby="role-description-hint"/><span className="hiring-hint" id="role-description-hint">{c.descriptionHint} · {form.description.length.toLocaleString(lang)} / 40,000</span></label>{field('location',c.location)}{field('salary',c.salary)}<label>{c.type}<select value={form.jobType} onChange={set('jobType')}>{['full-time','part-time','contract','internship','remote'].map((value,i)=><option key={value} value={value}>{(lang==='fa'?['تمام‌وقت','نیمه‌وقت','قراردادی','کارآموزی','از راه دور']:lang==='ps'?['بشپړ وخت','نیم وخت','قرارداد','کارزده کړه','له لرې']:['Full time','Part time','Contract','Internship','Remote'])[i]}</option>)}</select></label>{field('deadline',c.deadline,'date')}</div></fieldset>
    <fieldset disabled={busy} className="hiring-form-section"><legend className="sr-only">{c.applyDetails}</legend><div className="hiring-section-heading"><span>02</span><h2>{c.applyDetails}</h2></div><div className="hiring-form-grid"><label className="hiring-field-wide">{c.apply}<select value={form.applyMethod} onChange={set('applyMethod')}>{['ariahub','website','email','phone','whatsapp','in_person'].map((value,i)=><option key={value} value={value}>{options[i]}</option>)}</select></label>{form.applyMethod==='website'&&field('applyUrl',options[1],'url',true)}{form.applyMethod==='email'&&field('applyEmail',options[2],'email',true)}{(form.applyMethod==='phone'||form.applyMethod==='whatsapp')&&field('applyPhone',applicationLabel,'tel',true)}{form.applyMethod==='in_person'&&<label className="hiring-field-wide">{detailLabels[14]}<textarea required minLength={12} maxLength={12000} value={form.guidelines} onChange={set('guidelines')} rows={4}/></label>}</div><p className="hiring-hint mt-4">{c.privacy}</p></fieldset>
    <div className="hiring-form-section"><details><summary className="min-h-11 text-sm font-semibold text-[var(--primary)]">03 · {c.details} <span className="ms-2 text-xs font-normal text-muted-foreground">{c.optional}</span></summary><div className="hiring-form-grid mt-5">{(['vacancyNumber','numberOfVacancies','province','city','district','contractType','contractDuration','genderRequirement','nationalityRequirement','salaryGrade','education','experience'] as const).map((key,i)=>key==='province'?<label key={key}>{detailLabels[i]}<select value={form.province} onChange={set('province')}><option value="">{c.unspecified}</option>{PROVINCE_OPTIONS.map(p=><option key={p}>{p}</option>)}</select></label>:field(key,detailLabels[i],key==='numberOfVacancies'?'number':'text'))}{(['responsibilities','requirements','guidelines'] as const).filter(key=>key!=='guidelines'||form.applyMethod!=='in_person').map(key=><label className="hiring-field-wide" key={key}>{detailLabels[key==='responsibilities'?12:key==='requirements'?13:14]}<textarea rows={4} maxLength={12000} value={form[key]} onChange={set(key)}/></label>)}</div></details></div>
    <div className="hiring-form-footer"><p>{c.moderation}</p><button className="hiring-primary" disabled={busy} type="submit">{c.reviewPost}<ArrowRight size={17} className="rtl:-scale-x-100"/></button></div>
  </form>;
}

/** AUDIT §22 — account settings: session-authenticated password change. */
function AccountPanel({lang}:{lang:HiringLang}) {
  const c=lang==='fa'?{title:'تغییر رمز عبور',body:'رمز فعلی لازم است. نشست‌های دیگر پس از تغییر رمز معتبر نمی‌ماند.',current:'رمز فعلی',next:'رمز جدید (حداقل ۸ حرف)',confirm:'تأیید رمز جدید',save:'تغییر رمز',saving:'در حال ذخیره…',mismatch:'رمزها یکسان نیستند.',short:'رمز باید حداقل ۸ حرف باشد.',done:'رمز تغییر کرد.',error:'تغییر رمز انجام نشد. دوباره تلاش کنید.'}:lang==='ps'?{title:'پټنوم بدلول',body:'اوسنی پټنوم اړین دی. له بدلولو وروسته نورې ناستې اعتبار نه لري.',current:'اوسنی پټنوم',next:'نوی پټنوم (لږ تر لږه ۸ توري)',confirm:'نوی پټنوم تایید کړئ',save:'پټنوم بدلول',saving:'خوندي کېږي…',mismatch:'پټنومونه یو شان نه دي.',short:'پټنوم باید لږ تر لږه ۸ توري وي.',done:'پټنوم بدل شو.',error:'پټنوم بدل نه شو. بیا هڅه وکړئ.'}:{title:'Change password',body:'Requires your current password. Other sessions become invalid when your password changes.',current:'Current password',next:'New password (at least 8 characters)',confirm:'Confirm new password',save:'Update password',saving:'Updating…',mismatch:'New passwords do not match.',short:'Password must be at least 8 characters.',done:'Password updated.',error:'Password change failed. Please try again.'};
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(c.mismatch);
      return;
    }
    if (newPassword.length < 8) {
      toast.error(c.short);
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
        toast.success(c.done);
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        toast.error(data.error || c.error);
      }
    } catch {
      toast.error(c.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hiring-card max-w-lg">
      <h2 className="mb-2 text-lg font-semibold">{c.title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{c.body}</p>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-xs font-medium">
          {c.current}
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" className="h-9" />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          {c.next}
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="h-9" />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          {c.confirm}
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="h-9" />
        </label>
        <Button type="submit" size="sm" disabled={busy || !currentPassword || !newPassword}>
          {busy ? c.saving : c.save}
        </Button>
      </form>
    </div>
  );
}

function JobEditForm({job,busy,onSave,lang}:{job:JobRow;busy:boolean;onSave:(patch:Record<string,unknown>)=>void;lang:HiringLang}) {
 const c=hiringCopy[lang];
 return <details className="vacancy-edit"><summary>{c.edit}</summary><form className="my-4 space-y-5" onSubmit={e=>{e.preventDefault();onSave(Object.fromEntries(new FormData(e.currentTarget)));}}><p className="hiring-hint">{c.editHint}</p><fieldset disabled={busy} className="space-y-5"><label>{c.title}<input name="title" required minLength={5} maxLength={200} defaultValue={job.title}/></label><label>{c.description}<textarea name="description" required minLength={80} maxLength={40000} defaultValue={job.description} rows={8}/></label><div className="hiring-form-grid"><label>{c.location}<input name="location" defaultValue={job.country||''} maxLength={200}/></label><label>{c.salary}<input name="salary" defaultValue={job.salary||''} maxLength={200}/></label><label>{c.deadline}<input name="deadline" type="date" defaultValue={job.deadline?.slice(0,10)||''}/></label></div></fieldset><button disabled={busy} className="hiring-primary">{c.submit}</button></form></details>;
}
