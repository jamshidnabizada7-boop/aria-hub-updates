import { redirect } from 'next/navigation';
import { currentApplicant, applicantEnabled } from '@/lib/applicant-auth';
import { db } from '@/lib/db';
import { PortalSettings } from './portal-settings';
import { ProfileEditor } from '../profile/profile-editor';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{lang:string}>}) {
 const {lang:l}=await params; const lang=l==='en'||l==='ps'?l:'fa';
 if(!applicantEnabled())redirect('/'+lang+'/get-started');
 const user=await currentApplicant(); if(!user)redirect('/'+lang+'/login');
 const p=await db.applicantProfile.findUnique({where:{userId:user.id}});
 return <main id="main-content" className="mx-auto max-w-5xl px-5 py-12" dir={lang==='en'?'ltr':'rtl'}><h1 className="text-3xl font-bold">{lang==='en'?'Account settings':lang==='fa'?'تنظیمات حساب':'د حساب تنظیمات'}</h1><ProfileEditor lang={lang} initial={{name:user.name||'',headline:p?.headline||'',residence:p?.residence||'',preferredLocale:p?.preferredLocale||lang}}/><PortalSettings lang={lang} initialName={user.name||''} deletionAvailable={process.env.APPLICANT_ACCOUNT_DELETION_ENABLED==='true'}/></main>;
}
