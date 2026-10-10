'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {ApplicantChannels} from './applicant-channels';
type Lang='en'|'fa'|'ps';
type Preference={inAppEnabled:boolean,emailEnabled:boolean,pushEnabled:boolean,whatsappEnabled:boolean,emailFrequency:'daily'|'weekly'};
type Notification={id:string;createdAt:string;readAt:string|null;searchName:string;slug:string;title:string;titleI18n:Record<string,string>|null;organization:string|null;available:boolean};
const strings={
 en:{title:'My notifications',intro:'Control when ARIA HUB tells you about strong matches from your saved searches. Alerts are not eligibility guarantees.',inApp:'Notify me in my portal',email:'Send matching opportunities to my verified email',freq:'Email frequency',daily:'Daily digest',weekly:'Weekly digest',save:'Save my choices',enable:'You must choose which alerts you want. Nothing is enabled automatically.',inbox:'Recent matches',unread:'unread',markAll:'Mark all read',open:'View opportunity',unavailable:'This opportunity is no longer open',empty:'No matches yet. Set up an Advanced Matcher search, then enable notifications here.',saved:'Preferences saved',error:'Unable to load or save notifications',load:'Load more',delete:'Clear unread',search:'Saved search',back:'Advanced Matcher',later:'Mobile push and WhatsApp are not enabled. They require a separate opt-in and provider setup.'},
 fa:{title:'اطلاع‌رسانی‌های من',intro:'خودتان انتخاب کنید آریا هاب چه وقت فرصت‌های بسیار مناسب را اطلاع دهد. تطبیق تضمین واجد شرایط بودن نیست.',inApp:'اطلاع‌رسانی در حساب من',email:'فرستادن فرصت‌های مناسب به ایمیل تأییدشده',freq:'زمان‌بندی ایمیل',daily:'خلاصه روزانه',weekly:'خلاصه هفتگی',save:'ذخیره انتخاب‌ها',enable:'هیچ اطلاع‌رسانی بدون انتخاب شما فعال نمی‌شود.',inbox:'تطبیق‌های اخیر',unread:'خوانده‌نشده',markAll:'علامت‌گذاری همه به‌عنوان خوانده‌شده',open:'دیدن فرصت',unavailable:'این فرصت دیگر فعال نیست',empty:'هنوز تطبیقی نیست. جستجوی پیشرفته را ذخیره و اطلاع‌رسانی را فعال کنید.',saved:'ترجیحات ذخیره شد',error:'بارگیری یا ذخیره اطلاع‌رسانی ممکن نشد',load:'نمایش بیشتر',delete:'خواندن همه',search:'جستجوی ذخیره‌شده',back:'تطبیق پیشرفته',later:'اطلاع‌رسانی موبایل و واتس‌اپ هنوز فعال نیستند و به رضایت و تنظیمات جداگانه نیاز دارند.'},
 ps:{title:'زما خبرتیاوې',intro:'خپله وټاکئ چې آریا هاب کله له خوندي لټونونو سره د قوي برابر فرصت خبر درکړي. دا د منلو تضمین نه دی.',inApp:'زما په حساب کې خبرتیاوې',email:'زما تایید شوي برېښنالیک ته مناسب فرصتونه لېږل',freq:'د برېښنالیک وخت',daily:'ورځنی لنډیز',weekly:'اونیز لنډیز',save:'غوره توبونه خوندي کړئ',enable:'ستاسو له انتخاب پرته خبرتیاوې نه فعالېږي.',inbox:'وروستي برابر فرصتونه',unread:'نه دي لوستل شوي',markAll:'ټول لوستل شوي وښایاست',open:'فرصت وګورئ',unavailable:'دا فرصت نور خلاص نه دی',empty:'لا مناسب فرصت نشته. پرمختللی لټون خوندي کړئ او خبرتیاوې فعالې کړئ.',saved:'غوره توبونه خوندي شول',error:'خبرتیاوې ترلاسه یا خوندي نه شوې',load:'نور وګورئ',delete:'ټول لوستل شوي',search:'خوندي لټون',back:'پرمختللې برابرونه',later:'موبایل پش او واټس‌اپ لا فعال نه دي؛ جلا رضایت او چمتووالي ته اړتیا لري.'}
} as const;
export function ApplicantNotifications({lang}:{lang:Lang}){
 const t=strings[lang];
 const [prefs,setPrefs]=useState<Preference>({inAppEnabled:false,emailEnabled:false,pushEnabled:false,whatsappEnabled:false,emailFrequency:'daily'});
 const [emailVerified,setEmailVerified]=useState(false);
 const [savedPushConsent,setSavedPushConsent]=useState(false);
 const [items,setItems]=useState<Notification[]>([]),[unread,setUnread]=useState(0),[next,setNext]=useState<string|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  const [p,n]=await Promise.all([fetch('/api/applicant/notification-preferences',{cache:'no-store'}),fetch('/api/applicant/notifications',{cache:'no-store'})]);
  if(!p.ok||!n.ok)throw Error('unavailable');
  const pd=await p.json(),nd=await n.json();
  setPrefs(pd.preferences);setSavedPushConsent(Boolean(pd.preferences.pushEnabled));setEmailVerified(Boolean(pd.emailVerified));setItems(nd.items||[]);setUnread(nd.unread||0);setNext(nd.nextCursor||null);
 },[]);
 useEffect(()=>{void refresh().catch(()=>setStatus(t.error)).finally(()=>setLoading(false));},[refresh,t.error]);
 async function save(){setBusy(true);setStatus('');try{const r=await fetch('/api/applicant/notification-preferences',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(prefs)});if(!r.ok)throw Error('bad');setSavedPushConsent(prefs.pushEnabled);setStatus(t.saved);}catch{setStatus(t.error);}finally{setBusy(false);}}
 async function read(id?:string){try{const r=await fetch('/api/applicant/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(id?{id}:{all:true})});if(!r.ok)throw Error('bad');await refresh();}catch{setStatus(t.error);}}
 async function archive(id:string){try{const r=await fetch('/api/applicant/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,archive:true})});if(!r.ok)throw Error();await refresh();}catch{setStatus(t.error);}}
 async function more(){if(!next)return;try{const r=await fetch('/api/applicant/notifications?cursor='+encodeURIComponent(next),{cache:'no-store'});if(!r.ok)throw Error('bad');const d=await r.json();setItems(old=>[...old,...(d.items||[])]);setNext(d.nextCursor||null);}catch{setStatus(t.error);}}
 const input='rounded-md border bg-background p-2';
 return <main className="mx-auto max-w-4xl px-5 py-12" dir={lang==='en'?'ltr':'rtl'}>
  <h1 className="text-3xl font-bold">{t.title}</h1><p className="mt-3 text-muted-foreground">{t.intro}</p>
  <section className="my-8 rounded-xl border bg-card p-5"><h2 className="text-xl font-semibold">{t.enable}</h2>
   <label className="mt-5 flex items-center gap-3"><input type="checkbox" checked={prefs.inAppEnabled} onChange={e=>setPrefs(p=>({...p,inAppEnabled:e.target.checked}))} />{t.inApp}</label>
   <label className="mt-4 flex items-center gap-3"><input type="checkbox" checked={prefs.emailEnabled} disabled={!emailVerified} onChange={e=>setPrefs(p=>({...p,emailEnabled:e.target.checked}))} />{t.email}</label>
   <label className="mt-4 flex items-center gap-3"><input type="checkbox" checked={prefs.pushEnabled} onChange={e=>setPrefs(p=>({...p,pushEnabled:e.target.checked}))}/>
    {lang==='en'?'Allow device push alerts for strong matches':lang==='fa'?'اجازه اعلان در دستگاه برای فرصت‌های مناسب':'په وسیله کې د مناسب فرصت خبرتیا اجازه'}</label>
   <label className="mt-4 block text-sm font-semibold">{t.freq}<select className={'mt-2 ms-2 '+input} value={prefs.emailFrequency} disabled={!prefs.emailEnabled} onChange={e=>setPrefs(p=>({...p,emailFrequency:e.target.value as Preference['emailFrequency']}))}><option value="daily">{t.daily}</option><option value="weekly">{t.weekly}</option></select></label>
   <button className="mt-5 rounded-lg bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50" disabled={busy||loading} onClick={()=>void save()}>{t.save}</button>
  </section>
  <ApplicantChannels lang={lang} pushConsent={savedPushConsent&&prefs.pushEnabled} onChange={()=>void refresh()} />
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{t.inbox} ({unread} {t.unread})</h2><div className="flex gap-2"><Link className="rounded-lg border px-3 py-2 text-sm" href={'/'+lang+'/portal/matcher'}>{t.back}</Link><button className="rounded-lg border px-3 py-2 text-sm" onClick={()=>void read()} disabled={!unread}>{t.markAll}</button></div></div>
  {status&&<p role="status" className="my-3 rounded-lg border p-3 text-sm">{status}</p>}
  {!loading&&!items.length&&<p className="my-5 rounded-xl border p-5">{t.empty}</p>}
  <ul className="my-5 space-y-3">{items.map(item=>{
   const title=(item.titleI18n&&typeof item.titleI18n[lang]==='string'&&item.titleI18n[lang])||item.title;
   return <li key={item.id} className={'rounded-xl border p-4 '+(!item.readAt?'border-primary':'')}>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{title}</p>{!item.readAt&&<button type="button" className="text-xs underline" onClick={()=>void read(item.id)}>{t.markAll}</button>}</div>
    <p className="mt-2 text-sm text-muted-foreground">{t.search}: {item.searchName} · {item.organization||''} · {new Date(item.createdAt).toLocaleDateString(lang==='fa'?'fa-AF':lang==='ps'?'ps-AF':'en-GB')}</p>
    <button className="mt-3 rounded-lg border px-3 py-2 text-sm" onClick={()=>void archive(item.id)}>{lang==='en'?'Archive':lang==='fa'?'بایگانی':'زېرمه'}</button>
    {item.available?<Link className="mt-3 inline-block rounded-lg border px-3 py-2 text-sm" href={'/'+lang+'/opportunities/'+encodeURIComponent(item.slug)} onClick={()=>void read(item.id)}>{t.open}</Link>:<p className="mt-3 text-sm text-muted-foreground">{t.unavailable}</p>}
   </li>;
  })}</ul>
  {next&&<button className="rounded-lg border px-4 py-2" onClick={()=>void more()}>{t.load}</button>}
 </main>;
}
