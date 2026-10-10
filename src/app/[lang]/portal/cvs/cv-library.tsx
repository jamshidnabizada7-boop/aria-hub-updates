'use client';
import {CVExtractionReview} from './cv-extraction-review';
import {useCallback,useEffect,useState} from 'react';
type Lang='en'|'fa'|'ps';
type Item={id:string;originalName:string;mimeType:string;byteSize:number;status:string;createdAt:string;reviewedAt:string|null;processingError:string|null};
const dict={
 en:{title:'My CV library',intro:'Upload a PDF, Word document or photo. Files are private and visible only to your account.',upload:'Upload CV',select:'Choose a file',camera:'Take photo',empty:'No CVs yet.',download:'Download',remove:'Delete permanently',confirm:'Permanently delete this private CV?',busy:'Working…',refresh:'Refresh',error:'Request failed. Try again.',disabled:'Private CV storage is not enabled on this environment.',uploaded:'Upload completed. Text extraction becomes available after the private CV processor is configured; always review its suggestions before saving them.',status:'Processing state',supported:'PDF, DOCX, JPG, PNG and WebP · up to 8 MB · max 10 files'},
 fa:{title:'کتابخانه سی‌وی من',intro:'سی‌وی را به شکل پی‌دی‌اف، ورد یا عکس آپلود کنید. فایل‌ها خصوصی هستند.',upload:'آپلود سی‌وی',select:'انتخاب فایل',camera:'گرفتن عکس',empty:'هنوز سی‌وی ندارید.',download:'دریافت فایل',remove:'حذف دائمی',confirm:'این سی‌وی خصوصی برای همیشه حذف شود؟',busy:'در حال اجرا…',refresh:'تازه‌سازی',error:'درخواست ناکام شد. دوباره تلاش کنید.',disabled:'ذخیره‌سازی خصوصی سی‌وی در این محیط فعال نیست.',uploaded:'آپلود تکمیل شد. برای استخراج معلومات، پردازشگر خصوصی باید فعال باشد. پیش از ذخیره، تمام پیشنهادها را بازبینی کنید.',status:'وضعیت پردازش',supported:'PDF، DOCX، JPG، PNG و WebP · حداکثر ۸ مگابایت · ۱۰ فایل'},
 ps:{title:'زما د سي وي کتابتون',intro:'خپل سي وي د PDF، Word یا انځور په بڼه پورته کړئ. فایلونه یوازې ستاسو لپاره دي.',upload:'سي وي پورته کول',select:'فایل غوره کړئ',camera:'انځور واخلئ',empty:'تر اوسه سي وي نشته.',download:'فایل ښکته کړئ',remove:'تلپاتې ړنګول',confirm:'دا شخصي سي وي تل لپاره ړنګ کړئ؟',busy:'روان دی…',refresh:'تازه کول',error:'غوښتنه ناکامه شوه. بیا هڅه وکړئ.',disabled:'د سي وي شخصي ذخیره په دې چاپېریال کې فعاله نه ده.',uploaded:'فایل خوندي شو. د متن د استخراج لپاره شخصي کارګر باید فعال وي. وړاندیز شوي معلومات پخپله تایید کړئ.',status:'د پروسس حالت',supported:'PDF، DOCX، JPG، PNG او WebP · تر ۸ MB · لس فایلونه'}
};
export function CVLibrary({lang}:{lang:Lang}){
 const t=dict[lang];const [items,setItems]=useState<Item[]>([]),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[reviewId,setReviewId]=useState<string|null>(null);
 const [available,setAvailable]=useState(false);
 const statusLabels={en:{storing:'Saving securely',uploaded:'Queued for extraction',processing:'Reading your CV',review:'Ready for your review',reviewed:'Reviewed',failed:'Unable to read this file',deleting:'Deleting'},fa:{storing:'ذخیره امن',uploaded:'در صف استخراج',processing:'در حال خواندن سی‌وی',review:'آماده بازبینی شما',reviewed:'بازبینی‌شده',failed:'خواندن فایل ممکن نشد',deleting:'در حال حذف'},ps:{storing:'خوندي کول',uploaded:'د استخراج په کتار کې',processing:'سي وي لوستل کېږي',review:'ستاسو تایید ته چمتو',reviewed:'تایید شوی',failed:'فایل ونه لوستل شو',deleting:'ړنګېږي'}}[lang];
 const readyText={en:'Your file is stored privately. Extraction will appear here automatically. Review the suggestions before saving them.',fa:'فایل شما به صورت خصوصی ذخیره شد. معلومات استخراج‌شده خودکار در اینجا نمایش داده می‌شود؛ پیش از ذخیره بازبینی کنید.',ps:'ستاسو فایل په شخصي ډول خوندي شو. استخراج شوي معلومات به دلته ښکاره شي؛ د خوندي کولو مخکې یې تایید کړئ.'}[lang];
 const refresh=useCallback(async(silent=false)=>{try{const r=await fetch('/api/applicant/cvs',{cache:'no-store',credentials:'same-origin'});const d=await r.json();if(!r.ok)throw Error(d.error);setAvailable(true);setItems(d.items||[]);if(!silent)setMessage('');}catch(e){setAvailable(false);if(!silent)setMessage(e instanceof Error&&e.message==='unavailable_or_unauthorized'?t.disabled:t.error);}finally{setLoading(false);}},[t.disabled,t.error]);
 useEffect(()=>{void refresh();},[refresh]);
 const processing=items.some(item=>['uploaded','processing','storing'].includes(item.status));
 useEffect(()=>{if(!processing)return;const timer=setInterval(()=>void refresh(true),15000);return()=>clearInterval(timer);},[processing,refresh]);
 async function upload(e:React.FormEvent){e.preventDefault();if(!file)return;setBusy(true);setMessage('');
 try{const fd=new FormData();fd.append('file',file);const r=await fetch('/api/applicant/cvs',{method:'POST',body:fd});const d=await r.json();if(!r.ok){setMessage(d.error==='already_uploaded'?(lang==='en'?'This CV is already in your library.':lang==='fa'?'این سی‌وی در کتابخانه شما موجود است.':'دا سي وي ستاسو په کتابتون کې شته.'):t.error);return;}setFile(null);await refresh();setMessage(readyText);}catch{setMessage(t.error);}finally{setBusy(false);}}
 async function remove(id:string){if(!window.confirm(t.confirm))return;setBusy(true);try{const r=await fetch('/api/applicant/cvs/'+encodeURIComponent(id),{method:'DELETE'});if(!r.ok){setMessage(t.error);return;}await refresh();}catch{setMessage(t.error);}finally{setBusy(false);}}
 return <section className="mx-auto max-w-4xl px-4 py-12" dir={lang==='en'?'ltr':'rtl'}>
 <h1 className="text-3xl font-bold">{t.title}</h1><p className="mt-3 text-muted-foreground">{t.intro}</p>
 <form onSubmit={upload} className="my-7 space-y-3 rounded-xl border bg-card p-5">
  <fieldset disabled={busy||loading||!available} className="space-y-3 disabled:opacity-60">
  <label htmlFor="cv-file" className="block text-sm font-semibold">{t.select}</label>
  <input id="cv-file" type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="block w-full rounded-lg border p-3 text-sm" />
  <p className="text-xs text-muted-foreground">{t.supported}</p>
  <button type="submit" disabled={!file||busy} className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-40">{busy?t.busy:t.upload}</button>
  </fieldset>
 </form>
 {message&&<p role="status" className="my-4 rounded-lg border p-3 text-sm">{message}</p>}
 <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">{t.title}</h2><button type="button" onClick={()=>void refresh()} className="rounded-lg border px-3 py-2 text-sm">{t.refresh}</button></div>
 {!loading&&!items.length&&<p className="mt-5 text-muted-foreground">{t.empty}</p>}
 <ul className="mt-4 space-y-3">{items.map(item=><li key={item.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-4">
   <div className="min-w-0"><p className="break-all font-semibold">{item.originalName}</p><p className="text-xs text-muted-foreground">{(item.byteSize/1024/1024).toFixed(2)} MB · {t.status}: {statusLabels[item.status as keyof typeof statusLabels]||item.status}</p></div>
   <div className="flex gap-2">{item.status==='review'&&<button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>setReviewId(reviewId===item.id?null:item.id)}>{lang==='fa'?'بازبینی استخراج':lang==='ps'?'استخراج تاییدول':'Review extraction'}</button>}{!['storing','deleting'].includes(item.status)&&<a href={'/api/applicant/cvs/'+encodeURIComponent(item.id)} className="rounded-lg border px-3 py-2 text-sm">{t.download}</a>}<button type="button" disabled={busy} onClick={()=>void remove(item.id)} className="rounded-lg border px-3 py-2 text-sm text-destructive">{item.status==='deleting'?(lang==='en'?'Retry deletion':lang==='fa'?'تلاش دوباره برای حذف':'د ړنګولو بیا هڅه'):t.remove}</button></div></div>
  {item.processingError&&<p className="mt-2 text-xs text-destructive">{lang==='en'?'Try a clearer scan or a PDF with selectable text.':lang==='fa'?'عکس واضح‌تر یا پی‌دی‌اف با متن قابل انتخاب را امتحان کنید.':'روښانه انځور یا د ټاکل کېدونکي متن PDF وکاروئ.'}</p>}
  {reviewId===item.id&&item.status==='review'&&<CVExtractionReview id={item.id} lang={lang} onSaved={()=>void refresh()}/>}
  </li>)}</ul>
 </section>;
}
