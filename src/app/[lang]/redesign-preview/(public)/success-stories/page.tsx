import Link from 'next/link';
import {ArrowUpRight,Trophy} from 'lucide-react';
import {listSuccessStories,getStoryFacets,translateStoryType} from '@/lib/success-story-queries';
import {isLang} from '@/lib/lang-route';
export const dynamic='force-dynamic';
const words={
 en:{eyebrow:'COMMUNITY STORIES',title:'Experiences worth sharing.',desc:'Read community-submitted stories that have been published on ARIA HUB.',all:'All stories',empty:'No published stories found.',read:'Read story',share:'Share your story',prev:'Previous',next:'Next'},
 fa:{eyebrow:'داستان‌های موفقیت',title:'تجربه‌هایی برای آموختن و الهام گرفتن.',desc:'داستان‌های ثبت‌شده و نشرشدۀ کاربران را بخوانید.',all:'همۀ داستان‌ها',empty:'داستان نشرشده‌ای پیدا نشد.',read:'خواندن داستان',share:'داستان خود را شریک سازید',prev:'قبلی',next:'بعدی'},
 ps:{eyebrow:'د بریا کیسې',title:'د شریکولو وړ تجربې.',desc:'د کاروونکو خپرې شوې تجربې او کیسې ولولئ.',all:'ټولې کیسې',empty:'خپره شوې کیسه ونه موندل شوه.',read:'کیسه ولولئ',share:'خپله کیسه شریکه کړئ',prev:'مخکینی',next:'راتلونکی'}
} as const;
export default async function StoriesPreview({params,searchParams}:{params:Promise<{lang:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {lang:raw}=await params,lang=isLang(raw)?raw:'en',sp=await searchParams,w=words[lang];
 const facets=await getStoryFacets(lang);
 const requested=typeof sp.type==='string'?sp.type:'';
 const type=facets.types.some(x=>x.type===requested)?requested:'';
 const page=Math.max(1,Math.min(1000,Number.parseInt(typeof sp.page==='string'?sp.page:'1',10)||1));
 const list=await listSuccessStories(lang,{storyType:type||undefined,page,perPage:12});
 const base='/'+lang+'/redesign-preview/success-stories';
 const pageUrl=(n:number)=>base+'?'+new URLSearchParams({...(type?{type}:{}),page:String(n)}).toString();
 return <main id="main-content" className="aria-container aria-public-main">
  <header className="aria-public-hero"><div><span className="aria-public-hero__eyebrow">{w.eyebrow}</span><h1>{w.title}</h1><p>{w.desc}</p></div><Link href={'/'+lang+'/success-stories/share'} className="aria-button aria-button--orange">{w.share}<ArrowUpRight size={16}/></Link></header>
  <nav className="aria-public-chips" aria-label={w.all}><Link href={base} aria-current={!type?'page':undefined}>{w.all}</Link>{facets.types.map(f=><Link key={f.type} aria-current={type===f.type?'page':undefined} href={base+'?type='+encodeURIComponent(f.type)}>{f.label}</Link>)}</nav>
  {list.items.length?<div className="aria-public-grid">{list.items.map(story=><article className="aria-public-card" key={story.id}>
    <span className="aria-public-card__label"><Trophy size={14}/>{translateStoryType(story.storyType,lang)}</span><h2 dir="auto">{story.title}</h2>
    <p dir="auto">{story.excerpt}</p><div className="aria-public-card__meta"><span>{story.authorAlias}</span><span>{story.country}</span><span>{story.year}</span></div>
    <Link className="aria-card-link" href={'/'+lang+'/success-stories/'+encodeURIComponent(story.id)}>{w.read}<ArrowUpRight size={15}/></Link>
   </article>)}</div>:<div className="aria-public-empty">{w.empty}</div>}
  {list.totalPages>1?<nav className="aria-public-pager" aria-label="Pages">{page>1?<Link href={pageUrl(page-1)}>{w.prev}</Link>:null}<span>{page} / {list.totalPages}</span>{page<list.totalPages?<Link href={pageUrl(page+1)}>{w.next}</Link>:null}</nav>:null}
 </main>;
}