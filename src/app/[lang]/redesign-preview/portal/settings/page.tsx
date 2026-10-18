import {notFound,redirect} from 'next/navigation';
import {isLang} from '@/lib/lang-route';
import {currentApplicant} from '@/lib/applicant-auth';
import {db} from '@/lib/db';
import {ProfileEditor} from '@/app/[lang]/portal/profile/profile-editor';
import {PortalSettings} from '@/app/[lang]/portal/settings/portal-settings';
export const dynamic='force-dynamic';
export default async function SettingsPreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params;
 if(!isLang(raw))notFound();
 const user=await currentApplicant();
 if(!user)redirect('/'+raw+'/login');
 const profile=await db.applicantProfile.findUnique({where:{userId:user.id}});
 const c=raw==='fa'?{title:'تنظیمات حساب',desc:'حریم خصوصی و امنیت حساب شما.'}:raw==='ps'?{title:'د حساب تنظیمات',desc:'ستاسو د حساب محرمیت او امنیت.'}:{title:'Account settings',desc:'Privacy and security for your account.'};
 return <main id="main-content" className="aria-preview-form-page">
  <header className="aria-preview-page-head"><div><h2>{c.title}</h2><p>{c.desc}</p></div></header>
  <div className="aria-tool-content aria-settings-preview">
   <ProfileEditor lang={raw} initial={{name:user.name||'',headline:profile?.headline||'',residence:profile?.residence||'',preferredLocale:profile?.preferredLocale||raw}}/>
   <PortalSettings lang={raw} initialName={user.name||''} deletionAvailable={process.env.APPLICANT_ACCOUNT_DELETION_ENABLED==='true'}/>
  </div>
 </main>;
}