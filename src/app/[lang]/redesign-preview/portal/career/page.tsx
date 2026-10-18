import {notFound,redirect} from 'next/navigation';
import {isLang} from '@/lib/lang-route';
import {currentApplicant} from '@/lib/applicant-auth';
import {CareerClient} from '@/app/[lang]/portal/career/career-client';
export const dynamic='force-dynamic';
export default async function CareerPreview({params,searchParams}:{
 params:Promise<{lang:string}>;searchParams:Promise<{opportunity?:string|string[]}>;
}){
 const {lang:raw}=await params;
 if(!isLang(raw))notFound();
 if(process.env.APPLICANT_CAREER_V5_ENABLED!=='true')notFound();
 if(!(await currentApplicant()))redirect('/'+raw+'/login');
 const query=await searchParams;
 const slug=typeof query.opportunity==='string'?query.opportunity.slice(0,220):'';
 return <section className="aria-tool-content aria-career-preview"><CareerClient lang={raw} initialSlug={slug}/></section>;
}