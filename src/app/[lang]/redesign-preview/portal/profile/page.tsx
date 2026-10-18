import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {ArrowUpRight,ShieldCheck,UserRound} from 'lucide-react';
import {isLang} from '@/lib/lang-route';
import {currentApplicant} from '@/lib/applicant-auth';
import {db} from '@/lib/db';
import {ProfileEditor} from '@/app/[lang]/portal/profile/profile-editor';

export const dynamic='force-dynamic';
export default async function ProfilePreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params;
 if(!isLang(raw))notFound();
 const lang=raw;
 const user=await currentApplicant();
 if(!user)redirect('/'+lang+'/login');
 const profile=await db.applicantProfile.findUnique({where:{userId:user.id}});
 if(!profile)notFound();
 const c=lang==='fa'?{title:'مشخصات شخصی',intro:'اطلاعات شما خصوصی است و پیش از استفاده در تطبیق فرصت‌ها توسط خودتان بررسی می‌شود.',match:'تنظیم تحصیلات، مهارت‌ها و ترجیحات',privacy:'فقط معلوماتی که خودتان تأیید کرده‌اید استفاده می‌شود.'}:lang==='ps'?{title:'شخصي معلومات',intro:'ستاسو معلومات شخصي دي. د فرصتونو لپاره له کارولو مخکې پخپله ارزول کېږي.',match:'زده کړې، مهارتونه او غوره توبونه',privacy:'یوازې ستاسو تایید شوي معلومات کارول کېږي.'}:{title:'Personal profile',intro:'Organizations see only information you deliberately share. Review your facts before using them for matching.',match:'Set up education, skills and preferences',privacy:'Only facts you review are used in matching.'};
 return <main id="main-content" className="aria-preview-form-page">
  <header className="aria-preview-page-head"><UserRound size={26}/><div><h2>{c.title}</h2><p>{c.intro}</p></div></header>
  <div className="aria-profile-layout">
   <aside className="aria-profile-side">
    <div className="aria-profile-avatar" aria-hidden="true">{(user.name||user.email||'A').slice(0,1).toUpperCase()}</div>
    <h3 dir="auto">{user.name||user.email}</h3>
    {profile.headline?<p dir="auto">{profile.headline}</p>:null}
    {profile.residence?<small dir="auto">{profile.residence}</small>:null}
    <div className="aria-profile-privacy"><ShieldCheck size={16}/>{c.privacy}</div>
   </aside>
   <div className="aria-profile-editor"><ProfileEditor lang={lang} initial={{name:user.name||'',headline:profile.headline||'',residence:profile.residence||'',preferredLocale:profile.preferredLocale}}/>
    {process.env.APPLICANT_MATCHER_V3_ENABLED==='true'?<Link href={'/'+lang+'/redesign-preview/portal/matcher'} className="aria-inline-action">{c.match}<ArrowUpRight size={16}/></Link>:null}
   </div>
  </div>
 </main>;
}