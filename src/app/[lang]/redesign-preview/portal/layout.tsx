import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BriefcaseBusiness, Bell, FileText, ScanSearch, Settings, UserRound, Files } from 'lucide-react';
import { applicantEnabled, currentApplicant } from '@/lib/applicant-auth';
import { isLang, type Lang } from '@/lib/lang-route';
import { ariaRtl, ariaSans } from '@/components/site/redesign/aria-fonts';
import { AriaPreviewNav } from '@/components/site/redesign/aria-preview-nav';
import '@/components/site/redesign/aria-v2.css';
import '@/components/site/redesign/aria-portal.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'ARIA HUB — Private career workspace preview',
  robots: {index:false, follow:false},
};

const copy = {
  en: {heading:'My workspace', description:'Your profile, opportunities, CVs and applications in one place.', tabs:['Overview','My profile','Opportunity matcher','My CVs','CV Builder','Applications','Notifications','Settings']},
  fa: {heading:'فضای کاری من', description:'مشخصات، فرصت‌ها، سی‌وی‌ها و درخواست‌های خود را در یک‌جا مدیریت کنید.', tabs:['نمای کلی','مشخصات من','فرصت‌های مناسب','سی‌وی‌های من','ساخت سی‌وی','درخواست‌ها','اطلاع‌رسانی‌ها','تنظیمات']},
  ps: {heading:'زما کاري ځای', description:'معلومات، فرصتونه، سي وي ګانې او غوښتنلیکونه په یوه ځای کې تنظیم کړئ.', tabs:['لنډیز','زما معلومات','مناسب فرصتونه','زما سي وي ګانې','سي وي جوړول','غوښتنلیکونه','خبرتیاوې','تنظیمات']},
} as const;

const tabs=[
  {path:'',icon:BriefcaseBusiness,requires:null},
  {path:'/profile',icon:UserRound,requires:null},
  {path:'/matcher',icon:ScanSearch,requires:'APPLICANT_MATCHER_V3_ENABLED'},
  {path:'/cvs',icon:Files,requires:'CLOUD_CV_STORAGE_ENABLED'},
  {path:'/cv-builder',icon:FileText,requires:null},
  {path:'/career',icon:BriefcaseBusiness,requires:'APPLICANT_CAREER_V5_ENABLED'},
  {path:'/notifications',icon:Bell,requires:'APPLICANT_NOTIFICATIONS_ENABLED'},
  {path:'/settings',icon:Settings,requires:null},
] as const;

export default async function AriaWorkspaceLayout({children,params}:{
  children:React.ReactNode;
  params:Promise<{lang:string}>;
}) {
  if (process.env.ARIA_REDESIGN_PREVIEW_ENABLED!=='true') notFound();
  const {lang:raw}=await params;
  if(!isLang(raw)) notFound();
  const lang:Lang=raw;
  if(!applicantEnabled()) redirect('/'+lang+'/get-started');
  const user=await currentApplicant();
  if(!user) redirect('/'+lang+'/login');
  const base='/'+lang+'/redesign-preview/portal';
  const t=copy[lang];
  return (
    <div className={ariaSans.variable+' '+ariaRtl.variable}>
      <div className="aria-v2 aria-portal" lang={lang} dir={lang==='en'?'ltr':'rtl'}>
        <AriaPreviewNav lang={lang} preview />
        <div className="aria-container">
          <header className="aria-workspace-heading">
            <div>
              <p className="aria-eyebrow">ARIA HUB</p>
              <h1>{t.heading}</h1>
              <p>{t.description}</p>
            </div>
            <span className="aria-workspace-identity" dir="auto">{user.name||user.email||'Account'}</span>
          </header>
          <nav className="aria-portal-tabs" aria-label={t.heading}>
            {tabs.map((tab,i)=>{
              if(tab.requires && process.env[tab.requires]!=='true') return null;
              const Icon=tab.icon;
              return <Link key={tab.path} href={base+tab.path}>
                <Icon size={16} aria-hidden="true"/><span>{t.tabs[i]}</span>
              </Link>;
            })}
          </nav>
          <div className="aria-workspace-body">{children}</div>
          <footer className="aria-workspace-footer"><span>ARIA HUB · Private workspace</span><Link href={'/'+lang+'/redesign-preview'}>{lang==='en'?'Back to home':lang==='fa'?'بازگشت به خانه':'کور ته ستنېدل'}</Link></footer>
        </div>
      </div>
    </div>
  );
}
