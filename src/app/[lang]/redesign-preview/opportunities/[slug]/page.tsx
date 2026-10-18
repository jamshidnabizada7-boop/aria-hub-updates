import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, Building2, CalendarDays, MapPin, ShieldCheck } from 'lucide-react';
import { ariaRtl, ariaSans } from '@/components/site/redesign/aria-fonts';
import { AriaPreviewNav } from '@/components/site/redesign/aria-preview-nav';
import { AriaOpportunityCard } from '@/components/site/redesign/aria-opportunity-card';
import { DetailSaveButton } from '@/components/site/save-button';
import { getLocalizedContent } from '@/lib/i18n-content';
import { renderListingContent } from '@/lib/content-html';
import { formatDateShort } from '@/lib/date-format';
import { getOpportunityBySlug, getRelatedOpportunities, categoryLabel, isOpportunityExpired, daysUntilDeadline } from '@/lib/opportunity-queries';
import { classifyOpportunityApplyUrl, isRealApplyLink, normalizeApplyUrl } from '@/lib/apply';
import { isLang, type Lang } from '@/lib/lang-route';
import '@/components/site/redesign/aria-v2.css';
import '@/components/site/redesign/aria-directory.css';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'ARIA HUB — Opportunity detail redesign preview',robots:{index:false,follow:false}};

const words={
  en:{ home:'Home', all:'Opportunities', apply:'View & apply', original:'See full listing', how:'Application guidance', unavailable:'An application link has not been confirmed. Check the full listing for instructions; never send sensitive details to unverified contacts.', expired:'This opportunity has closed. Check the full listing before taking any action.', details:'At a glance', org:'Organization', location:'Location', deadline:'Deadline', type:'Category', requirements:'Requirements', eligibility:'Eligibility', overview:'Overview', responsibilities:'Responsibilities', benefits:'Benefits', instructions:'How to apply', missing:'No further details have been provided for this listing.', related:'Related opportunities', verifiedOrg:'Verified organization', verifiedSource:'Official source', today:'Last day', days:'days left', noDeadline:'Not specified' },
  fa:{ home:'خانه', all:'فرصت‌ها', apply:'مشاهده و درخواست', original:'مشاهده جزئیات کامل', how:'رهنمای درخواست', unavailable:'لینک معتبر درخواست تأیید نشده است. برای رهنمایی، صفحۀ اصلی فرصت را ببینید و معلومات حساس را به تماس‌های نامعتبر نفرستید.', expired:'مهلت این فرصت پایان یافته است. پیش از هر اقدام جزئیات کامل را بررسی کنید.', details:'معلومات مهم', org:'سازمان', location:'موقعیت', deadline:'مهلت', type:'دسته‌بندی', requirements:'شرایط', eligibility:'واجد شرایط بودن', overview:'معرفی', responsibilities:'مسئولیت‌ها', benefits:'امتیازات', instructions:'طرز درخواست', missing:'معلومات بیشتر برای این فرصت درج نشده است.', related:'فرصت‌های مشابه', verifiedOrg:'سازمان تأییدشده', verifiedSource:'منبع رسمی', today:'روز آخر', days:'روز باقی', noDeadline:'مشخص نیست' },
  ps:{ home:'کور', all:'فرصتونه', apply:'وګورئ او غوښتنه وکړئ', original:'بشپړ معلومات وګورئ', how:'د غوښتنلیک لارښود', unavailable:'د غوښتنلیک باوري لینک نه دی تایید شوی. بشپړ معلومات وګورئ او نامعلومو کسانو ته حساس معلومات مه ورکوئ.', expired:'د دې فرصت وروستۍ نېټه تېره شوې. له اقدام مخکې بشپړ معلومات وګورئ.', details:'لنډ معلومات', org:'اداره', location:'ځای', deadline:'وروستۍ نېټه', type:'ډول', requirements:'شرطونه', eligibility:'وړتیا', overview:'پېژندنه', responsibilities:'مسوولیتونه', benefits:'ګټې', instructions:'څنګه غوښتنه وکړئ', missing:'د دې فرصت نور معلومات نه دي ورکړل شوي.', related:'ورته فرصتونه', verifiedOrg:'تایید شوې اداره', verifiedSource:'رسمي سرچینه', today:'وروستۍ ورځ', days:'ورځې پاتې', noDeadline:'نه ده ټاکل شوې' }
} as const;

export default async function AriaDetailPreview({params}:{params:Promise<{lang:string;slug:string}>}) {
  if(process.env.ARIA_REDESIGN_PREVIEW_ENABLED!=='true') notFound();
  const {lang:raw,slug}=await params;
  if(!isLang(raw)) notFound();
  const lang:Lang=raw;
  const w=words[lang];
  const opp=await getOpportunityBySlug(slug);
  if(!opp) notFound();
  const local=(base:string|null|undefined,translated:unknown)=>getLocalizedContent(base||'',translated as Record<string,string>|null,lang);
  const title=local(opp.title,opp.titleI18n);
  const desc=local(opp.description,opp.descriptionI18n);
  const expired=isOpportunityExpired(opp.status,opp.deadline);
  const days=opp.deadline ? daysUntilDeadline(opp.deadline) : null;
  const related=await getRelatedOpportunities(opp,lang,4);
  const category=categoryLabel(lang,opp.category?.slug,opp.category?.name,opp.category?.nameI18n);
  const labels=[
    {key:'overview',label:w.overview,value:desc},
    {key:'requirements',label:w.requirements,value:local(opp.requirements,opp.requirementsI18n)},
    {key:'eligibility',label:w.eligibility,value:local(opp.eligibility,opp.eligibilityI18n)},
    {key:'responsibilities',label:w.responsibilities,value:local(opp.responsibilities,opp.responsibilitiesI18n)},
    {key:'benefits',label:w.benefits,value:local(opp.benefits,opp.benefitsI18n)},
    {key:'instructions',label:w.instructions,value:local(opp.guidelines,opp.guidelinesI18n)},
  ].filter(s=>s.value && s.value.replace(/<[^>]+>/g,' ').trim());
  const destination=normalizeApplyUrl(opp.applyUrl);
  const validApply=!!destination && isRealApplyLink(classifyOpportunityApplyUrl(opp)) &&
    /^(https?:\/\/|mailto:|tel:)/i.test(destination);
  // Native employer applications are supported by the full public detail page.
  const direct=validApply && !expired && !(opp.acceptsNativeApplications&&opp.sourceName==='Employer'&&opp.organizationId);
  const canonical=`/${lang}/opportunities/${encodeURIComponent(opp.slug)}`;
  const direction=lang==='en'?ArrowLeft:ArrowRight;
  const Back=direction;
  return <div className={ariaSans.variable+' '+ariaRtl.variable}>
    <div className="aria-v2 aria-directory" dir={lang==='en'?'ltr':'rtl'} lang={lang}>
      <AriaPreviewNav lang={lang} preview/>
      <main id="main-content" className="aria-container">
        <nav className="aria-detail-breadcrumb" aria-label={w.all}>
          <Link href={'/'+lang+'/redesign-preview'}>{w.home}</Link>
          <span aria-hidden="true">/</span>
          <Link href={'/'+lang+'/redesign-preview/opportunities'}>{w.all}</Link>
          <span aria-hidden="true">/</span>
          <span dir="auto">{title}</span>
        </nav>
        <header className="aria-detail-head">
          <div className="aria-result-card__badges">
            <span className="aria-tag">{category}</span>
            {opp.featured?<span className="aria-tag aria-tag--orange">{lang==='en'?'Promoted':lang==='fa'?'ویژه':'ځانګړی'}</span>:null}
            {opp.verificationStatus==='verified_official' ? <span className="aria-tag aria-tag--new"><ShieldCheck size={14}/> {w.verifiedSource}</span> :
             opp.verificationStatus==='verified_employer' ? <span className="aria-tag aria-tag--new"><ShieldCheck size={14}/> {w.verifiedOrg}</span>:null}
          </div>
          <h1 dir="auto">{title}</h1>
          <div className="aria-detail-head__meta">
            {opp.organization?<span><Building2 size={16}/><span dir="auto">{opp.organization}</span></span>:null}
            {opp.country?<span><MapPin size={16}/><span dir="auto">{opp.country}</span></span>:null}
            {opp.deadline?<span><CalendarDays size={16}/>{formatDateShort(opp.deadline,lang)}</span>:null}
          </div>
        </header>
        <div className="aria-detail-layout">
          <div className="aria-detail-body">
            {labels.length ? labels.map(section=>(
              <section className="aria-detail-section" key={section.key}>
                <h2>{section.label}</h2>
                <div className="aria-detail-content" dir="auto" dangerouslySetInnerHTML={{__html:renderListingContent(section.value)}} />
              </section>
            )) : <section className="aria-detail-section"><h2>{w.overview}</h2><p>{w.missing}</p></section>}
            <Link className="aria-button aria-button--outline" href={'/'+lang+'/redesign-preview/opportunities'} style={{justifySelf:'start'}}><Back size={16}/>{w.all}</Link>
            {related.length>0?<section className="aria-detail-section">
              <h2>{w.related}</h2><div className="aria-related-grid">{related.map(item=><AriaOpportunityCard lang={lang} key={item.id} item={item}/>)}</div>
            </section>:null}
          </div>
          <aside className="aria-detail-sidebar" aria-label={w.details}>
            <h2>{w.details}</h2>
            {expired?<p className="aria-detail-notice aria-detail-notice--expired">{w.expired}</p>:null}
            <dl>
              {opp.organization?<div><dt>{w.org}</dt><dd dir="auto">{opp.organization}</dd></div>:null}
              {opp.country?<div><dt>{w.location}</dt><dd dir="auto">{[...new Set(opp.locations.map(l=>l.province).filter(Boolean))].join(', ')||opp.country}</dd></div>:null}
              <div><dt>{w.type}</dt><dd dir="auto">{category}</dd></div>
              <div><dt>{w.deadline}</dt><dd>{opp.deadline?formatDateShort(opp.deadline,lang):w.noDeadline}</dd></div>
              {days!==null&&!expired?<div><dt>{w.deadline}</dt><dd>{days<=0?w.today:`${days} ${w.days}`}</dd></div>:null}
            </dl>
            {direct?<a href={destination!} className="aria-button aria-button--orange" target={destination!.startsWith('http')?'_blank':undefined} rel={destination!.startsWith('http')?'noopener noreferrer':undefined}>
              {w.apply}<ArrowUpRight size={16}/>
            </a>:<p className="aria-detail-notice">{expired?w.expired:w.unavailable}</p>}
            <Link href={canonical} className="aria-button aria-button--outline">{direct?w.how:w.original}<ArrowUpRight size={16}/></Link>
            <DetailSaveButton slug={opp.slug}/>
          </aside>
        </div>
      </main>
    </div>
  </div>;
}
