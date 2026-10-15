import Link from 'next/link';
import { Building2, Search } from 'lucide-react';
import { PageBackLink, SitePagination, secondaryActionClass } from '@/components/site/page-navigation';
import {OrganizationFollowButton} from '@/components/site/organization-follow';
import {db} from '@/lib/db';
import {currentApplicant,applicantEnabled} from '@/lib/applicant-auth';
import {redirect} from 'next/navigation';
import {PageShell} from '@/components/site/page-shell';
import {getLocalizedContent} from '@/lib/i18n-content';
import {isLang} from '@/lib/lang-route';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}){const {lang}=await params;return {title:lang==='fa'?'سازمان‌ها | آریا هاب':lang==='ps'?'ادارې | آریا هاب':'Organizations | ARIA HUB',alternates:{canonical:`/${lang}/organizations`}};}
export default async function OrganizationsPage({params,searchParams}:{params:Promise<{lang:string}>;searchParams:Promise<{q?:string;page?:string;following?:string}>}){
 const raw=await params,lang=isLang(raw.lang)?raw.lang:'fa',query=await searchParams;
 const q=(query.q||'').trim().slice(0,100),page=Math.min(1000,Math.max(1,Number.parseInt(query.page||'1')||1));
 const onlyFollowing=query.following==='1';
 const user=onlyFollowing&&applicantEnabled()?await currentApplicant():null;if(onlyFollowing&&!user)redirect('/'+lang+'/login');
 const where={active:true,...(onlyFollowing?{followers:{some:{applicantProfile:{userId:user!.id}}}}:{}),...(q?{name:{contains:q,mode:'insensitive' as const}}:{})};
 const [rows,total]=await Promise.all([db.organization.findMany({where,select:{id:true,logoUrl:true,industry:true,slug:true,name:true,nameI18n:true,country:true,verified:true,_count:{select:{opportunities:{where:{status:'published',OR:[{deadline:null},{deadline:{gte:new Date()}}]}}}}},orderBy:{name:'asc'},skip:(page-1)*40,take:40}),db.organization.count({where})]);
 const c={en:{title:'Organizations',search:'Search organizations',submit:'Search',active:'active opportunities',none:'No organizations found.',previous:'Previous',next:'Next',verified:'Verified'},fa:{title:'سازمان‌ها',search:'جستجوی سازمان‌ها',submit:'جستجو',active:'فرصت فعال',none:'سازمانی پیدا نشد.',previous:'قبلی',next:'بعدی',verified:'تأییدشده'},ps:{title:'ادارې',search:'ادارې ولټوئ',submit:'لټون',active:'فعال فرصتونه',none:'اداره ونه موندل شوه.',previous:'مخکینی',next:'راتلونکی',verified:'تایید شوې'}}[lang];
 const pageLink=(n:number)=>`/${lang}/organizations?${new URLSearchParams({q,page:String(n),...(onlyFollowing?{following:'1'}:{})})}`;
 if (page > 1 && (page - 1) * 40 >= total) redirect(pageLink(Math.max(1, Math.ceil(total / 40))));
 return <PageShell lang={lang}><div className="mx-auto max-w-6xl px-4 sm:px-6">
  <PageBackLink lang={lang} className="mb-6" />
  <header className="rounded-3xl brand-panel p-6 sm:p-8">
   <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-6 w-6" aria-hidden="true" /></div>
   <h1 className="text-3xl font-bold sm:text-4xl">{c.title}</h1>
   <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{lang==='fa'?'سازمان‌ها را بشناسید، فرصت‌های فعال‌شان را ببینید و سازمان‌های دلخواه را دنبال کنید.':lang==='ps'?'ادارې وپېژنئ، فعال فرصتونه یې وګورئ او د خپلې خوښې ادارې تعقیب کړئ.':'Explore organizations, view their active opportunities, and follow the teams that interest you.'}</p>
  </header>
  <nav aria-label={c.title} className="my-6 flex flex-wrap gap-2">
   <Link aria-current={!onlyFollowing?'page':undefined} className={secondaryActionClass+(!onlyFollowing?' border-primary bg-primary/10 text-primary':'')} href={'/'+lang+'/organizations'}>{lang==='fa'?'همۀ سازمان‌ها':lang==='ps'?'ټولې ادارې':'All organizations'}</Link>
   <Link aria-current={onlyFollowing?'page':undefined} className={secondaryActionClass+(onlyFollowing?' border-primary bg-primary/10 text-primary':'')} href={'/'+lang+'/organizations?following=1'}>{lang==='fa'?'دنبال‌شده‌ها':lang==='ps'?'تعقیب شوې':'Following'}</Link>
  </nav>
  <form className="mb-6 flex gap-2">{onlyFollowing&&<input type="hidden" name="following" value="1"/>}
   <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute start-4 top-4 h-5 w-5 text-muted-foreground" aria-hidden="true"/><input aria-label={c.search} name="q" defaultValue={q} maxLength={100} placeholder={c.search} className="min-h-12 w-full rounded-xl border bg-card py-3 pe-4 ps-12 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"/></div>
   <button className="min-h-12 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{c.submit}</button>
  </form>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(org=><article key={org.slug} className="flex flex-col rounded-2xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-md">
   <Link href={`/${lang}/organizations/${org.slug}`} className="flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
    {org.logoUrl?<img src={org.logoUrl} alt="" className="mb-4 h-14 w-14 rounded-xl border bg-white object-contain"/>:<div className="mb-4 grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-xl font-bold text-primary">{org.name.slice(0,1)}</div>}
    <h2 dir="auto" className="font-bold">{getLocalizedContent(org.name,org.nameI18n as Record<string,string>|null,lang)}</h2>
    {org.country&&<p dir="auto" className="mt-2 text-sm text-muted-foreground">{org.country}</p>}
    <p className="mt-3 text-sm">{org._count.opportunities} {c.active}</p>
    {org.verified&&<span className="mt-2 inline-block text-xs text-emerald-700 dark:text-emerald-400">✓ {c.verified}</span>}
    {org.industry&&<p className="mt-2 text-sm text-muted-foreground">{org.industry}</p>}
   </Link><div className="mt-5 border-t pt-4"><OrganizationFollowButton organizationId={org.id} lang={lang}/></div>
  </article>)}</div>
  {!rows.length&&<div className="rounded-2xl border border-dashed p-8 text-center"><p className="text-muted-foreground">{c.none}</p>{q&&<Link className={secondaryActionClass+' mt-5'} href={`/${lang}/organizations${onlyFollowing?'?following=1':''}`}>{lang==='fa'?'پاک کردن جستجو':lang==='ps'?'لټون پاک کړئ':'Clear search'}</Link>}</div>}
  <SitePagination lang={lang} page={page} totalPages={Math.ceil(total/40)} previousHref={page>1?pageLink(page-1):undefined} nextHref={page*40<total?pageLink(page+1):undefined}/>
 </div></PageShell>;
}
