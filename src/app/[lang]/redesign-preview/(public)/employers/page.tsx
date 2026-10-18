import Link from 'next/link';
import {ArrowUpRight,Building2,FilePenLine,Users,SearchCheck} from 'lucide-react';
import {isLang} from '@/lib/lang-route';
export const dynamic='force-dynamic';
const copy={
 en:{eyebrow:'FOR EMPLOYERS',title:'Reach candidates without the complexity.',desc:'Post an opportunity, manage your organization and review applications through the existing employer portal.',dashboard:'Employer login / dashboard',post:'Post an opportunity',steps:'How it works',items:[['Create or access your organization','Manage authorized employer access through the existing portal.'],['Publish an opportunity','Provide a clear job description, eligibility and an application method.'],['Review applications','Manage your organization and applicants using the secure employer dashboard.']],notice:'Posting and employer access are subject to the platform’s current publication and account requirements. Submissions are not automatically approved.'},
 fa:{eyebrow:'برای کارفرمایان',title:'به داوطلبان مناسب دسترسی پیدا کنید.',desc:'فرصت‌ها را نشر کنید و سازمان و درخواست‌ها را از طریق پنل موجود مدیریت کنید.',dashboard:'ورود به پنل کارفرما',post:'ثبت فرصت',steps:'چگونه کار می‌کند',items:[['ورود یا ثبت سازمان','دسترسی سازمان را از طریق پنل مدیریت کنید.'],['ثبت فرصت','شرح روشن، شرایط و روش درخواست را ارائه کنید.'],['مدیریت درخواست‌ها','درخواست‌ها را از بخش محفوظ کارفرما بررسی کنید.']],notice:'نشر فرصت و دسترسی سازمان تابع شرایط حساب و بررسی پلتفرم است. درخواست‌ها خودکار تأیید نمی‌شوند.'},
 ps:{eyebrow:'کار ورکوونکو ته',title:'مناسبو غوښتونکو ته په اسانه ورسېږئ.',desc:'فرصتونه خپاره کړئ او ادارې او غوښتنلیکونه د موجود کار ورکوونکي له لارې اداره کړئ.',dashboard:'د کار ورکوونکي حساب',post:'فرصت خپور کړئ',steps:'څنګه کار کوي',items:[['اداره جوړه یا حساب ته ننوځئ','د ادارې اجازه لرونکی حساب وکاروئ.'],['فرصت خپور کړئ','د دندې معلومات، شرطونه او غوښتنلیک لاره ورکړئ.'],['غوښتنلیکونه وګورئ','خپلې ادارې او غوښتنلیکونه خوندي اداره کړئ.']],notice:'نشر او حساب ته لاسرسی د پلاتفورم د شرایطو تابع دی. غوښتنلیکونه په خپله نه تاییدېږي.'}
} as const;
export default async function EmployersPreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params,lang=isLang(raw)?raw:'en',w=copy[lang];
 const icons=[Building2,FilePenLine,SearchCheck];
 const steps:ReadonlyArray<readonly [string,string]>=w.items;
 return <main id="main-content" className="aria-container aria-public-main">
  <header className="aria-public-hero"><div><span className="aria-public-hero__eyebrow">{w.eyebrow}</span><h1>{w.title}</h1><p>{w.desc}</p></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <Link className="aria-button aria-button--orange" href={'/'+lang+'/employers/post'}>{w.post}<ArrowUpRight size={16}/></Link>
   <Link className="aria-button aria-button--outline" href={'/'+lang+'/employers/dashboard'}>{w.dashboard}</Link>
  </div></header>
  <div className="aria-public-head"><h2>{w.steps}</h2></div>
  <div className="aria-public-grid">{steps.map(([title,desc],i)=>{const Icon=icons[i];return <article className="aria-public-card" key={title}>
   <span className="aria-public-card__icon"><Icon size={24}/></span><span className="aria-public-card__label">0{i+1}</span><h3>{title}</h3><p>{desc}</p>
  </article>;})}</div>
  <div className="aria-public-notice">{w.notice}</div>
 </main>;
}