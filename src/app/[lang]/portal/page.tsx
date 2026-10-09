import Link from 'next/link';
import {redirect} from 'next/navigation';
import {applicantEnabled,currentApplicant} from '@/lib/applicant-auth';
import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{lang:string}>}){
 const {lang:l}=await params;const lang=l==='en'||l==='ps'?l:'fa';
 if(!applicantEnabled())redirect('/'+lang+'/get-started');const user=await currentApplicant();if(!user)redirect('/'+lang+'/login');
 const profile=await db.applicantProfile.findUniqueOrThrow({where:{userId:user.id},include:{
  _count:{select:{documents:true,cvDrafts:true,savedSearches:true,trackedApplications:true}},
  trackedApplications:{where:{status:{in:['saved','preparing','applied','interview']}},take:5,orderBy:{nextActionAt:{sort:'asc',nulls:'last'}},select:{opportunityTitle:true,nextActionAt:true}},
  notifications:{where:{readAt:null,archivedAt:null},take:5,orderBy:{createdAt:'desc'},select:{id:true,opportunity:{select:{title:true,slug:true,deadline:true}}}}
 }});
 const facts=(profile.verifiedCareerFacts||{}) as Record<string,unknown>;
 const completion=Math.round([user.name,profile.headline,profile.residence,facts.education,Array.isArray(facts.skills)&&facts.skills.length,Array.isArray(facts.workHistory)&&facts.workHistory.length].filter(Boolean).length/6*100);
 const unread=await db.applicantNotification.count({where:{applicantProfileId:profile.id,readAt:null,archivedAt:null}});
 const t={en:{title:'My dashboard',welcome:'Welcome',cards:['Profile completion','Unread matches','My CV files','Synced CV drafts','Saved searches','Tracked applications'],links:['My profile','My CVs','My matches','CV Builder','Applications & assistant','Notifications','Account settings'],onboard:'Complete your profile, upload or create a CV, save a matching search, then choose your alerts.',recent:'Recent matching opportunities',upcoming:'Applications and next actions',empty:'Nothing here yet. Start with your profile or a matching search.'},
 fa:{title:'داشبورد من',welcome:'خوش آمدید',cards:['تکمیل مشخصات','تطبیق‌های ناخوانده','فایل‌های سی‌وی','سی‌وی‌های همگام‌شده','جستجوهای ذخیره‌شده','درخواست‌های پیگیری‌شده'],links:['مشخصات من','سی‌وی‌های من','تطبیق‌های من','ساخت سی‌وی','درخواست‌ها و دستیار','اطلاع‌رسانی‌ها','تنظیمات حساب'],onboard:'مشخصات خود را تکمیل کنید، سی‌وی بسازید یا بارگذاری کنید، جستجو ذخیره کنید و اطلاع‌رسانی دلخواه را انتخاب کنید.',recent:'فرصت‌های مناسب تازه',upcoming:'درخواست‌ها و اقدام‌های بعدی',empty:'هنوز معلوماتی نیست. با مشخصات یا جستجو آغاز کنید.'},
 ps:{title:'زما ډشبورډ',welcome:'ښه راغلاست',cards:['د معلوماتو بشپړتیا','نالوستل شوي برابرونونه','زما سي وي فایلونه','همغږي شوي سي وي ګانې','خوندي لټونونه','څارل شوي غوښتنلیکونه'],links:['زما معلومات','زما سي وي ګانې','زما برابرونونه','سي وي جوړول','غوښتنلیکونه او مرستیال','خبرتیاوې','د حساب تنظیمات'],onboard:'معلومات بشپړ کړئ، سي وي جوړ یا پورته کړئ، لټون خوندي کړئ او خپلې خبرتیاوې وټاکئ.',recent:'نوي مناسب فرصتونه',upcoming:'غوښتنلیکونه او راتلونکي ګامونه',empty:'تراوسه څه نشته. له معلوماتو یا لټون څخه پیل کړئ.'}}[lang];
 const counts=[completion+'%',unread,profile._count.documents,profile._count.cvDrafts,profile._count.savedSearches,profile._count.trackedApplications];
 const links=[['/portal/profile',true],['/portal/cvs',process.env.CLOUD_CV_STORAGE_ENABLED==='true'],['/portal/matcher',process.env.APPLICANT_MATCHER_V3_ENABLED==='true'],['/cv-builder',true],['/portal/career',process.env.APPLICANT_CAREER_V5_ENABLED==='true'],['/portal/notifications',process.env.APPLICANT_NOTIFICATIONS_ENABLED==='true'],['/portal/settings',true]] as const;
 const date=(value:Date)=>value.toLocaleDateString(lang==='en'?'en-GB':lang==='fa'?'fa-AF':'ps-AF');
 return <main className="mx-auto max-w-5xl px-5 py-12" dir={lang==='en'?'ltr':'rtl'}>
  <h1 className="text-3xl font-bold">{t.title}</h1><p className="mt-3">{t.welcome}, {user.name||user.email}</p>
  <p className="my-6 rounded-xl border bg-card p-4">{t.onboard}</p>
  <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">{t.cards.map((label,i)=><div key={label} className="rounded-xl border bg-card p-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-semibold">{counts[i]}</dd></div>)}</dl>
  <nav aria-label={t.title} className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{links.map(([path,enabled],i)=>enabled&&<Link className="rounded-xl border p-4 font-semibold hover:border-primary focus-visible:outline-2 focus-visible:outline-primary" key={path} href={'/'+lang+path}>{t.links[i]}</Link>)}</nav>
  <section className="mt-7"><h2 className="text-xl font-semibold">{t.recent}</h2>{!profile.notifications.length?<p className="mt-3 text-muted-foreground">{t.empty}</p>:<ul className="mt-3 space-y-3">{profile.notifications.map(n=><li className="rounded-lg border p-4" key={n.id}><Link className="underline" href={'/'+lang+'/opportunities/'+encodeURIComponent(n.opportunity.slug)}>{n.opportunity.title}</Link>{n.opportunity.deadline&&<time className="ms-3 text-sm" dateTime={n.opportunity.deadline.toISOString()}>{date(n.opportunity.deadline)}</time>}</li>)}</ul>}</section>
  <section className="mt-7"><h2 className="text-xl font-semibold">{t.upcoming}</h2>{!profile.trackedApplications.length?<p className="mt-3 text-muted-foreground">{t.empty}</p>:<ul className="mt-3 space-y-3">{profile.trackedApplications.map((a,i)=><li className="rounded-lg border p-4" key={i}>{a.opportunityTitle}{a.nextActionAt&&<time className="ms-3 text-sm" dateTime={a.nextActionAt.toISOString()}>{date(a.nextActionAt)}</time>}</li>)}</ul>}</section>
 </main>;
}
