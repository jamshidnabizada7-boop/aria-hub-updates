'use client';
import {useCallback,useEffect,useState} from 'react';
type Lang='en'|'fa'|'ps';
type Field='fullName'|'headline'|'education'|'skills'|'languages'|'educationHistory'|'workHistory'|'certifications';
const fields:Field[]=['fullName','headline','education','skills','languages','educationHistory','workHistory','certifications'];
type Proposal={version:1;method:string;language:string;fields:Partial<Record<Field,string|string[]>>;evidence:Record<string,{snippet:string;confidence:number}>;requiresUserReview:true;extractedAt:string};
type Data={document:{id:string;originalName:string;status:string;sourceSha256:string;reviewedAt:string|null;processingError:string|null;proposal:Proposal|null}};
const translations={
 en:{title:'Review CV extraction',intro:'These are suggestions from your document, not verified facts. Select the information you confirm, correct any mistake, and approve explicitly.',select:'I verify this information',confirm:'Approve selected facts',replace:'Replace my existing verified values for the selected fields',preserve:'Existing verified facts are preserved by default.',empty:'Extraction is not ready. Refresh after the private OCR worker runs.',done:'Reviewed and saved to your career profile.',error:'Unable to approve this review.',loading:'Loading suggestions…',none:'Select at least one field.',names:['Full name','Headline','Education level','Skills','Languages','Education details','Work history excerpts','Certificates'],source:'Source text',confidence:'Confidence (not a certainty score)',check:'I have checked the selected facts against my real CV. Nothing will be submitted to an employer.',work:'Work history is quoted text until you correct and confirm it.'},
 fa:{title:'بازبینی اطلاعات استخراج‌شده از سی‌وی',intro:'این‌ها پیشنهادهای استخراج‌شده از سند شما است، نه حقایق تأییدشده. معلومات درست را انتخاب و اصلاح کنید.',select:'این معلومات را تأیید می‌کنم',confirm:'تأیید و ذخیره معلومات انتخاب‌شده',replace:'معلومات تأییدشده قبلی را برای بخش‌های انتخاب‌شده جایگزین کن',preserve:'معلومات تأییدشده قبلی به‌طور پیش‌فرض حفظ می‌شوند.',empty:'استخراج آماده نیست. پس از اجرای پردازشگر OCR خصوصی دوباره بررسی کنید.',done:'معلومات بررسی و در مشخصات مسلکی شما ذخیره شد.',error:'ذخیره بازبینی ناکام شد.',loading:'در حال دریافت پیشنهادها…',none:'دست‌کم یک بخش را انتخاب کنید.',names:['نام کامل','عنوان مسلکی','مقطع تحصیلی','مهارت‌ها','زبان‌ها','جزئیات تحصیل','بخش‌هایی از تجربه کاری','تصدیق‌نامه‌ها'],source:'متن منبع',confidence:'میزان اطمینان (نه قطعیت)',check:'من معلومات انتخاب‌شده را با سی‌وی واقعی خود بررسی کرده‌ام. هیچ درخواستی به کارفرما ارسال نمی‌شود.',work:'تجارب کاری به‌صورت متن نقل‌شده است تا خودتان بررسی و تأیید کنید.'},
 ps:{title:'له سي وي څخه ایستل شوي معلومات تایید کړئ',intro:'دا ستاسو له سند څخه وړاندیز شوي معلومات دي، تایید شوي حقیقتونه نه دي. سم معلومات وټاکئ او اصلاح کړئ.',select:'دا معلومات تاییدوم',confirm:'ټاکل شوي معلومات تایید او خوندي کړئ',replace:'زما مخکیني تایید شوي معلومات بدل کړئ',preserve:'مخکیني تایید شوي معلومات په اصل کې ساتل کېږي.',empty:'استخراج چمتو نه دی. د شخصي OCR کارګر له چلولو وروسته تازه کړئ.',done:'معلومات ستاسو مسلکي پروفایل ته خوندي شول.',error:'تایید خوندي نشو.',loading:'وړاندیزونه ترلاسه کېږي…',none:'لږ تر لږه یو برخه وټاکئ.',names:['بشپړ نوم','مسلکي عنوان','د زده کړې کچه','مهارتونه','ژبې','د زده کړو جزئیات','د کار تجربې برخې','سندونه'],source:'اصلي متن',confidence:'د باور کچه (قطعي نه ده)',check:'ما ټاکل شوي معلومات له خپل رښتیني سي وي سره پرتله کړي دي. کار ورکوونکي ته څه نه لېږل کېږي.',work:'کاري تجربه تر تایید مخکې یوازې د سند د متن ټوټه ده.'}
} as const;
const LIMIT:Record<Field,number>={fullName:120,headline:160,education:30,skills:60,languages:60,educationHistory:240,workHistory:240,certifications:200};
const MULTI=new Set<Field>(['skills','languages','educationHistory','workHistory','certifications']);
export function CVExtractionReview({id,lang,onSaved}:{id:string;lang:Lang;onSaved:()=>void}){
 const t=translations[lang];
 const [data,setData]=useState<Data|null>(null),[edits,setEdits]=useState<Record<string,string>>({});
 const [selected,setSelected]=useState<Field[]>([]),[replace,setReplace]=useState(false),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const refresh=useCallback(async()=>{
  const r=await fetch('/api/applicant/cvs/'+encodeURIComponent(id)+'/review',{cache:'no-store'});
  if(!r.ok)throw Error('failed');
  const d:Data=await r.json();setData(d);
  const next:Record<string,string>={};
  for(const field of fields){const v=d.document.proposal?.fields[field];if(v!==undefined)next[field]=Array.isArray(v)?v.join('\n'):v;}
  setEdits(next);
 },[id]);
 useEffect(()=>{void refresh().catch(()=>setStatus(t.error));},[refresh,t.error]);
 async function submit(){
  if(!data?.document.proposal||!selected.length||!confirmed){setStatus(t.none);return;}
  setBusy(true);setStatus('');
  const values:Record<string,unknown>={};
  for(const field of selected){
   const raw=(edits[field]||'').trim();
   if(!raw)continue;
   values[field]=MULTI.has(field)?raw.split(/\n|[,،]/).map(x=>x.trim()).filter(Boolean).slice(0,field==='skills'?25:field==='languages'?15:field==='workHistory'?10:8).map(x=>x.slice(0,LIMIT[field])):raw.slice(0,LIMIT[field]);
  }
  try{
   const r=await fetch('/api/applicant/cvs/'+encodeURIComponent(id)+'/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    sourceSha256:data.document.sourceSha256,acceptedFields:selected,edits:values,replaceExisting:replace
   })});
   if(!r.ok){const body=await r.json();throw Error(body.error||'failed');}
   setStatus(t.done);await refresh();onSaved();
  }catch(e){setStatus(e instanceof Error?e.message:t.error);}finally{setBusy(false);}
 }
 if(!data)return <p role="status">{status||t.loading}</p>;
 if(!data.document.proposal||data.document.status!=='review')return <p role="status" className="rounded-lg border p-4">{t.empty}</p>;
 const proposed=data.document.proposal;
 return <section className="mt-5 rounded-xl border bg-card p-5" dir={lang==='en'?'ltr':'rtl'}>
  <h3 className="text-lg font-bold">{t.title}</h3><p className="mt-2 text-sm text-muted-foreground">{t.intro}</p>
  {data.document.reviewedAt&&<p className="mt-2 rounded-lg border p-3 text-sm">{t.done}</p>}
  <div className="mt-4 space-y-4">{fields.map((field,i)=>{
   const value=proposed.fields[field];if(value===undefined)return null;
   const isSelected=selected.includes(field),suggested=proposed.evidence?.[field];
   return <div key={field} className="rounded-lg border p-4">
    <label className="flex items-center gap-3 font-semibold"><input type="checkbox" disabled={Boolean(data.document.reviewedAt)} checked={isSelected} onChange={e=>setSelected(old=>e.target.checked?[...old,field]:old.filter(x=>x!==field))}/>{t.names[i]} — {t.select}</label>
    {field==='education'?<select className="mt-3 w-full rounded-lg border bg-background p-2" value={edits[field]||''} disabled={!isSelected} onChange={e=>setEdits(old=>({...old,[field]:e.target.value}))}>{['high_school','bachelors','masters','phd','other'].map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}</select>:
     <textarea className="mt-3 w-full rounded-lg border bg-background p-3 text-sm" value={edits[field]||''} rows={MULTI.has(field)?3:2} maxLength={MULTI.has(field)?1800:LIMIT[field]} disabled={!isSelected} onChange={e=>setEdits(old=>({...old,[field]:e.target.value}))}/>}
    {suggested&&<div className="mt-2 text-xs text-muted-foreground"><strong>{t.source}:</strong> <span className="break-words">{suggested.snippet}</span><p>{t.confidence}: {Math.round(suggested.confidence*100)}%</p></div>}
   </div>;
  })}</div>
  <p className="mt-4 text-xs text-muted-foreground">{t.work} {t.preserve}</p>
  <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)} disabled={Boolean(data.document.reviewedAt)}/>{t.replace}</label>
  <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={Boolean(data.document.reviewedAt)}/>{t.check}</label>
  <button className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={busy||!selected.length||!confirmed||Boolean(data.document.reviewedAt)} onClick={()=>void submit()}>{t.confirm}</button>
  {status&&<p role="status" className="mt-3 text-sm">{status}</p>}
 </section>;
}
