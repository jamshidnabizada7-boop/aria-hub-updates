import Link from 'next/link';
import { ArrowRight, Search, FileText, ScanSearch, Building2, Check, Compass } from 'lucide-react';
import { JourneyShell } from '@/components/site/journey-shell';
import { applicantEnabled } from '@/lib/applicant-auth';
import { smtpConfigured } from '@/lib/mailer';
export const dynamic = 'force-dynamic';
const copy = {
 en: { eyebrow:'YOUR NEXT CHAPTER', title:'Your ambition. A clear next step.', intro:'Find the right opportunity, tell your story with a strong CV, or connect your team with new talent.', choose:'What brings you here?', hint:'Choose a starting point. You can explore the rest at any time.', titles:['Find opportunities','Build a professional CV','Find your best matches','Hire for your team'], descriptions:['Explore jobs, scholarships and training in one place.','Turn your experience into a polished, ready-to-share CV.','Discover opportunities that fit your skills and interests.','Create a clear job post and send it to our team for review.'], actions:['Explore opportunities','Start my CV','Match opportunities','Post a job'], free:'Explore without an account', languages:'English · فارسی · پښتو', account:'Already part of ARIA HUB?', accountHint:'Return to your profile, saved searches and applications.', login:'Log in', register:'Create free account'},
 fa: { eyebrow:'گام بعدی شما', title:'آرزوهای شما، یک گام روشن.', intro:'فرصت مناسب را پیدا کنید، با یک سی‌وی حرفه‌ای خود را معرفی کنید یا استعدادهای تازه را به تیم خود بیاورید.', choose:'چگونه می‌توانیم کمک کنیم؟', hint:'نقطۀ آغاز خود را انتخاب کنید. هر زمان می‌توانید بخش‌های دیگر را ببینید.', titles:['جستجوی فرصت‌ها','ساخت سی‌وی حرفه‌ای','یافتن فرصت‌های مناسب','استخدام برای تیم شما'], descriptions:['وظایف، بورسیه‌ها و آموزش‌ها را در یک‌جا ببینید.','تجربه‌های خود را به یک سی‌وی منظم و آماده تبدیل کنید.','فرصت‌های متناسب با مهارت‌ها و علاقه‌های خود را بیابید.','آگهی وظیفه بسازید و برای بررسی به تیم ما بفرستید.'], actions:['دیدن فرصت‌ها','ساخت سی‌وی','تطبیق فرصت‌ها','ثبت وظیفه'], free:'جستجو بدون حساب', languages:'English · فارسی · پښتو', account:'قبلاً به آریا هاب پیوسته‌اید؟', accountHint:'به مشخصات، جستجوهای ذخیره‌شده و درخواست‌های خود برگردید.', login:'ورود', register:'ساخت حساب رایگان'},
 ps: { eyebrow:'ستاسو راتلونکی ګام', title:'ستاسو هیله، یو روښانه ګام.', intro:'مناسب فرصت ومومئ، په مسلکي سي وي خپله تجربه وړاندې کړئ، یا خپل ټیم ته نوي استعدادونه ومومئ.', choose:'څنګه مرسته درسره وکړو؟', hint:'د پیل ځای وټاکئ. نورې برخې هر وخت کتلای شئ.', titles:['فرصتونه ولټوئ','مسلکي سي وي جوړ کړئ','مناسب فرصتونه ومومئ','خپل ټیم ته کسان وګومارئ'], descriptions:['دندې، بورسونه او روزنې په یوه ځای کې وګورئ.','خپله تجربه په منظم او چمتو سي وي بدله کړئ.','له خپلو مهارتونو او خوښو سره برابر فرصتونه ومومئ.','د دندې اعلان جوړ او زموږ ټیم ته د کتنې لپاره ولېږئ.'], actions:['فرصتونه وګورئ','سي وي پیل کړئ','فرصتونه برابر کړئ','دنده خپره کړئ'], free:'له حساب پرته لټون', languages:'English · فارسی · پښتو', account:'له آریا هاب سره حساب لرئ؟', accountHint:'خپلو معلوماتو، خوندي لټونونو او غوښتنلیکونو ته ستانه شئ.', login:'ننوتل', register:'وړیا حساب جوړول'}
};
export default async function Page({params}:{params:Promise<{lang:string}>}) {
 const {lang:l}=await params; const lang=l==='en'||l==='ps'?l:'fa'; const t=copy[lang];
 const paths=['/opportunities','/cv-builder','/opportunity-matcher','/employers/post'];
 const icons=[Search,FileText,ScanSearch,Building2];
 return <JourneyShell><main id="main-content" className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14" dir={lang==='en'?'ltr':'rtl'}>
  <section className="relative overflow-hidden rounded-3xl bg-[#102c46] px-6 py-10 text-white sm:p-12">
   <div aria-hidden="true" className="pointer-events-none absolute -end-20 -top-28 h-80 w-80 rounded-full border-[48px] border-white/[0.04]"/>
   <div className="relative max-w-2xl"><p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-sky-200"><Compass className="h-4 w-4"/>{t.eyebrow}</p>
    <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">{t.title}</h1>
    <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">{t.intro}</p>
    <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-sky-100"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-teal-300"/>{t.free}</span><span dir="ltr">{t.languages}</span></div>
   </div>
  </section>
  <div className="mb-6 mt-10"><h2 className="text-2xl font-bold tracking-tight">{t.choose}</h2><p className="mt-2 text-sm text-muted-foreground">{t.hint}</p></div>
  <div className="grid gap-4 sm:grid-cols-2">{paths.map((path,i)=>{const Icon=icons[i];return <Link key={path} href={'/'+lang+path} className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:p-7">
   <div className="mb-5 flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-6 w-6" aria-hidden="true"/></span><span aria-hidden="true" className="font-mono text-xs text-muted-foreground">0{i+1}</span></div>
   <h3 className="text-xl font-semibold tracking-tight">{t.titles[i]}</h3><p className="mb-6 mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{t.descriptions[i]}</p>
   <span className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-sm font-semibold text-primary">{t.actions[i]}<ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"/></span>
  </Link>})}</div>
  {applicantEnabled()&&<section className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-muted/40 p-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{t.account}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{t.accountHint}</p></div><div className="flex shrink-0 flex-wrap gap-3"><Link href={'/'+lang+'/login'} className="journey-secondary">{t.login}<ArrowRight className="h-4 w-4 rtl:-scale-x-100"/></Link>{smtpConfigured()&&<Link href={'/'+lang+'/register'} className="journey-primary">{t.register}</Link>}</div></section>}
 </main></JourneyShell>;
}
