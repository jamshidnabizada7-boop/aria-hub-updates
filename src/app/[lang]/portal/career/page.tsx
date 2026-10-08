import {redirect} from 'next/navigation';
import {currentApplicant,applicantEnabled} from '@/lib/applicant-auth';
import {CareerClient} from './career-client';
export const dynamic='force-dynamic';
export default async function CareerPage({params,searchParams}:{params:Promise<{lang:string}>,searchParams:Promise<{opportunity?:string}>}){
 const {lang:raw}=await params,sp=await searchParams;
 const lang=raw==='fa'||raw==='ps'?raw:'en';
 if(!applicantEnabled()||process.env.APPLICANT_CAREER_V5_ENABLED!=='true')redirect('/'+lang+'/portal');
 if(!(await currentApplicant()))redirect('/'+lang+'/login');
 return <CareerClient lang={lang} initialSlug={String(sp.opportunity||'').slice(0,220)}/>;
}
