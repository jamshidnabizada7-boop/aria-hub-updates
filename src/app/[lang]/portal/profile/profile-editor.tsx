'use client';
import { useState } from 'react';
type Lang='en'|'fa'|'ps';
export function ProfileEditor({lang,initial}:{lang:Lang;initial:{name:string;headline:string;residence:string;preferredLocale:string}}){
 const [data,setData]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const t={en:['Personal profile','Full name','Professional headline','Current city/country','Save profile','Saved','Unable to save'],fa:['مشخصات شخصی','نام کامل','عنوان مسلکی','شهر/کشور محل اقامت','ذخیره مشخصات','ذخیره شد','ذخیره موفق نشد'],ps:['شخصي معلومات','بشپړ نوم','مسلکي عنوان','د استوګنې ښار/هېواد','معلومات خوندي کړئ','خوندي شول','خوندي نه شول']}[lang];
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const res=await fetch('/api/applicant/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});setMessage(res.ok?t[5]:t[6]);}catch{setMessage(t[6]);}finally{setBusy(false);}}
 return <section className="mt-8 max-w-xl rounded-xl border bg-card p-5"><h2 className="text-xl font-bold">{t[0]}</h2><form onSubmit={save} className="mt-4 space-y-4">
 {(['name','headline','residence'] as const).map((key,i)=><label key={key} className="block text-sm">{t[i+1]}<input className="mt-1 w-full rounded-lg border bg-background p-3" maxLength={key==='headline'?160:120} required={key==='name'} value={data[key]} onChange={e=>setData({...data,[key]:e.target.value})}/></label>)}
 <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={busy}>{t[4]}</button></form><p role="status" className="mt-3 text-sm">{message}</p></section>;
}