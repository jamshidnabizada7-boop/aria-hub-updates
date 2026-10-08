'use client';
import {useEffect,useState} from 'react';
type Lang='en'|'fa'|'ps';
const text={
 en:{push:'Browser and mobile web push',enroll:'Enable notifications on this device',unenroll:'Remove this device',unavailable:'Push subscriptions are not yet enabled by ARIA HUB.',saved:'This device is registered. Manage your notification consent above.',wa:'WhatsApp alerts',phone:'WhatsApp number in international format',request:'Request verification code',confirm:'Confirm code and opt in',code:'Six-digit verification code',cancel:'Remove WhatsApp consent',verified:'Number verified; WhatsApp messages only after provider activation.',waiting:'Check your WhatsApp for the verification code.',disabled:'WhatsApp verification is not yet enabled by ARIA HUB.',error:'Request could not be completed. Check consent, account verification, and provider status.'},
 fa:{push:'اعلان مرورگر و موبایل',enroll:'فعال‌سازی اعلان در این دستگاه',unenroll:'حذف این دستگاه',unavailable:'اعلان موبایل هنوز از طرف آریا هاب فعال نشده است.',saved:'این دستگاه ثبت شد. رضایت را از تنظیمات بالا مدیریت کنید.',wa:'اعلان واتس‌اپ',phone:'شماره واتس‌اپ با پیش‌شماره بین‌المللی',request:'درخواست کود تأیید',confirm:'تأیید کود و فعال‌سازی',code:'کود شش‌رقمی',cancel:'لغو رضایت واتس‌اپ',verified:'شماره تأیید شد؛ ارسال فقط پس از فعال شدن ارائه‌دهنده است.',waiting:'کود تأیید را در واتس‌اپ بررسی کنید.',disabled:'تأیید واتس‌اپ هنوز فعال نشده است.',error:'درخواست انجام نشد. رضایت و وضعیت حساب و خدمات را بررسی کنید.'},
 ps:{push:'د براوزر او موبایل خبرتیاوې',enroll:'په دې وسیله خبرتیاوې فعالول',unenroll:'دا وسیله لرې کول',unavailable:'پش خبرتیاوې لا نه دي فعالې شوې.',saved:'دا وسیله ثبت شوه. اجازه پورته تنظیم کړئ.',wa:'د واټس‌اپ خبرتیاوې',phone:'د هېواد کوډ سره د واټس‌اپ شمېره',request:'د تایید کوډ غوښتنه',confirm:'کوډ تایید او اجازه ورکول',code:'شپږ رقمي کوډ',cancel:'د واټس‌اپ اجازه لغوه کول',verified:'شمېره تایید شوه؛ لېږل یوازې د خدماتو تر فعالېدو وروسته کېږي.',waiting:'د تایید کوډ په واټس‌اپ کې وګورئ.',disabled:'د واټس‌اپ تایید خدمت لا نشته.',error:'غوښتنه ترسره نه شوه. خپل حساب، اجازه او خدمت وګورئ.'}
} as const;
function publicKeyBytes(key:string){
 const padding='='.repeat((4-key.length%4)%4);
 const raw=atob((key+padding).replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export function ApplicantChannels({lang,pushConsent,onChange}:{lang:Lang;pushConsent:boolean;onChange:()=>void}){
 const t=text[lang];
 const [availablePush,setAvailablePush]=useState(false),[pushKey,setPushKey]=useState(''),[pushCount,setPushCount]=useState(0);
 const [waAvailable,setWaAvailable]=useState(false),[waVerified,setWaVerified]=useState(false);
 const [phone,setPhone]=useState(''),[code,setCode]=useState(''),[pending,setPending]=useState(false);
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(){
  const [p,w]=await Promise.all([fetch('/api/applicant/push-subscriptions',{cache:'no-store'}),
   fetch('/api/applicant/whatsapp-contact',{cache:'no-store'})]);
  if(p.ok){const d=await p.json();setAvailablePush(Boolean(d.available));setPushKey(d.publicKey||'');setPushCount(Number(d.activeSubscriptions)||0);}
  if(w.ok){const d=await w.json();setWaAvailable(Boolean(d.available));setWaVerified(Boolean(d.verified));}
 }
 useEffect(()=>{void refresh().catch(()=>{});},[]);
 async function enroll(){
  setBusy(true);setStatus('');
  try{
   if(!pushConsent)throw Error('Save push consent above before registering this device.');
   if(!('serviceWorker' in navigator)||!('PushManager' in window))throw Error('Web push is not supported on this device.');
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('Notification permission was not granted.');
   const worker=await navigator.serviceWorker.register('/applicant-push-sw.js',{scope:'/'});
   const existing=await worker.pushManager.getSubscription();
   const sub=existing||await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKeyBytes(pushKey)});
   const result=await fetch('/api/applicant/push-subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sub.toJSON())});
   if(!result.ok)throw Error(t.error);
   await refresh();setStatus(t.saved);
  }catch(e){setStatus(e instanceof Error?e.message:t.error);}
  finally{setBusy(false);}
 }
 async function unenroll(){
  setBusy(true);setStatus('');
  try{
   const reg=await navigator.serviceWorker.getRegistration('/');
   const sub=await reg?.pushManager.getSubscription();
   if(sub){
    const r=await fetch('/api/applicant/push-subscriptions',{method:'DELETE',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({endpoint:sub.endpoint})});if(!r.ok)throw Error(t.error);
    await sub.unsubscribe();
   }
   await refresh();
  }catch{setStatus(t.error);}finally{setBusy(false);}
 }
 async function whatsApp(action:'request'|'confirm'|'delete'){
  setBusy(true);setStatus('');
  try{
   const r=await fetch('/api/applicant/whatsapp-contact',{method:action==='delete'?'DELETE':'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='request'?{action,phone,consent:true}:action==='confirm'?{action,code}:{})});
   if(!r.ok)throw Error(t.error);
   if(action==='request'){setPending(true);setStatus(t.waiting);}
   else {setPending(false);setCode('');setPhone('');setStatus(action==='confirm'?t.verified:'');onChange();}
   await refresh();
  }catch{setStatus(t.error);}finally{setBusy(false);}
 }
 return <div className="space-y-4">
  <section className="rounded-xl border bg-card p-4"><h3 className="font-semibold">{t.push}</h3>
   <p className="mt-1 text-sm text-muted-foreground">{availablePush?'Permission is controlled by your device and can be revoked.':t.unavailable}</p>
   {availablePush&&<div className="mt-3 flex flex-wrap gap-2">
    <button type="button" className="rounded-lg border px-3 py-2" disabled={busy||!pushConsent} onClick={()=>void enroll()}>{t.enroll}</button>
    {pushCount>0&&<button type="button" className="rounded-lg border px-3 py-2" disabled={busy} onClick={()=>void unenroll()}>{t.unenroll}</button>}
   </div>}
  </section>
  <section className="rounded-xl border bg-card p-4"><h3 className="font-semibold">{t.wa}</h3>
   {!waAvailable?<p className="mt-1 text-sm text-muted-foreground">{t.disabled}</p>:
    waVerified?<><p className="mt-1 text-sm">{t.verified}</p><button className="mt-2 rounded-lg border px-3 py-2" disabled={busy} onClick={()=>void whatsApp('delete')}>{t.cancel}</button></>:
    <div className="mt-3 space-y-2">
     {!pending?<><label className="block text-sm">{t.phone}
      <input type="tel" autoComplete="tel" dir="ltr" className="mt-1 w-full rounded-lg border bg-background p-2" placeholder="+93700123456"
       value={phone} onChange={e=>setPhone(e.target.value)} maxLength={16}/></label>
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={false} readOnly className="hidden" aria-hidden="true"/>By requesting a code, I consent to receiving a single verification template on this number.</label>
      <button type="button" className="rounded-lg border px-3 py-2" disabled={busy||!/^\+[1-9]\d{7,14}$/.test(phone)} onClick={()=>void whatsApp('request')}>{t.request}</button></>:
     <><label className="block text-sm">{t.code}<input dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={e=>setCode(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2"/></label>
      <button type="button" className="rounded-lg border px-3 py-2" disabled={busy||!/^\d{6}$/.test(code)} onClick={()=>void whatsApp('confirm')}>{t.confirm}</button></>}
    </div>}
  </section>
  {status&&<p role="status" className="rounded-lg border p-3 text-sm">{status}</p>}
 </div>;
}
