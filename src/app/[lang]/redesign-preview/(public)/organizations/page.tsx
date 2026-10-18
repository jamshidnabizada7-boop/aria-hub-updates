import Link from 'next/link';
import {redirect} from 'next/navigation';
import {Building2,Search,ArrowUpRight,BadgeCheck} from 'lucide-react';
import {db} from '@/lib/db';
import {getLocalizedContent} from '@/lib/i18n-content';
import {OrganizationFollowButton} from '@/components/site/organization-follow';
import {currentApplicant,applicantEnabled} from '@/lib/applicant-auth';
import {isLang} from '@/lib/lang-route';

export const dynamic='force-dynamic';
const words={
 en:{eyebrow:'ORGANIZATIONS',title:'Discover the teams behind opportunities.',desc:'Explore active organizations and follow the ones that interest you.',search:'Search organizations',submit:'Search',all:'All organizations',following:'Following',active:'open opportunities',verified:'Verified organization',empty:'No organizations match your search.',previous:'Previous',next:'Next'},
 fa:{eyebrow:'سازمان‌ها',title:'سازمان‌های ارائه‌کنندۀ فرصت را بشناسید.',desc:'سازمان‌های فعال را جستجو و آن‌ها را دنبال کنید.',search:'جستجوی سازمان',submit:'جستجو',all:'همۀ سازمان‌ها',following:'دنبال‌شده‌ها',active:'فرصت فعال',verified:'سازمان تأییدشده',empty:'سازمانی پیدا نشد.',previous:'قبلی',next:'بعدی'},
 ps:{eyebrow:'ادارې',title:'د فرصتونو ادارې وپېژنئ.',desc:'فعالې ادارې وګورئ او د خپلې خوښې ادارې تعقیب کړئ.',search:'ادارې ولټوئ',submit:'لټون',all:'ټولې ادارې',following:'تعقیب شوې',active:'فعال فرصتونه',verified:'تایید شوې اداره',empty:'اداره ونه موندل شوه.',previous:'مخکینی',next:'راتلونکی'}
} as const;
export default async function OrganizationsPreview({params,searchParams}:{
 params:Promise<{lang:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>;
}){
 const {lang:raw}=await params,lang=isLang(raw)?raw:'en',sp=await searchParams,w=words[lang];
 const q=(typeof sp.q==='string'?sp.q:'').trim().slice(0,100);
 const page=Math.max(1,Math.min(1000,Number.parseInt(typeof sp.page==='string'?sp.page:'1',10)||1));
 const following=sp.following==='1';
 const user=following&&applicantEnabled()?await currentApplicant():null;
 if(following&&!user)redirect('/'+lang+'/login');
 const where={
  active:true,
  ...(q?{name:{contains:q,mode:'insensitive' as const}}:{}),
  ...(following?{followers:{some:{applicantProfile:{userId:user!.id}}}}:{}),
 };
 const [rows,total]=await Promise.all([
  db.organization.findMany({where,select:{id:true,name:true,nameI18n:true,slug:true,industry:true,country:true,verified:true,_count:{select:{opportunities:{where:{status:'published',OR:[{deadline:null},{deadline:{gte:new Date()}}]}}}}},orderBy:{name:'asc'},skip:(page-1)*24,take:24}),
  db.organization.count({where})
 ]);
 const base='/'+lang+'/redesign-preview/organizations';
 const href=(n:number)=>base+'?'+new URLSearchParams({q,page:String(n),...(following?{following:'1'}:{})}).toString();
 return <main id="main-content" className="aria-container aria-public-main">
  <header className="aria-public-hero"><div><span className="aria-public-hero__eyebrow">{w.eyebrow}</span><h1>{w.title}</h1><p>{w.desc}</p></div><Building2 size={44} aria-hidden="true"/></header>
  <nav className="aria-public-chips" aria-label={w.title}><Link aria-current={!following?'page':undefined} href={base}>{w.all}</Link><Link aria-current={following?'page':undefined} href={base+'?following=1'}>{w.following}</Link></nav>
  <form role="search" className="aria-public-search" method="get" action={base}>
   {following?<input type="hidden" name="following" value="1"/>:null}
   <Search size={19} aria-hidden="true" style={{marginInlineStart:10}}/>
   <input name="q" defaultValue={q} maxLength={100} placeholder={w.search} aria-label={w.search}/>
   <button className="aria-button" type="submit">{w.submit}</button>
  </form>
  {rows.length?<div className="aria-public-grid">{rows.map(org=><article key={org.id} className="aria-public-card">
   <span className="aria-public-card__icon"><Building2 size={23}/></span>
   <h2 dir="auto">{getLocalizedContent(org.name,org.nameI18n as Record<string,string>|null,lang)}</h2>
   <div className="aria-public-card__meta">{org.country?<span dir="auto">{org.country}</span>:null}{org.industry?<span dir="auto">{org.industry}</span>:null}</div>
   <p>{org._count.opportunities} {w.active}</p>
   {org.verified?<span className="aria-public-card__label"><BadgeCheck size={14}/>{w.verified}</span>:null}
   <Link className="aria-card-link" href={base+'/'+encodeURIComponent(org.slug)}>{w.title}<ArrowUpRight size={14}/></Link>
   <div style={{borderTop:'1px solid var(--aria-line)',paddingTop:12}}><OrganizationFollowButton organizationId={org.id} lang={lang}/></div>
  </article>)}</div>:<div className="aria-public-empty">{w.empty}</div>}
  <nav className="aria-public-pager" aria-label="Pages">{page>1?<Link href={href(page-1)}>{w.previous}</Link>:null}<span>{page} / {Math.max(1,Math.ceil(total/24))}</span>{page*24<total?<Link href={href(page+1)}>{w.next}</Link>:null}</nav>
 </main>;
}