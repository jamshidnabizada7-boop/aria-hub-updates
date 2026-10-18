import {notFound,redirect} from 'next/navigation';
import {isLang} from '@/lib/lang-route';
import {currentApplicant} from '@/lib/applicant-auth';
import {AdvancedMatcher} from '@/app/[lang]/portal/matcher/advanced-matcher';
export const dynamic='force-dynamic';
export default async function MatcherPreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params;
 if(!isLang(raw))notFound();
 if(process.env.APPLICANT_MATCHER_V3_ENABLED!=='true')notFound();
 if(!(await currentApplicant()))redirect('/'+raw+'/login');
 return <section className="aria-tool-content aria-matcher-preview"><AdvancedMatcher lang={raw}/></section>;
}