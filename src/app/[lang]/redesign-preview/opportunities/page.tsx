import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Bookmark, CalendarClock, Search, SlidersHorizontal, X } from 'lucide-react';
import { isLang, type Lang } from '@/lib/lang-route';
import { getFacets, listOpportunities, type OpportunitySort } from '@/lib/opportunity-queries';
import { AriaPreviewNav } from '@/components/site/redesign/aria-preview-nav';
import { AriaOpportunityResults, type AriaFeedFilters } from '@/components/site/redesign/aria-opportunity-results';
import { ariaSans, ariaRtl } from '@/components/site/redesign/aria-fonts';
import '@/components/site/redesign/aria-v2.css';
import '@/components/site/redesign/aria-directory.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'ARIA HUB — Opportunity directory redesign preview',
  robots: { index: false, follow: false },
};
const perPage=12;
const word = {
  en: { eyebrow:'DISCOVER OPPORTUNITIES', title:'Your next chance is already here.', subtitle:'Browse real jobs, scholarships, internships and other opportunities.', placeholder:'Job title, organization or keyword', search:'Search', all:'All', filter:'Filters', country:'Country', province:'Province', deadline:'Deadline', any:'Any', next7:'Next 7 days', next30:'Next 30 days', next90:'Next 90 days', sort:'Sort by', newest:'Newest first', closing:'Deadline first', alphabetical:'Title A–Z', showClosed:'Include expired listings', apply:'Apply filters', reset:'Clear filters', found:'results found', noItems:'No opportunities match these filters.', tryAgain:'Try removing a filter or changing your search.', saved:'Saved', deadlines:'Deadlines', page:'Page', of:'of', previous:'Previous', next:'Next', allCountries:'All countries' },
  fa: { eyebrow:'کشف فرصت‌ها', title:'فرصت بعدی شما همین‌جاست.', subtitle:'وظایف، بورسیه‌ها، کارآموزی‌ها و فرصت‌های واقعی را پیدا کنید.', placeholder:'عنوان، سازمان یا کلمۀ کلیدی', search:'جستجو', all:'همه', filter:'فیلترها', country:'کشور', province:'ولایت', deadline:'مهلت', any:'فرقی ندارد', next7:'۷ روز آینده', next30:'۳۰ روز آینده', next90:'۹۰ روز آینده', sort:'ترتیب', newest:'تازه‌ترین', closing:'نزدیک‌ترین مهلت', alphabetical:'عنوان الفبایی', showClosed:'نمایش فرصت‌های پایان‌یافته', apply:'اعمال فیلترها', reset:'حذف فیلترها', found:'نتیجه یافت شد', noItems:'فرصتی با این فیلترها یافت نشد.', tryAgain:'جستجو را تغییر دهید یا یک فیلتر را حذف کنید.', saved:'ذخیره‌شده‌ها', deadlines:'مهلت‌ها', page:'صفحه', of:'از', previous:'قبلی', next:'بعدی', allCountries:'همه کشورها' },
  ps: { eyebrow:'فرصتونه ومومئ', title:'ستاسو راتلونکی فرصت همدلته دی.', subtitle:'دندې، بورسونه، کارآموزۍ او نور واقعي فرصتونه وګورئ.', placeholder:'دنده، اداره یا کلیمه', search:'لټون', all:'ټول', filter:'چاڼونه', country:'هېواد', province:'ولایت', deadline:'وروستۍ نېټه', any:'ټول', next7:'راتلونکې ۷ ورځې', next30:'راتلونکې ۳۰ ورځې', next90:'راتلونکې ۹۰ ورځې', sort:'ترتیب', newest:'تر ټولو نوي', closing:'ژر پای ته رسېږي', alphabetical:'د نوم له مخې', showClosed:'تېر شوي فرصتونه هم وښایئ', apply:'چاڼونه پلي کړئ', reset:'چاڼونه پاک کړئ', found:'پایلې وموندل شوې', noItems:'د دې چاڼونو لپاره فرصت ونه موندل شو.', tryAgain:'لټون بدل کړئ یا یو چاڼ لرې کړئ.', saved:'خوندي شوي', deadlines:'نېټې', page:'پاڼه', of:'له', previous:'مخکینۍ', next:'راتلونکې', allCountries:'ټول هېوادونه' }
} as const;

const first=(p:string|string[]|undefined)=>Array.isArray(p)?p[0]:p;
export default async function AriaDirectoryPreview({params,searchParams}:{
  params:Promise<{lang:string}>;
  searchParams:Promise<Record<string,string|string[]|undefined>>;
}) {
  if(process.env.ARIA_REDESIGN_PREVIEW_ENABLED !== 'true') notFound();
  const {lang:rawLang}=await params;
  if(!isLang(rawLang)) notFound();
  const lang:Lang=rawLang;
  const w=word[lang];
  const raw=await searchParams;
  const q=(first(raw.q)||'').trim().slice(0,180);
  const category=(first(raw.category)||'all').slice(0,80);
  const country=(first(raw.country)||first(raw.location)||'all').slice(0,100);
  const province=(first(raw.province)||'').slice(0,100);
  const deadline=['7','30','90'].includes(first(raw.deadline)||'') ? first(raw.deadline)! : '';
  const sort:OpportunitySort=['deadline','title'].includes(first(raw.sort)||'') ? first(raw.sort) as OpportunitySort : 'newest';
  const show=first(raw.show)==='expired'||first(raw.show)==='all' ? 'expired' : '';
  const requestedPage=Math.max(1,Math.min(10000,Number.parseInt(first(raw.page)||'1',10)||1));
  const [facets,initial]=await Promise.all([
    getFacets(lang),
    listOpportunities({lang,q,category,country,province,deadlineDays:deadline?Number(deadline):undefined,sort,includeExpired:!!show,page:requestedPage,perPage}),
  ]);
  const list=initial.total>0 && initial.items.length===0 && requestedPage>initial.totalPages ?
    await listOpportunities({lang,q,category,country,province,deadlineDays:deadline?Number(deadline):undefined,sort,includeExpired:!!show,page:initial.totalPages,perPage}) : initial;
  const filter:AriaFeedFilters={category,q,country,province,deadline,sort,show};
  const base=`/${lang}/redesign-preview/opportunities`;
  const href=(change:Record<string,string|null>)=>{
    const v:Record<string,string|null>={...filter,page:String(list.page),...change};
    if(v.category==='all') v.category=null;
    if(v.country==='all') v.country=null;
    if(v.sort==='newest') v.sort=null;
    if(v.page==='1') v.page=null;
    const sp=new URLSearchParams();
    Object.entries(v).forEach(([key,val])=>{if(val)sp.set(key,val);});
    return base + (sp.size ? '?' + sp.toString():'');
  };
  const provinces=facets.provinces.filter(p=>country==='all'||p.country===country);
  const uniqueProvinces=[...new Set(provinces.map(p=>p.name))].sort((a,b)=>a.localeCompare(b));
  const countries=[...new Set(facets.locations.map(l=>l.name).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const active=[category!=='all',!!q,country!=='all',!!province,!!deadline,sort!=='newest',!!show].filter(Boolean).length;
  const arrows=lang==='en'?{prev:ArrowLeft,next:ArrowRight}:{prev:ArrowRight,next:ArrowLeft};
  const Prev=arrows.prev, Next=arrows.next;
  const current=Math.max(1,list.page);
  const pages=Array.from({length:Math.max(0,Math.min(5,list.totalPages))},(_,i)=>Math.max(1,Math.min(current-2,Math.max(1,list.totalPages-4)))+i).filter(p=>p<=list.totalPages);
  return <div className={ariaSans.variable+' '+ariaRtl.variable}>
    <div className="aria-v2 aria-directory" lang={lang} dir={lang==='en'?'ltr':'rtl'}>
      <AriaPreviewNav lang={lang} preview/>
      <main id="main-content" className="aria-container">
        <header className="aria-directory-hero">
          <span className="aria-eyebrow">{w.eyebrow}</span>
          <div className="aria-directory-hero__head">
            <div><h1>{w.title}</h1><p>{w.subtitle}</p></div>
            <div className="aria-directory-actions">
              <Link href={'/'+lang+'/opportunities/saved'}><Bookmark size={17}/>{w.saved}</Link>
              <Link href={'/'+lang+'/deadlines'}><CalendarClock size={17}/>{w.deadlines}</Link>
            </div>
          </div>
          <form role="search" action={base} method="get" className="aria-directory-search">
            {category!=='all'&&<input type="hidden" name="category" value={category}/>}
            {country!=='all'&&<input type="hidden" name="country" value={country}/>}
            {province&&<input type="hidden" name="province" value={province}/>}
            {deadline&&<input type="hidden" name="deadline" value={deadline}/>}
            {sort!=='newest'&&<input type="hidden" name="sort" value={sort}/>}
            {show&&<input type="hidden" name="show" value={show}/>}
            <Search size={20} aria-hidden="true"/>
            <input name="q" type="search" defaultValue={q} placeholder={w.placeholder} aria-label={w.placeholder}/>
            <button type="submit" className="aria-button">{w.search}</button>
          </form>
          <nav className="aria-directory-categories" aria-label={w.filter}>
            <Link aria-current={category==='all'?'page':undefined} className={category==='all'?'is-active':''} href={href({category:null,page:null})}>{w.all} <span>{facets.totalActive}</span></Link>
            {facets.categories.filter(f=>f.count>0||f.slug===category).map(f=><Link key={f.slug} aria-current={category===f.slug?'page':undefined} className={category===f.slug?'is-active':''} href={href({category:f.slug,page:null})}>{f.name} <span>{f.count}</span></Link>)}
          </nav>
        </header>
        <section className="aria-directory-panel" aria-label={w.filter}>
          <details className="aria-filter-details" open>
            <summary><SlidersHorizontal size={17}/>{w.filter}{active>0?<span className="aria-filter-count">{active}</span>:null}</summary>
            <form method="get" action={base} className="aria-filter-form">
              {category!=='all'&&<input type="hidden" name="category" value={category}/>}
              {q&&<input type="hidden" name="q" value={q}/>}
              <label>{w.country}
                <select name="country" defaultValue={country}><option value="all">{w.allCountries}</option>{countries.map(item=><option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label>{w.province}
                <select name="province" defaultValue={uniqueProvinces.includes(province)?province:''}><option value="">{w.any}</option>{uniqueProvinces.map(item=><option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label>{w.deadline}
                <select name="deadline" defaultValue={deadline}><option value="">{w.any}</option><option value="7">{w.next7}</option><option value="30">{w.next30}</option><option value="90">{w.next90}</option></select>
              </label>
              <label>{w.sort}
                <select name="sort" defaultValue={sort}><option value="newest">{w.newest}</option><option value="deadline">{w.closing}</option><option value="title">{w.alphabetical}</option></select>
              </label>
              <label className="aria-filter-check"><input type="checkbox" name="show" value="expired" defaultChecked={!!show}/>{w.showClosed}</label>
              <button type="submit" className="aria-button">{w.apply}</button>
              <Link className="aria-filter-reset" href={base}><X size={15}/>{w.reset}</Link>
            </form>
          </details>
        </section>
        <div className="aria-directory-heading">
          <h2><span>{list.total.toLocaleString(lang==='en'?'en-US':lang==='fa'?'fa-AF':'ps-AF')}</span> {w.found}</h2>
          {active>0?<Link href={base} className="aria-filter-reset">{w.reset} <X size={14}/></Link>:null}
        </div>
        {list.items.length ? <AriaOpportunityResults key={JSON.stringify({...filter,page:list.page})} lang={lang} filters={filter} initialItems={list.items} initialPage={list.page} totalPages={list.totalPages}/> :
          <div className="aria-directory-empty"><Search size={26}/><h3>{w.noItems}</h3><p>{w.tryAgain}</p><Link className="aria-button" href={base}>{w.reset}</Link></div>}
        {list.totalPages>1&&<nav className="aria-directory-pagination" aria-label={w.page}>
          {current>1?<Link href={href({page:String(current-1)})}><Prev size={16}/>{w.previous}</Link>:null}
          {pages.map(page=><Link key={page} href={href({page:String(page)})} aria-current={page===current?'page':undefined}>{page}</Link>)}
          {current<list.totalPages?<Link href={href({page:String(current+1)})}>{w.next}<Next size={16}/></Link>:null}
          <span>{w.page} {current} {w.of} {list.totalPages}</span>
        </nav>}
      </main>
    </div>
  </div>;
}
