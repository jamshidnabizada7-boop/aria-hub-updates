import Link from 'next/link';
import type {Lang} from '@/lib/lang-route';

const copy={
 en:{explore:'Explore',company:'Company',help:'Support',links:['Opportunities','Services','Visa guides','Articles','Organizations','Community stories','For employers','About us','Contact','Privacy','Terms'],disclaimer:'Content is informational. Always confirm deadlines and eligibility with the original provider.',account:'My account'},
 fa:{explore:'کشف فرصت‌ها',company:'آریا هاب',help:'رهنمایی',links:['فرصت‌ها','خدمات','رهنمای ویزه','مقالات','سازمان‌ها','داستان‌های موفقیت','برای کارفرمایان','دربارۀ ما','تماس','حریم خصوصی','شرایط استفاده'],disclaimer:'معلومات برای رهنمایی است؛ مهلت و شرایط را با منبع اصلی بررسی کنید.',account:'حساب من'},
 ps:{explore:'فرصتونه',company:'آریا هاب',help:'ملاتړ',links:['فرصتونه','خدمتونه','د ویزې لارښود','مقالې','ادارې','د بریا کیسې','کار ورکوونکي','زموږ په اړه','اړیکه','محرمیت','د کارولو شرطونه'],disclaimer:'معلومات د لارښوونې لپاره دي؛ نېټې او شرایط له اصلي سرچینې سره تایید کړئ.',account:'زما حساب'},
} as const;
const paths=['/opportunities','/services','/visas','/blog','/organizations','/success-stories','/employers','/about','/contact','/privacy','/terms'] as const;
export function AriaPublicFooter({lang,preview=true}:{lang:Lang;preview?:boolean}){
 const w=copy[lang];
 const href=(p:string)=>'/'+lang+(preview && !['/privacy','/terms'].includes(p)?'/redesign-preview':'')+p;
 return <footer className="aria-public-footer">
   <div className="aria-container">
    <div className="aria-public-footer__grid">
      <div><strong className="aria-public-footer__brand">ARIA <span>HUB</span></strong><p>{w.disclaimer}</p></div>
      <nav aria-label={w.explore}>{paths.slice(0,6).map((p,i)=><Link key={p} href={href(p)}>{w.links[i]}</Link>)}</nav>
      <nav aria-label={w.company}>{paths.slice(6,9).map((p,i)=><Link key={p} href={href(p)}>{w.links[i+6]}</Link>)}</nav>
      <nav aria-label={w.help}>
       {paths.slice(9).map((p,i)=><Link key={p} href={href(p)}>{w.links[i+9]}</Link>)}
       <Link href={href('/portal')}>{w.account}</Link>
      </nav>
    </div>
    <div className="aria-public-footer__bottom"><span>© {new Date().getFullYear()} ARIA HUB</span><span>English · فارسی (افغانستان) · پښتو</span></div>
   </div>
 </footer>;
}
