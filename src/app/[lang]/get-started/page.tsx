import Link from 'next/link';
import { applicantEnabled } from '@/lib/applicant-auth';
import { smtpConfigured } from '@/lib/mailer';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{lang:string}>}) {
 const {lang:l}=await params; const lang=l==='en'||l==='fa'||l==='ps'?l:'fa';const rtl=lang!=='en';
 const labels={en:['Start with ARIA HUB','Choose what you want to do','Find opportunities','Build a CV','Match opportunities','Post a job','Log in','Create free account'],fa:['با آریا هاب آغاز کنید','هدف خود را انتخاب کنید','جستجوی فرصت‌ها','ساخت سی‌وی','تطبیق فرصت‌ها','ثبت وظیفه','ورود','ساخت حساب رایگان'],ps:['له آریا هاب سره پیل وکړئ','خپل هدف وټاکئ','فرصتونه ولټوئ','سي وي جوړ کړئ','د فرصتونو برابرول','د دندې خپرول','ننوتل','وړیا حساب جوړول']}[lang];
 const links=['/opportunities','/cv-builder','/opportunity-matcher','/employers/post'];
 return <main className="mx-auto max-w-5xl px-5 py-14" dir={rtl?'rtl':'ltr'}><h1 className="text-3xl font-bold">{labels[0]}</h1><p className="my-6 text-muted-foreground">{labels[1]}</p><div className="grid gap-4 sm:grid-cols-2">{links.map((href,i)=><Link key={href} href={'/'+lang+href} className="rounded-xl border bg-card p-6 text-lg font-semibold hover:border-primary">{labels[i+2]} →</Link>)}</div>{applicantEnabled()&&<div className="mt-7 flex flex-wrap gap-3"><Link href={'/'+lang+'/login'} className="rounded-lg border px-5 py-3">{labels[6]}</Link>{smtpConfigured()&&<Link href={'/'+lang+'/register'} className="rounded-lg bg-primary px-5 py-3 text-primary-foreground">{labels[7]}</Link>}</div>}</main>;
}
