import {notFound,redirect} from 'next/navigation';
import {isLang} from '@/lib/lang-route';
import {currentApplicant} from '@/lib/applicant-auth';
import {ApplicantNotifications} from '@/app/[lang]/portal/notifications/notifications-client';
export const dynamic='force-dynamic';
export default async function NotificationsPreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params;
 if(!isLang(raw))notFound();
 if(process.env.APPLICANT_NOTIFICATIONS_ENABLED!=='true')notFound();
 if(!(await currentApplicant()))redirect('/'+raw+'/login');
 return <section className="aria-tool-content aria-notifications-preview"><ApplicantNotifications lang={raw}/></section>;
}