import Link from 'next/link';
import {notFound} from 'next/navigation';
import {CalendarDays, ArrowUpRight, FileText, Bell, ScanSearch, UserRound, BriefcaseBusiness, BookmarkCheck, CheckCircle2} from 'lucide-react';
import {db} from '@/lib/db';
import {currentApplicant} from '@/lib/applicant-auth';
import {PortalDiscovery} from '@/components/site/portal-discovery';
import {isLang,type Lang} from '@/lib/lang-route';
import {formatDateShort} from '@/lib/date-format';

export const dynamic='force-dynamic';

const words={
  en:{
    welcome:'Welcome back', overview:'Your career journey at a glance.', progress:'Profile strength',
    improve:'Complete your profile', next:'Suggested next step', mission:'ARIA Quest · Getting started',
    explain:'Complete practical tasks to get more from your account. XP totals will appear only after the rewards ledger is verified.',
    start:'Complete your career setup', done:'Completed', metrics:['Unread matches','CV files','CV drafts','Saved searches','Tracked applications','Followed organizations'],
    matching:'Recommended opportunities for you', matches:'See matching preferences', recent:'Recent matching opportunities', applications:'Applications & next actions',
    empty:'Nothing here yet. Start by saving a search or tracking an opportunity.', look:'View opportunity', account:'My account',
    actions:['Update profile','Find matches','My CV library','Build CV','Track applications','Set alerts'],
    alertNote:'Saving a match search does not automatically subscribe you to email alerts.',
  },
  fa:{
    welcome:'خوش آمدید',overview:'مروری بر مسیر کاری شما.',progress:'میزان تکمیل مشخصات',
    improve:'تکمیل مشخصات',next:'گام بعدی پیشنهادی',mission:'مأموریت آریا · گام‌های نخست',
    explain:'با انجام کارهای مفید، حساب خود را آماده کنید. امتیاز XP تنها پس از تأیید سیستم امتیازدهی نشان داده می‌شود.',
    start:'تکمیل اطلاعات کاری',done:'تکمیل‌شده',metrics:['تطبیق‌های ناخوانده','فایل‌های سی‌وی','پیش‌نویس‌های سی‌وی','جستجوهای ذخیره‌شده','درخواست‌های پیگیری‌شده','سازمان‌های دنبال‌شده'],
    matching:'فرصت‌های پیشنهادی برای شما',matches:'تنظیم تطبیق فرصت‌ها',recent:'فرصت‌های مناسب تازه',applications:'درخواست‌ها و اقدام‌های بعدی',
    empty:'هنوز موردی نیست. با ذخیرۀ جستجو یا پیگیری یک فرصت آغاز کنید.',look:'مشاهده فرصت',account:'حساب من',
    actions:['ویرایش مشخصات','یافتن فرصت مناسب','سی‌وی‌های من','ساخت سی‌وی','پیگیری درخواست‌ها','تنظیم هشدارها'],
    alertNote:'ذخیرۀ یک جستجو به تنهایی هشدارهای ایمیلی را فعال نمی‌کند.',
  },
  ps:{
    welcome:'ښه راغلاست',overview:'ستاسو د کاري مسیر لنډیز.',progress:'د معلوماتو بشپړتیا',
    improve:'معلومات بشپړ کړئ',next:'راتلونکی وړاندیز شوی ګام',mission:'آریا کوېسټ · لومړني ګامونه',
    explain:'خپل حساب د ګټورو ګامونو په بشپړولو چمتو کړئ. د XP شمېر به یوازې د امتیازونو د سیستم له تایید وروسته ښکاره شي.',
    start:'مسلکي معلومات بشپړ کړئ',done:'بشپړ شوی',metrics:['نالوستل شوي فرصتونه','زما سي وي فایلونه','د سي وي مسودې','خوندي لټونونه','څارل شوي غوښتنلیکونه','تعقیب شوې ادارې'],
    matching:'ستاسو لپاره وړاندیز شوي فرصتونه',matches:'د برابرون تنظیمات',recent:'نوي مناسب فرصتونه',applications:'غوښتنلیکونه او راتلونکي ګامونه',
    empty:'تر اوسه څه نشته. لومړی لټون خوندي کړئ یا فرصت وڅارئ.',look:'فرصت وګورئ',account:'زما حساب',
    actions:['معلومات سم کړئ','مناسب فرصتونه ومومئ','زما سي وي ګانې','سي وي جوړ کړئ','غوښتنلیکونه وڅارئ','خبرتیاوې تنظیم کړئ'],
    alertNote:'یوازې د لټون خوندي کول ایمیلي خبرتیاوې نه فعالوي.',
  }
} as const;
const pathMap=['/profile','/matcher','/cvs','/cv-builder','/career','/notifications'] as const;
const icons=[UserRound,ScanSearch,FileText,FileText,BriefcaseBusiness,Bell];

export default async function DashboardPreview({params}:{params:Promise<{lang:string}>}) {
  const {lang:raw}=await params;
  if(!isLang(raw)) notFound();
  const lang:Lang=raw;
  const user=await currentApplicant();
  if(!user) notFound(); // Parent layout handles redirect to login.
  const p=await db.applicantProfile.findUnique({
    where:{userId:user.id},
    include:{
      _count:{select:{documents:true,cvDrafts:true,savedSearches:true,trackedApplications:true,organizationFollows:true}},
      notifications:{where:{readAt:null,archivedAt:null},orderBy:{createdAt:'desc'},take:4,select:{id:true,opportunity:{select:{slug:true,title:true,titleI18n:true,deadline:true}}}},
      trackedApplications:{where:{status:{in:['saved','preparing','applied','interview']}},orderBy:{nextActionAt:{sort:'asc',nulls:'last'}},take:4,select:{id:true,opportunityTitle:true,nextActionAt:true,status:true}},
      notificationPreference:{select:{inAppEnabled:true,emailEnabled:true}},
    },
  });
  if(!p) notFound();
  const w=words[lang];
  const careerFacts=(p.verifiedCareerFacts||{}) as Record<string,unknown>;
  const steps=[
    {done:!!user.name?.trim(),key:'name'},
    {done:!!p.headline?.trim(),key:'headline'},
    {done:!!p.residence?.trim(),key:'residence'},
    {done:!!careerFacts.education,key:'education'},
    {done:Array.isArray(careerFacts.skills)&&careerFacts.skills.length>0,key:'skills'},
    {done:Array.isArray(careerFacts.workHistory)&&careerFacts.workHistory.length>0,key:'experience'},
  ];
  const completion=Math.round(100*steps.filter(s=>s.done).length/steps.length);
  const notifCount=await db.applicantNotification.count({where:{applicantProfileId:p.id,readAt:null,archivedAt:null}});
  const metrics=[notifCount,p._count.documents,p._count.cvDrafts,p._count.savedSearches,p._count.trackedApplications,p._count.organizationFollows];
  const base='/'+lang+'/redesign-preview/portal';
  const enable=[true,process.env.APPLICANT_MATCHER_V3_ENABLED==='true',process.env.CLOUD_CV_STORAGE_ENABLED==='true',true,process.env.APPLICANT_CAREER_V5_ENABLED==='true',process.env.APPLICANT_NOTIFICATIONS_ENABLED==='true'];
  const nextAction=completion<100?'/profile':p._count.savedSearches===0&&enable[1]?'/matcher':p._count.documents===0&&enable[2]?'/cvs':enable[5]&&!p.notificationPreference?.emailEnabled?'/notifications':'/career';
  const linkNext=base+(enable.findIndex((e,i)=>pathMap[i]===nextAction)>-1?nextAction:'/profile');
  const factLabel=(v:string)=>v===lang?'':v;
  return <main id="main-content" className="aria-dashboard">
    <div className="aria-dashboard-top">
      <section className="aria-dashboard-welcome">
        <span className="aria-dashboard-kicker">{w.welcome}</span>
        <h2 dir="auto">{user.name||user.email||w.account}</h2>
        <p>{w.overview}</p>
        <div className="aria-mission-line">
          <span>{w.mission}</span>
          <span>{steps.filter(s=>s.done).length}/{steps.length}</span>
        </div>
        <div className="aria-progress-track" role="progressbar" aria-label={w.progress} aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
          <div style={{width:completion+'%'}}/>
        </div>
        <p className="aria-mission-note">{w.explain}</p>
      </section>
      <div className="aria-dashboard-aside">
        <section className="aria-dashboard-progress">
          <div className="aria-dashboard-progress__head">
            <h3>{w.progress}</h3><strong>{completion}%</strong>
          </div>
          <div className="aria-progress-track" role="progressbar" aria-label={w.progress} aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><div style={{width:completion+'%'}}/></div>
          <Link className="aria-button" href={base+'/profile'}>{w.improve}<ArrowUpRight size={15}/></Link>
        </section>
        <section className="aria-dashboard-next">
          <h3><CheckCircle2 size={17}/>{w.next}</h3>
          <Link href={linkNext}>{w.start}<ArrowUpRight size={16}/></Link>
        </section>
      </div>
    </div>
    <dl className="aria-dashboard-metrics">
      {metrics.map((n,i)=><div key={w.metrics[i]}><dt>{w.metrics[i]}</dt><dd>{n.toLocaleString(lang==='en'?'en-US':lang==='fa'?'fa-AF':'ps-AF')}</dd></div>)}
    </dl>
    <nav className="aria-dashboard-actions" aria-label={w.account}>
      {w.actions.map((label,i)=>{if(!enable[i])return null;const Icon=icons[i];return <Link key={label} href={base+pathMap[i]}><Icon size={18}/><span>{label}</span><ArrowUpRight size={15}/></Link>;})}
    </nav>
    <div className="aria-dashboard-columns">
      <section className="aria-dashboard-card">
        <div className="aria-dashboard-card__head"><h3>{w.recent}</h3>{enable[1]?<Link href={base+'/matcher'}>{w.matches} →</Link>:null}</div>
        {p.notifications.length?
          <ul>{p.notifications.map(n=><li key={n.id}><Link href={'/'+lang+'/opportunities/'+encodeURIComponent(n.opportunity.slug)} dir="auto">
            {((n.opportunity.titleI18n as Record<string,string>|null)?.[lang])||n.opportunity.title}
          </Link>{n.opportunity.deadline?<time dateTime={n.opportunity.deadline.toISOString()}>{formatDateShort(n.opportunity.deadline,lang)}</time>:null}</li>)}</ul>:
          <p className="aria-empty-state">{w.empty}</p>}
      </section>
      <section className="aria-dashboard-card">
        <div className="aria-dashboard-card__head"><h3>{w.applications}</h3>{enable[4]?<Link href={base+'/career'}>{w.look} →</Link>:null}</div>
        {p.trackedApplications.length?<ul>{p.trackedApplications.map(a=><li key={a.id}><span dir="auto">{a.opportunityTitle}</span>
          <small>{a.status}{a.nextActionAt?' · '+formatDateShort(a.nextActionAt,lang):''}</small></li>)}</ul>:
        <p className="aria-empty-state">{w.empty}</p>}
      </section>
    </div>
    <div className="aria-dashboard-discovery">
      <PortalDiscovery profileId={p.id} lang={lang}/>
      <p className="aria-discovery-note"><BookmarkCheck size={15}/>{w.alertNote}</p>
    </div>
  </main>;
}
