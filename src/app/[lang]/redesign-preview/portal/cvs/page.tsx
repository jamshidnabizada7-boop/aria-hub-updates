import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {FileText,ArrowUpRight} from 'lucide-react';
import {isLang} from '@/lib/lang-route';
import {currentApplicant} from '@/lib/applicant-auth';
import {CVLibrary} from '@/app/[lang]/portal/cvs/cv-library';
export const dynamic='force-dynamic';
export default async function CVLibraryPreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params;
 if(!isLang(raw))notFound();
 if(process.env.CLOUD_CV_STORAGE_ENABLED!=='true')notFound();
 if(!(await currentApplicant()))redirect('/'+raw+'/login');
 const c=raw==='fa'?{title:'سی‌وی‌های من',desc:'فایل‌های خصوصی را بارگذاری، دریافت و بررسی کنید.',cta:'ساخت سی‌وی نو'}:raw==='ps'?{title:'زما سي وي ګانې',desc:'شخصي فایلونه پورته، ښکته او بیاکتنه کړئ.',cta:'نوی سي وي جوړ کړئ'}:{title:'Your CV library',desc:'Upload, download and review your private CVs.',cta:'Build a new CV'};
 return <main id="main-content" className="aria-preview-form-page">
  <header className="aria-preview-page-head"><FileText size={26}/><div><h2>{c.title}</h2><p>{c.desc}</p></div><Link className="aria-button" href={'/'+raw+'/redesign-preview/portal/cv-builder'}>{c.cta}<ArrowUpRight size={16}/></Link></header>
  <div className="aria-tool-content aria-cv-library-preview"><CVLibrary lang={raw}/></div>
 </main>;
}