import {redirect} from 'next/navigation';
import {applicantEnabled,currentApplicant} from '@/lib/applicant-auth';
import {ApplicantNotifications} from './notifications-client';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params;const lang=raw==='en'||raw==='ps'?raw:'fa';
 if(!applicantEnabled()||process.env.APPLICANT_NOTIFICATIONS_ENABLED!=='true')redirect('/'+lang+'/portal');
 if(!(await currentApplicant()))redirect('/'+lang+'/login');
 return <ApplicantNotifications lang={lang}/>;
}