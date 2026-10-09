'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {CVDraft,CVOutputLang} from '../types';

type Item={draftId:string;revision:number;updatedAt:string};
const copy={
 en:{title:'Private cloud CVs',enable:'Connect my private account drafts',intro:'Optional: save your current CV securely to your account and open it on another device. Local drafts remain on this device unless you choose to sync them.',save:'Save this CV to cloud & enable auto-sync',load:'Open on this device',delete:'Delete cloud copy',none:'No cloud versions yet.',disabled:'Cloud CV sync is disabled or you must sign in and verify your email.',failure:'Unable to access cloud CVs.',saved:'Cloud copy saved.',conflict:'A cloud copy already exists or has changed. Open the cloud version first, or duplicate your local CV before syncing.',confirm:'Opening this version replaces your local draft with the same ID. Continue?',delConfirm:'Delete the cloud copy? Your local draft is unaffected.',stop:'Stop auto-sync',auto:'Auto-sync enabled for this CV',refresh:'Refresh cloud list'},
 fa:{title:'سی‌وی‌های خصوصی ابری',enable:'اتصال سی‌وی‌ها به حساب من',intro:'اختیاری: سی‌وی خود را به‌صورت خصوصی ذخیره کرده و در دستگاه دیگر باز کنید. بدون اجازه شما، فایل‌های محلی ارسال نمی‌شوند.',save:'ذخیره در حساب و فعال‌سازی همگام‌سازی',load:'باز کردن در این دستگاه',delete:'حذف نسخه ابری',none:'هنوز نسخه ابری ندارید.',disabled:'همگام‌سازی فعال نیست یا باید وارد حساب تأییدشده شوید.',failure:'دسترسی به سی‌وی‌های ابری ممکن نشد.',saved:'سی‌وی در حساب ذخیره شد.',conflict:'نسخه ابری تغییر کرده است. ابتدا آن را باز کنید یا نسخه محلی را تکثیر کنید.',confirm:'این عمل نسخه محلی با شناسه یکسان را جایگزین می‌کند. ادامه می‌دهید؟',delConfirm:'نسخه ابری حذف شود؟ نسخه محلی حفظ می‌شود.',stop:'توقف همگام‌سازی',auto:'همگام‌سازی این سی‌وی فعال است',refresh:'تازه‌سازی'},
 ps:{title:'شخصي ابري سي وي',enable:'زما حساب ته د سي وي نښلول',intro:'اختیاري: سي وي په خپل شخصي حساب کې وساتئ او په بل وسیله يې خلاص کړئ. محلي سي وي بې اجازې نه لېږل کېږي.',save:'ابري حساب ته خوندي او همغږي فعالول',load:'پر دې وسیله پرانيستل',delete:'ابري نسخه ړنګول',none:'تراوسه ابري نسخه نشته.',disabled:'ابري همغږي فعاله نه ده، یا تایید شوي حساب ته ننوتل پکار دي.',failure:'ابري سي وي ته لاسرسی نشته.',saved:'سي وي حساب ته خوندي شو.',conflict:'ابري نسخه بدله شوې ده. لومړی هماغه پرانيزئ یا محلي سي وي کاپي کړئ.',confirm:'ستاسو ورته محلي نسخه بدلېږي. دوام ورکړئ؟',delConfirm:'ابري نسخه ړنګه شي؟ محلي نسخه خوندي پاتې کېږي.',stop:'همغږي بندول',auto:'د دې سي وي همغږي فعاله ده',refresh:'تازه کول'}
} as const;
export function CloudCVSync({lang,activeDraft,onImport}:{lang:CVOutputLang;activeDraft:CVDraft;onImport:(draft:CVDraft)=>boolean}){
 const t=copy[lang];
 const [connected,setConnected]=useState(false),[items,setItems]=useState<Item[]>([]);
 const [armed,setArmed]=useState<string|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const revisions=useRef<Record<string,number>>({});
 const inFlight=useRef(false);
 const refresh=useCallback(async()=>{
  const response=await fetch('/api/applicant/cv-drafts',{cache:'no-store'});
  if(!response.ok)throw Error(response.status===401?t.disabled:t.failure);
  const body=await response.json();
  setItems(body.items||[]);
 },[t.disabled,t.failure]);
 async function connect(){
  setBusy(true);setMessage('');
  try{await refresh();setConnected(true);}catch(e){setMessage(e instanceof Error?e.message:t.failure);}
  finally{setBusy(false);}
 }
 async function save(draft:CVDraft,automatic=false){
  if(inFlight.current)return;
  inFlight.current=true;
  if(!automatic)setBusy(true);
  try{
   // Do not treat the revision shown by a remote list as an edit lease.
   // A device must first explicitly load an existing remote copy.
   const revision=revisions.current[draft.id]??0;
   if(revision===0&&items.some(i=>i.draftId===draft.id))throw Error(t.conflict);
   const response=await fetch('/api/applicant/cv-drafts/'+encodeURIComponent(draft.id),{
    method:'PUT',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({draft,expectedRevision:revision})
   });
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(response.status===409?t.conflict:body.error||t.failure);
   revisions.current[draft.id]=body.revision;
   setArmed(draft.id);
   setMessage(t.saved);
   await refresh();
  }catch(e){setArmed(null);setMessage(e instanceof Error?e.message:t.failure);}
  finally{inFlight.current=false;setBusy(false);}
 }
 async function open(item:Item){
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/applicant/cv-drafts/'+encodeURIComponent(item.draftId),{cache:'no-store'});
   if(!response.ok)throw Error(t.failure);
   const body=await response.json();
   if(body.draft.id===activeDraft.id&&JSON.stringify(body.draft)!==JSON.stringify(activeDraft)&&!window.confirm(t.confirm))return;
   if(!onImport(body.draft))throw Error(t.failure);
   revisions.current[item.draftId]=body.revision;
   setArmed(item.draftId);setMessage(t.auto);
  }catch(e){setMessage(e instanceof Error?e.message:t.failure);}
  finally{setBusy(false);}
 }
 async function remove(item:Item){
  if(!window.confirm(t.delConfirm))return;
  setBusy(true);
  try{
   const r=await fetch('/api/applicant/cv-drafts/'+encodeURIComponent(item.draftId),{
    method:'DELETE',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({expectedRevision:item.revision})
   });
   if(!r.ok)throw Error(t.conflict);
   delete revisions.current[item.draftId];
   if(armed===item.draftId)setArmed(null);
   await refresh();setMessage('');
  }catch(e){setMessage(e instanceof Error?e.message:t.failure);}
  finally{setBusy(false);}
 }
 useEffect(()=>{
  if(!connected||armed!==activeDraft.id)return;
  const timer=window.setTimeout(()=>{void save(activeDraft,true);},1200);
  return ()=>window.clearTimeout(timer);
  // Only trigger when CV data actually changes; revision/list refreshing must
  // never create another outbound write.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[activeDraft.updatedAt,armed,connected]);
 return <section className="my-4 rounded-xl border bg-card p-4" dir={lang==='en'?'ltr':'rtl'}>
  <h2 className="font-bold">{t.title}</h2><p className="mt-2 text-sm text-muted-foreground">{t.intro}</p>
  {!connected?<button type="button" disabled={busy} onClick={()=>void connect()} className="mt-3 rounded-lg border px-4 py-2 text-sm">{t.enable}</button>:
   <>
    <div className="mt-3 flex flex-wrap gap-2">
     <button type="button" disabled={busy} onClick={()=>void save(activeDraft)} className="rounded-lg border px-3 py-2 text-sm">{t.save}</button>
     <button type="button" disabled={busy} onClick={()=>{setArmed(null);setMessage('');}} className="rounded-lg border px-3 py-2 text-sm">{t.stop}</button>
     <button type="button" disabled={busy} onClick={()=>void refresh().catch(()=>setMessage(t.failure))} className="rounded-lg border px-3 py-2 text-sm">{t.refresh}</button>
    </div>
    {armed===activeDraft.id&&<p className="mt-2 text-sm">{t.auto}</p>}
    {!items.length&&<p className="mt-3 text-sm text-muted-foreground">{t.none}</p>}
    <ul className="mt-3 space-y-2">{items.map(x=><li key={x.draftId} className="flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm">
     <span className="min-w-0 flex-1 break-all">{x.draftId} · {new Date(x.updatedAt).toLocaleDateString(lang==='en'?'en-US':lang==='fa'?'fa-AF':'ps-AF')}</span>
     <button type="button" disabled={busy} onClick={()=>void open(x)} className="rounded border px-2 py-1">{t.load}</button>
     <button type="button" disabled={busy} onClick={()=>void remove(x)} className="rounded border px-2 py-1">{t.delete}</button>
    </li>)}</ul>
   </>
  }
  {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
 </section>;
}
