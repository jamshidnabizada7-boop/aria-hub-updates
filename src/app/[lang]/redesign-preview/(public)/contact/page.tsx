import Link from 'next/link';
import {Mail,MessageCircle} from 'lucide-react';
import {getSiteData} from '@/lib/get-site';
import {AriaContactForm} from '@/components/site/redesign/aria-contact-form';
import {isLang} from '@/lib/lang-route';
export const dynamic='force-dynamic';
const words={
 en:{eyebrow:'CONTACT',title:'How can we help?',desc:'Questions about a listing, career tools or a service? Send a message through the existing ARIA HUB contact system.',form:'Send a message',channels:'Contact details',notes:'Never send passwords, payment card details or sensitive personal information through this form.',services:'Explore services'},
 fa:{eyebrow:'تماس',title:'چگونه کمک کرده می‌توانیم؟',desc:'دربارۀ فرصت، ابزار یا خدمت سوال دارید؟ از سیستم تماس آریا هاب پیام بفرستید.',form:'ارسال پیام',channels:'راه‌های تماس',notes:'رمز عبور، جزئیات کارت بانکی یا معلومات بسیار شخصی را در این فرم شریک نسازید.',services:'مشاهدۀ خدمات'},
 ps:{eyebrow:'اړیکه',title:'څنګه مرسته وکړو؟',desc:'د فرصت یا خدمت په اړه پوښتنه لرئ؟ د آریا هاب له لارې پیغام ولېږئ.',form:'پیغام ولېږئ',channels:'د اړیکې معلومات',notes:'پټ نومونه، د بانک کارت معلومات او حساس شخصي معلومات مه لېږئ.',services:'خدمتونه وګورئ'}
} as const;
export default async function ContactPreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params,lang=isLang(raw)?raw:'en',w=words[lang];
 const site=await getSiteData(),settings=site.settings;
 const email=settings?.email?.trim(),mail=(email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))?'mailto:'+email:null;
 return <main id="main-content" className="aria-container aria-public-main">
  <header className="aria-public-hero"><div><span className="aria-public-hero__eyebrow">{w.eyebrow}</span><h1>{w.title}</h1><p>{w.desc}</p></div><MessageCircle size={44} aria-hidden="true"/></header>
  <div className="aria-public-two-pane">
   <section className="aria-public-card"><h2>{w.form}</h2><AriaContactForm lang={lang}/></section>
   <aside className="aria-public-card"><h2>{w.channels}</h2>
    <div className="aria-public-contact-links">
     {mail?<a href={mail}><Mail size={17} style={{display:'inline',marginInlineEnd:7}}/>{email}</a>:null}
     {settings?.phone?<p dir="auto">{settings.phone}</p>:null}
     {settings?.address?<p dir="auto">{settings.address}</p>:null}
    </div>
    <p className="aria-public-notice">{w.notes}</p>
    <Link className="aria-card-link" href={'/'+lang+'/redesign-preview/services'}>{w.services} →</Link>
   </aside>
  </div>
 </main>;
}