import { redirect } from 'next/navigation';
import { applicantEnabled, currentApplicant } from '@/lib/applicant-auth';
import { db } from '@/lib/db';
import { ProfileEditor } from './profile-editor';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{lang:string}>}) {
 const {lang:l}=await params;const lang=l==='en'||l==='ps'?l:'fa';
 if(!applicantEnabled())redirect('/'+lang+'/get-started');const user=await currentApplicant();if(!user)redirect('/'+lang+'/login');
 const p=await db.applicantProfile.findUniqueOrThrow({where:{userId:user.id}});
 return <main className="mx-auto max-w-5xl px-5 py-12" dir={lang==='en'?'ltr':'rtl'}><h1 className="text-3xl font-bold">{lang==='en'?'My profile':lang==='fa'?'مشخصات من':'زما معلومات'}</h1><ProfileEditor lang={lang} initial={{name:user.name||'',headline:p.headline||'',residence:p.residence||'',preferredLocale:p.preferredLocale}}/>{process.env.APPLICANT_MATCHER_V3_ENABLED==='true'&&<Link className="mt-6 inline-block rounded-lg border p-3" href={'/'+lang+'/portal/matcher'}>{lang==='en'?'Edit education, experience, skills and preferences':lang==='fa'?'ویرایش تحصیلات، تجربه، مهارت‌ها و ترجیحات':'زده کړې، تجربه، مهارتونه او خوښې بدل کړئ'}</Link>}</main>;
}
