import type {ReactNode} from 'react';
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AriaPreviewNav} from '@/components/site/redesign/aria-preview-nav';
import {AriaNewsletter} from '@/components/site/redesign/aria-newsletter';
import {ariaSans,ariaRtl} from '@/components/site/redesign/aria-fonts';
import {isLang} from '@/lib/lang-route';
import '@/components/site/redesign/aria-v2.css';
import '@/components/site/redesign/aria-public.css';

export const metadata:Metadata={robots:{index:false,follow:false}};
export const dynamic='force-dynamic';

const footer={
 en:{explore:'Explore',company:'ARIA HUB',help:'Support',links:['Opportunities','Services','Visa guides','Articles','Organizations','Community stories','For employers','About us','Contact','Privacy','Terms'],disclaimer:'Content is informational. Always confirm deadlines and eligibility with the original provider.'},
 fa:{explore:'کشف فرصت‌ها',company:'آریا هاب',help:'راهنمایی',links:['فرصت‌ها','خدمات','رهنمای ویزه','مقالات','سازمان‌ها','داستان‌های موفقیت','برای کارفرمایان','دربارۀ ما','تماس','حریم خصوصی','شرایط استفاده'],disclaimer:'معلومات برای رهنمایی است؛ مهلت و شرایط را با منبع اصلی بررسی کنید.'},
 ps:{explore:'فرصتونه',company:'آریا هاب',help:'ملاتړ',links:['فرصتونه','خدمتونه','د ویزې لارښود','مقالې','ادارې','د بریا کیسې','کار ورکوونکي','زموږ په اړه','اړیکه','محرمیت','د کارولو شرطونه'],disclaimer:'معلومات د لارښوونې لپاره دي؛ نېټې او شرایط له اصلي سرچینې سره تایید کړئ.'},
} as const;
const paths=['/opportunities','/services','/visas','/blog','/organizations','/success-stories','/employers','/about','/contact','/privacy','/terms'] as const;

export default async function AriaPublicPreviewLayout({children,params}:{children:ReactNode;params:Promise<{lang:string}>}){
 if(process.env.ARIA_REDESIGN_PREVIEW_ENABLED!=='true')notFound();
 const {lang:raw}=await params;
 if(!isLang(raw))notFound();
 const lang=raw;
 const w=footer[lang];
 return <div className={ariaSans.variable+' '+ariaRtl.variable}>
  <div className="aria-v2 aria-public" dir={lang==='en'?'ltr':'rtl'} lang={lang}>
   <AriaPreviewNav lang={lang} preview/>
   {children}
   <div className="aria-container"><AriaNewsletter lang={lang}/></div>
   <footer className="aria-public-footer">
    <div className="aria-container">
     <div className="aria-public-footer__grid">
      <div><strong className="aria-public-footer__brand">ARIA <span>HUB</span></strong><p>{w.disclaimer}</p></div>
      <nav aria-label={w.explore}>
       {paths.slice(0,6).map((p,i)=><Link key={p} href={'/'+lang+'/redesign-preview'+p}>{w.links[i]}</Link>)}
      </nav>
      <nav aria-label={w.company}>
       {paths.slice(6,9).map((p,i)=><Link key={p} href={'/'+lang+'/redesign-preview'+p}>{w.links[i+6]}</Link>)}
      </nav>
      <nav aria-label={w.help}>
       {paths.slice(9).map((p,i)=><Link key={p} href={'/'+lang+p}>{w.links[i+9]}</Link>)}
       <Link href={'/'+lang+'/redesign-preview/portal'}>{lang==='en'?'My account':lang==='fa'?'حساب من':'زما حساب'}</Link>
      </nav>
     </div>
     <div className="aria-public-footer__bottom"><span>© {new Date().getFullYear()} ARIA HUB</span><span>English · فارسی (افغانستان) · پښتو</span></div>
    </div>
   </footer>
  </div>
 </div>;
}