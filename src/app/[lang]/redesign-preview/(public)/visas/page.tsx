import Link from 'next/link';
import {ArrowUpRight,Globe2,FileText} from 'lucide-react';
import {getSiteData} from '@/lib/get-site';
import {getLocalizedContent,getLocalizedArray} from '@/lib/i18n-content';
import {isLang} from '@/lib/lang-route';
import type {Visa} from '@/lib/types';

export const dynamic='force-dynamic';
const copy={
 en:{eyebrow:'VISA GUIDANCE',title:'Explore visa routes, with the facts in view.',desc:'Browse the published visa information in ARIA HUB. Rules, fees and appointment availability may change without notice.',explore:'Available guides',duration:'Duration',processing:'Processing',fee:'Fee',eligibility:'Eligibility',documents:'Documents',requirements:'Requirements',process:'Application steps',more:'View requirements',prep:'Visa preparation tools',empty:'No published visa guides are available.',warning:'This is not a visa approval guarantee. Confirm the latest rules with the relevant embassy, university or immigration authority.'},
 fa:{eyebrow:'رهنمای ویزه',title:'مسیرهای ویزه را با معلومات روشن بررسی کنید.',desc:'رهنماهای نشرشده را ببینید. شرایط، هزینه‌ها و نوبت‌ها ممکن است تغییر کنند.',explore:'رهنماهای موجود',duration:'مدت',processing:'زمان بررسی',fee:'هزینه',eligibility:'واجد شرایط بودن',documents:'اسناد',requirements:'شرایط',process:'مراحل درخواست',more:'مشاهدۀ شرایط',prep:'ابزارهای آمادگی ویزه',empty:'رهنمای نشرشده‌ای موجود نیست.',warning:'این معلومات تضمین دریافت ویزه نیست. تازه‌ترین شرایط را از سفارت یا نهاد رسمی مربوط تأیید کنید.'},
 ps:{eyebrow:'د ویزې لارښود',title:'د ویزې لارې په روښانه معلوماتو وپېژنئ.',desc:'خپاره شوي معلومات وګورئ. شرطونه، لګښتونه او د ملاقات وختونه بدلیدای شي.',explore:'شته لارښودونه',duration:'موده',processing:'د پروسې وخت',fee:'لګښت',eligibility:'وړتیا',documents:'اسناد',requirements:'شرطونه',process:'د غوښتنلیک ګامونه',more:'شرطونه وګورئ',prep:'د ویزې د چمتووالي وسایل',empty:'اوس د ویزې کوم لارښود نشته.',warning:'دا معلومات د ویزې تضمین نه دی. تازه شرطونه د سفارت یا رسمي ادارې سره تایید کړئ.'}
} as const;
function items(value:string|null,localized:Record<string,unknown>|null|undefined,lang:'en'|'fa'|'ps'){
 const raw=getLocalizedArray(value,localized as Record<string,any[]>|null,lang);
 if(Array.isArray(raw))return raw.map(x=>String(x).trim()).filter(Boolean).slice(0,15);
 if(typeof raw!=='string')return [];
 try{const arr=JSON.parse(raw);if(Array.isArray(arr))return arr.map(String).slice(0,15)}catch{}
 return raw.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,15);
}
function VisaItem({v,lang,w}:{v:Visa,lang:'en'|'fa'|'ps',w:typeof copy.en|typeof copy.fa|typeof copy.ps}){
 const country=getLocalizedContent(v.country,v.countryI18n,lang),type=getLocalizedContent(v.visaType,v.visaTypeI18n,lang);
 const desc=getLocalizedContent(v.description,v.descriptionI18n,lang);
 const req=items(v.requirements,v.requirementsI18n,lang),docs=items(v.documents,v.documentsI18n,lang);
 const eligible=getLocalizedContent(v.eligibility,v.eligibilityI18n,lang);
 const process=getLocalizedContent(v.applicationProcess,v.applicationProcessI18n,lang);
 const details=[{label:w.eligibility,value:eligible},{label:w.process,value:process}].filter(v=>v.value);
 return <article className="aria-public-card">
  <div className="aria-public-card__label"><Globe2 size={16}/>{v.countryCode?.toUpperCase()||type}</div>
  <h2 dir="auto">{country}</h2><strong className="aria-tag" style={{alignSelf:'flex-start'}} dir="auto">{type}</strong>
  {desc?<p dir="auto">{desc.slice(0,230)}{desc.length>230?'…':''}</p>:null}
  <div className="aria-public-card__meta">{v.duration?<span>{w.duration}: {v.duration}</span>:null}{v.processingTime?<span>{w.processing}: {v.processingTime}</span>:null}{v.fee?<span>{w.fee}: {v.fee}</span>:null}</div>
  <details><summary>{w.more}</summary><dl>
   {details.map(d=><div key={d.label}><dt>{d.label}</dt><dd dir="auto">{d.value}</dd></div>)}
   {req.length?<div><dt>{w.requirements}</dt><dd><ul style={{listStyle:'disc',paddingInlineStart:18}}>{req.map((x,i)=><li key={i} dir="auto">{x}</li>)}</ul></dd></div>:null}
   {docs.length?<div><dt>{w.documents}</dt><dd><ul style={{listStyle:'disc',paddingInlineStart:18}}>{docs.map((x,i)=><li key={i} dir="auto">{x}</li>)}</ul></dd></div>:null}
  </dl></details>
 </article>;
}
export default async function VisaPreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params,lang=isLang(raw)?raw:'en',w=copy[lang];
 const site=await getSiteData(),visas=site.visas.filter(v=>v.status==='published');
 return <main id="main-content" className="aria-container aria-public-main">
  <header className="aria-public-hero"><div><span className="aria-public-hero__eyebrow">{w.eyebrow}</span><h1>{w.title}</h1><p>{w.desc}</p></div><Link href={'/'+lang+'/visa-prep'} className="aria-button aria-button--orange">{w.prep}<ArrowUpRight size={16}/></Link></header>
  <div className="aria-public-notice">{w.warning}</div>
  <div className="aria-public-head"><h2>{w.explore}</h2></div>
  {visas.length?<div className="aria-public-grid">{visas.map(v=><VisaItem key={v.id} v={v} lang={lang} w={w}/>)}</div>:<div className="aria-public-empty">{w.empty}</div>}
 </main>;
}