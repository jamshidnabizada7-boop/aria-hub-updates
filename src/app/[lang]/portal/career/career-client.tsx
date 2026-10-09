'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
type Lang='en'|'fa'|'ps';
type Status='saved'|'preparing'|'applied'|'interview'|'offer'|'rejected'|'withdrawn';
type Application={id:string;status:Status;notes:string|null;nextActionAt:string|null;appliedAt:string|null;
 opportunity:{slug:string;title:string;titleI18n:Record<string,string>|null;organization:string|null;deadline:string|null;status:string}};
type CoachTask='cover_letter'|'application_email'|'interview_prep'|'cv_tips'|'application_checklist';
const tasks:CoachTask[]=['cover_letter','application_email','interview_prep','cv_tips','application_checklist'];
const statuses:Status[]=['saved','preparing','applied','interview','offer','rejected','withdrawn'];
const copy={
 en:{title:'Career Copilot & Application Tracker',intro:'Prepare applications, save your progress and practise interviews. Nothing is submitted to an employer automatically.',add:'Save a published opportunity',slug:'Opportunity URL or slug',track:'Track opportunity',applications:'My applications',noApplications:'No tracked opportunities yet.',state:'Application status',notes:'Private notes',follow:'Next follow-up date',save:'Save changes',remove:'Remove',deadline:'Deadline',view:'View listing',cv:'Open CV Builder',career:'Career assistance',task:'What do you need?',select:'Choose a tracked opportunity (optional)',general:'General assistance',request:'Generate guidance',ai:'Use AI model (optional, limited)',consent:'I consent to sending my verified headline, skills, relevant listing details and notes to the configured AI provider.',input:'Optional details about what you want to emphasize (do not include passwords, phone numbers or sensitive personal data)',output:'Your draft — review carefully before using',copy:'Copy draft',ready:'Saved',notSent:'Draft only. You must verify all claims and submit the application yourself.',error:'Could not complete the request.',loading:'Working...',statuses:['Saved','Preparing','Applied','Interview','Offer','Rejected','Withdrawn'],tasks:['Cover letter','Application email','Interview practice','CV improvements','Application checklist'],aiUnavailable:'AI unavailable. You can still use the guided draft.',privacy:'Only manually confirmed profile facts are used. Uploaded CVs are not read by the copilot.'},
 fa:{title:'دستیار کاری و پیگیری درخواست‌ها',intro:'درخواست‌های خود را آماده و پیگیری کنید و برای مصاحبه تمرین کنید. هیچ درخواستی خودکار ارسال نمی‌شود.',add:'ذخیره فرصت نشرشده',slug:'لینک یا شناسه فرصت',track:'افزودن به پیگیری',applications:'درخواست‌های من',noApplications:'هنوز فرصتی را پیگیری نکرده‌اید.',state:'وضعیت درخواست',notes:'یادداشت‌های خصوصی',follow:'تاریخ پیگیری بعدی',save:'ذخیره تغییرات',remove:'حذف',deadline:'مهلت',view:'مشاهده فرصت',cv:'باز کردن سی‌وی‌ساز',career:'کمک برای درخواست',task:'چه کمکی نیاز دارید؟',select:'انتخاب فرصت (اختیاری)',general:'راهنمایی عمومی',request:'تهیه پیش‌نویس',ai:'استفاده از هوش مصنوعی (اختیاری و محدود)',consent:'اجازه می‌دهم عنوان مسلکی، مهارت‌های تأییدشده، معلومات مرتبط فرصت و یادداشت‌های من به ارائه‌دهنده هوش مصنوعی ارسال شود.',input:'جزئیات اختیاری (رمز عبور، شماره تماس یا معلومات حساس وارد نکنید)',output:'پیش‌نویس شما — پیش از استفاده بررسی کنید',copy:'کاپی متن',ready:'ذخیره شد',notSent:'این فقط پیش‌نویس است. خودتان باید درستی معلومات را بررسی و درخواست را ارسال کنید.',error:'درخواست انجام نشد.',loading:'در حال اجرا...',statuses:['ذخیره‌شده','در حال آماده‌سازی','درخواست ارسال‌شده','مصاحبه','پیشنهاد کاری','ردشده','انصراف'],tasks:['نامه درخواست','ایمیل درخواست','تمرین مصاحبه','بهبود سی‌وی','چک‌لیست درخواست'],aiUnavailable:'هوش مصنوعی در دسترس نیست. از متن راهنما استفاده کنید.',privacy:'فقط اطلاعاتی که خودتان تأیید کرده‌اید استفاده می‌شود. اسناد سی‌وی آپلودشده خوانده نمی‌شوند.'},
 ps:{title:'د کار مرستیال او د غوښتنلیکونو څارنه',intro:'غوښتنلیکونه چمتو او تعقیب کړئ او مرکې تمرین کړئ. هېڅ غوښتنلیک په اتومات ډول نه لېږل کېږي.',add:'نشر شوی فرصت خوندي کړئ',slug:'د فرصت لینک یا پېژند',track:'فرصت تعقیب کړئ',applications:'زما غوښتنلیکونه',noApplications:'تر اوسه مو کوم فرصت نه دی تعقیب کړی.',state:'د غوښتنلیک حالت',notes:'شخصي یادښتونه',follow:'د بلې اړیکې نېټه',save:'بدلونونه خوندي کړئ',remove:'لرې کړئ',deadline:'وروستۍ نېټه',view:'فرصت وګورئ',cv:'سي وي جوړوونکی',career:'د کار لارښوونې',task:'څه مرسته غواړئ؟',select:'تعقیب شوی فرصت (اختیاري)',general:'عمومي لارښوونه',request:'مسوده جوړه کړئ',ai:'له AI څخه کار واخلئ (اختیاري او محدود)',consent:'زه اجازه ورکوم چې زما تایید شوي مهارتونه، مسلکي عنوان، اړوند فرصت او یادښتونه AI وړاندې کوونکي ته ولېږل شي.',input:'اختیاري یادښتونه (پټ نومونه، تلیفون او حساس معلومات مه ورکوئ)',output:'ستاسو مسوده — له کارولو مخکې یې وګورئ',copy:'متن کاپي کړئ',ready:'خوندي شول',notSent:'دا یوازې مسوده ده. معلومات پخپله تایید او غوښتنلیک پخپله ولېږئ.',error:'غوښتنه ترسره نه شوه.',loading:'روان دی...',statuses:['خوندي','چمتووالی','لېږل شوی','مرکه','وړاندیز','رد شوی','بېرته اخیستل شوی'],tasks:['د غوښتنلیک لیک','د غوښتنلیک برېښنالیک','د مرکې تمرین','سي وي ښه کول','د غوښتنلیک چک لېست'],aiUnavailable:'AI نشته. له لارښوونو کار اخیستلای شئ.',privacy:'یوازې ستاسو تایید شوي معلومات کارول کېږي. پورته شوی سي وي نه لوستل کېږي.'}
} as const;
function normalizeSlug(value:string){
 try{const u=new URL(value);const parts=u.pathname.split('/').filter(Boolean);const ix=parts.indexOf('opportunities');return ix>=0?parts[ix+1]||'':value.trim();}
 catch{return value.trim();}
}
export function CareerClient({lang,initialSlug}:{lang:Lang;initialSlug:string}){
 const t=copy[lang];const [items,setItems]=useState<Application[]>([]);
 const [slug,setSlug]=useState(initialSlug),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [changes,setChanges]=useState<Record<string,{status:Status;notes:string;nextActionAt:string}>>({});
 const [task,setTask]=useState<CoachTask>('application_checklist'),[choice,setChoice]=useState(''),[notes,setNotes]=useState(''),[useAi,setUseAi]=useState(false),[consent,setConsent]=useState(false),[draft,setDraft]=useState(''),[mode,setMode]=useState('');
 const refresh=useCallback(async()=>{const r=await fetch('/api/applicant/applications',{cache:'no-store'});if(!r.ok)throw Error('failed');const body=await r.json();setItems(body.items||[]);},[]);
 useEffect(()=>{void refresh().catch(()=>setMessage(t.error)).finally(()=>setLoading(false));},[refresh,t.error]);
 const req=async(path:string,method:string,body?:object)=>fetch('/api/applicant/'+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const change=(id:string,field:'status'|'notes'|'nextActionAt',v:string)=>setChanges(old=>{
  const base=old[id]||{status:items.find(x=>x.id===id)?.status||'saved',notes:items.find(x=>x.id===id)?.notes||'',nextActionAt:items.find(x=>x.id===id)?.nextActionAt?.slice(0,10)||''};
  return {...old,[id]:{...base,[field]:v}};});
 const edit=(a:Application)=>changes[a.id]||{status:a.status,notes:a.notes||'',nextActionAt:a.nextActionAt?.slice(0,10)||''};
 async function create(){setBusy(true);setMessage('');try{const r=await req('applications','POST',{opportunitySlug:normalizeSlug(slug)});if(!r.ok){const b=await r.json();throw Error(b.error);}await refresh();setSlug('');setMessage(t.ready);}catch(e){setMessage(e instanceof Error?e.message:t.error);}finally{setBusy(false);}}
 async function update(a:Application){setBusy(true);try{const v=edit(a),body={status:v.status,notes:v.notes||null,nextActionAt:v.nextActionAt?new Date(v.nextActionAt+'T12:00:00Z').toISOString():null};const r=await req('applications/'+encodeURIComponent(a.id),'PATCH',body);if(!r.ok)throw Error((await r.json()).error);await refresh();setMessage(t.ready);}catch(e){setMessage(e instanceof Error?e.message:t.error);}finally{setBusy(false);}}
 async function remove(a:Application){if(!window.confirm(t.remove+'?'))return;setBusy(true);try{const r=await req('applications/'+encodeURIComponent(a.id),'DELETE');if(!r.ok)throw Error('failed');await refresh();}catch{setMessage(t.error);}finally{setBusy(false);}}
 async function coach(){setBusy(true);setDraft('');setMessage('');try{
  const r=await req('career-coach','POST',{task,lang,opportunitySlug:choice||undefined,userNotes:notes,useAi,consentToShareContext:useAi&&consent});
  const d=await r.json();if(!r.ok){if(d.guidedDraft){setDraft(d.guidedDraft);setMode('guided');setMessage(t.aiUnavailable);}else throw Error(d.error||'failed');}
  else{setDraft(d.draft);setMode(d.mode);}
 }catch(e){setMessage(e instanceof Error?e.message:t.error);}finally{setBusy(false);}}
 const cls='mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm';
 return <main className="mx-auto max-w-5xl px-4 py-12" dir={lang==='en'?'ltr':'rtl'}>
  <h1 className="text-3xl font-bold">{t.title}</h1><p className="mt-3 text-muted-foreground">{t.intro}</p>
  <div className="mt-7 grid gap-6 lg:grid-cols-2">
   <section className="rounded-xl border bg-card p-5">
    <h2 className="text-xl font-bold">{t.add}</h2>
    <label className="mt-3 block text-sm">{t.slug}<input dir="ltr" className={cls} maxLength={500} value={slug} onChange={e=>setSlug(e.target.value)}/></label>
    <button type="button" disabled={!slug||busy} onClick={()=>void create()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{t.track}</button>
   </section>
   <section className="rounded-xl border bg-card p-5">
    <h2 className="text-xl font-bold">{t.career}</h2>
    <label className="mt-3 block text-sm">{t.task}<select className={cls} value={task} onChange={e=>setTask(e.target.value as CoachTask)}>{tasks.map((x,i)=><option key={x} value={x}>{t.tasks[i]}</option>)}</select></label>
    <label className="mt-3 block text-sm">{t.select}<select className={cls} value={choice} onChange={e=>setChoice(e.target.value)}><option value="">{t.general}</option>{items.map(x=><option key={x.id} value={x.opportunity.slug}>{x.opportunity.title}</option>)}</select></label>
    <label className="mt-3 block text-sm">{t.input}<textarea className={cls} value={notes} maxLength={600} rows={3} onChange={e=>setNotes(e.target.value)}/></label>
    <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={useAi} onChange={e=>{setUseAi(e.target.checked);if(!e.target.checked)setConsent(false);}}/>{t.ai}</label>
    {useAi&&<label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{t.consent}</label>}
    <button type="button" disabled={busy||(useAi&&!consent)} onClick={()=>void coach()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{busy?t.loading:t.request}</button>
   </section>
  </div>
  {message&&<p role="status" className="my-5 rounded-lg border p-3 text-sm">{message}</p>}
  {draft&&<section className="my-7 rounded-xl border bg-card p-5"><div className="flex justify-between gap-2"><h2 className="text-xl font-bold">{t.output} ({mode})</h2><button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>void navigator.clipboard?.writeText(draft)}>{t.copy}</button></div><pre className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-muted p-4 font-sans text-sm leading-7">{draft}</pre><p className="mt-4 text-sm text-muted-foreground">{t.notSent}</p></section>}
  <section className="mt-10"><h2 className="text-2xl font-bold">{t.applications} ({items.length})</h2>
   {!loading&&!items.length&&<p className="mt-5 text-muted-foreground">{t.noApplications}</p>}
   <div className="mt-4 space-y-4">{items.map(a=>{const v=edit(a),title=a.opportunity.titleI18n?.[lang]||a.opportunity.title;return <article key={a.id} className="rounded-xl border bg-card p-5">
    <h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{a.opportunity.organization||''} · {t.deadline}: {a.opportunity.deadline?.slice(0,10)||'—'}</p>
    <div className="my-3 flex flex-wrap gap-3">{a.opportunity.status==='published'&&<Link className="rounded-lg border px-3 py-2 text-sm" href={'/'+lang+'/opportunities/'+encodeURIComponent(a.opportunity.slug)}>{t.view}</Link>}<Link className="rounded-lg border px-3 py-2 text-sm" href={'/'+lang+'/cv-builder'}>{t.cv}</Link><button type="button" onClick={()=>{setChoice(a.opportunity.slug);window.scrollTo({top:0,behavior:'smooth'});}} className="rounded-lg border px-3 py-2 text-sm">{t.career}</button></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{t.state}<select className={cls} value={v.status} onChange={e=>change(a.id,'status',e.target.value)}>{statuses.map((x,i)=><option key={x} value={x}>{t.statuses[i]}</option>)}</select></label>
    <label className="text-sm">{t.follow}<input type="date" className={cls} value={v.nextActionAt} onChange={e=>change(a.id,'nextActionAt',e.target.value)}/></label></div>
    <label className="mt-3 block text-sm">{t.notes}<textarea className={cls} maxLength={2000} rows={2} value={v.notes} onChange={e=>change(a.id,'notes',e.target.value)}/></label>
    <div className="mt-3 flex gap-2"><button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={busy} onClick={()=>void update(a)}>{t.save}</button><button className="rounded-lg border px-4 py-2 text-destructive" disabled={busy} onClick={()=>void remove(a)}>{t.remove}</button></div>
   </article>;})}</div>
  </section>
  <p className="mt-9 text-xs text-muted-foreground">{t.privacy} {t.notSent}</p>
 </main>;
}
