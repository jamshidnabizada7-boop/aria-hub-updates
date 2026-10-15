import {redirect} from 'next/navigation';import {currentApplicant,applicantEnabled} from '@/lib/applicant-auth';import {SubmittedApplications} from '@/components/employers/submitted-applications';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{lang:string}>}){const p=await params,lang=p.lang==='fa'||p.lang==='ps'?p.lang:'en';if(!applicantEnabled())redirect('/'+lang+'/get-started');if(!await currentApplicant())redirect('/'+lang+'/login');return <SubmittedApplications lang={lang}/>;}
