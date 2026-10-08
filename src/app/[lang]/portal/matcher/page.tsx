import {redirect} from 'next/navigation';
import {applicantEnabled,currentApplicant} from '@/lib/applicant-auth';
import {AdvancedMatcher} from './advanced-matcher';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{lang:string}>}){
 const {lang:l}=await params;const lang=l==='fa'||l==='ps'?l:'en';
 if(!applicantEnabled()||process.env.APPLICANT_MATCHER_V3_ENABLED!=='true')redirect('/'+lang+'/opportunity-matcher');
 const user=await currentApplicant();if(!user)redirect('/'+lang+'/login');
 return <AdvancedMatcher lang={lang}/>;
}
