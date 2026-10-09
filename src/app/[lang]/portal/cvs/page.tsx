import { redirect } from 'next/navigation';
import { applicantEnabled, currentApplicant } from '@/lib/applicant-auth';
import { CVLibrary } from './cv-library';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{lang:string}>}){
 const {lang:l}=await params;const lang=l==='en'||l==='ps'?l:'fa';
 if(!applicantEnabled())redirect('/'+lang+'/get-started');
 if(!(await currentApplicant()))redirect('/'+lang+'/login');
 return <CVLibrary lang={lang}/>;
}