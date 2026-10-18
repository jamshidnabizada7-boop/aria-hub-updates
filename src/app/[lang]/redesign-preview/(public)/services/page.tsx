import Link from 'next/link';
import {ArrowUpRight,FileText,ShieldCheck} from 'lucide-react';
import {getSiteData} from '@/lib/get-site';
import {getLocalizedContent} from '@/lib/i18n-content';
import {stripHtml} from '@/lib/import/utils';
import {isLang} from '@/lib/lang-route';

export const dynamic='force-dynamic';
const copy={
 en:{eyebrow:'SERVICES',title:'Practical support for your next step.',desc:'Explore the services currently listed by ARIA HUB. Request details before making any payment or commitment.',browse:'Explore services',request:'Ask about this service',empty:'There are no published services to display.',note:'Availability, fees and delivery conditions should be confirmed before booking.'},
 fa:{eyebrow:'خدمات',title:'رهنمایی عملی برای گام بعدی شما.',desc:'خدمات نشرشده در آریا هاب را ببینید. پیش از پرداخت یا تعهد، جزئیات را بپرسید.',browse:'مشاهدۀ خدمات',request:'پرس‌وجو دربارۀ این خدمت',empty:'در حال حاضر خدمتی نشر نشده است.',note:'پیش از درخواست، هزینه و شرایط ارائه را تأیید کنید.'},
 ps:{eyebrow:'خدمتونه',title:'د بل ګام لپاره عملي مرسته.',desc:'په آریا هاب کې خپاره شوي خدمتونه وګورئ. له ورکړې مخکې بشپړ معلومات وغواړئ.',browse:'خدمتونه وګورئ',request:'د خدمت په اړه پوښتنه',empty:'اوس هېڅ خپور شوی خدمت نشته.',note:'د خدمت بیه او شرایط له غوښتنې مخکې تایید کړئ.'},
} as const;
export default async function ServicesPreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params;const lang=isLang(raw)?raw:'en';const w=copy[lang];const data=await getSiteData();
 const services=data.services.filter(s=>s.status==='published');
 return <main id="main-content" className="aria-container aria-public-main">
  <header className="aria-public-hero"><div><span className="aria-public-hero__eyebrow">{w.eyebrow}</span><h1>{w.title}</h1><p>{w.desc}</p></div><Link className="aria-button aria-button--orange" href={'/'+lang+'/redesign-preview/contact'}>{w.request}<ArrowUpRight size={16}/></Link></header>
  <div className="aria-public-head"><div><h2>{w.browse}</h2><p>{w.note}</p></div></div>
  {services.length?<div className="aria-public-grid">{services.map(s=>{
   const title=getLocalizedContent(s.title,s.titleI18n,lang);
   const excerpt=stripHtml(getLocalizedContent(s.excerpt||s.description,s.excerptI18n||s.descriptionI18n,lang));
   return <article className="aria-public-card" id={s.slug} key={s.id}>
    <span className="aria-public-card__icon"><FileText size={22} aria-hidden="true"/></span>
    {s.category?<span className="aria-public-card__label">{s.category.name}</span>:null}
    <h3 dir="auto">{title}</h3>
    {excerpt?<p dir="auto">{excerpt.slice(0,260)}{excerpt.length>260?'…':''}</p>:null}
    {s.price?<strong className="aria-public-card__label">{s.price}</strong>:null}
    <Link className="aria-card-link" href={'/'+lang+'/contact'}>{w.request}<ArrowUpRight size={15}/></Link>
   </article>;
  })}</div>:<div className="aria-public-empty">{w.empty}</div>}
  <p className="aria-public-notice"><ShieldCheck size={15} style={{display:'inline',verticalAlign:'middle',marginInlineEnd:8}}/>{w.note}</p>
 </main>;
}