import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Building2,BadgeCheck,ArrowUpRight} from 'lucide-react';
import {getPublicOrganization} from '@/lib/organizations/public-profile';
import {OrganizationFollowButton} from '@/components/site/organization-follow';
import {formatDateShort} from '@/lib/date-format';
import {isLang} from '@/lib/lang-route';
export const dynamic='force-dynamic';
const copy={
 en:{back:'All organizations',verified:'Verified organization',follow:'Follow',open:'Open opportunities',none:'No open opportunities from this organization.',website:'Official website',source:'Some description text is shown in its original language.'},
 fa:{back:'همۀ سازمان‌ها',verified:'سازمان تأییدشده',follow:'دنبال کردن',open:'فرصت‌های فعال',none:'فرصت فعالی از این سازمان موجود نیست.',website:'وب‌سایت رسمی',source:'بخشی از توضیحات به زبان اصلی نمایش داده شده است.'},
 ps:{back:'ټولې ادارې',verified:'تایید شوې اداره',follow:'تعقیب',open:'فعال فرصتونه',none:'د دې ادارې فعال فرصت نشته.',website:'رسمي وېب‌پاڼه',source:'ځینې معلومات په اصلي ژبه ښودل کېږي.'}
} as const;
export default async function OrganizationProfilePreview({params}:{params:Promise<{lang:string;slug:string}>}){
 const {lang:raw,slug}=await params,lang=isLang(raw)?raw:'en',w=copy[lang];
 const org=await getPublicOrganization(slug,lang);
 if(!org)notFound();
 const base='/'+lang+'/redesign-preview/organizations';
 const website=org.website && /^https?:\/\//i.test(org.website)?org.website:null;
 return <main id="main-content" className="aria-container aria-public-main">
  <p style={{fontSize:12,marginBottom:14}}><Link href={base}>← {w.back}</Link></p>
  <section className="aria-public-hero">
   <div><span className="aria-public-hero__eyebrow">{w.open}</span><h1 dir="auto">{org.name}</h1><p dir="auto">{[org.industry,org.country].filter(Boolean).join(' · ')}</p>
    {org.verified?<p style={{color:'#a3e5c7',fontWeight:700,marginTop:9}}><BadgeCheck size={16} style={{display:'inline'}}/> {w.verified}</p>:null}
   </div>
   <OrganizationFollowButton organizationId={org.id} lang={lang}/>
  </section>
  {org.description?<section className="aria-public-card" style={{marginBottom:20}}><div className="aria-public-card__label"><Building2 size={16}/>{org.name}</div><p dir="auto" style={{whiteSpace:'pre-line'}}>{org.description}</p>{org.descriptionIsOriginal?<small>{w.source}</small>:null}{website?<a className="aria-card-link" href={website} target="_blank" rel="noopener noreferrer">{w.website}<ArrowUpRight size={15}/></a>:null}</section>:null}
  <div className="aria-public-head"><h2>{w.open} ({org.opportunities.length})</h2></div>
  {org.opportunities.length?<div className="aria-public-grid">{org.opportunities.map(item=><article key={item.slug} className="aria-public-card">
    <h3 dir="auto">{item.title}</h3><div className="aria-public-card__meta">{item.location?<span>{item.location}</span>:null}{item.deadline?<span>{formatDateShort(item.deadline,lang)}</span>:null}</div>
    <Link className="aria-card-link" href={'/'+lang+'/redesign-preview/opportunities/'+encodeURIComponent(item.slug)}>{w.open}<ArrowUpRight size={15}/></Link>
  </article>)}</div>:<div className="aria-public-empty">{w.none}</div>}
 </main>;
}