import Link from 'next/link';
import {ArrowUpRight,BookOpen,CalendarDays} from 'lucide-react';
import {listBlogCategories,listBlogPosts} from '@/lib/blog-queries';
import {isLang} from '@/lib/lang-route';
export const dynamic='force-dynamic';
const copy={
 en:{eyebrow:'INSIGHTS & GUIDES',title:'Useful ideas for the next step.',desc:'Practical articles, career guidance and opportunity updates.',all:'All articles',empty:'No articles have been published in this category.',read:'Read article',filter:'Article categories'},
 fa:{eyebrow:'مقالات و رهنماها',title:'معلومات کاربردی برای گام بعدی.',desc:'مقالات، رهنمای کاری و تازه‌ترین مطالب.',all:'همۀ مقالات',empty:'مقاله‌ای در این بخش نشر نشده است.',read:'خواندن مقاله',filter:'دسته‌بندی مقالات'},
 ps:{eyebrow:'مقالې او لارښودونه',title:'د راتلونکي ګام لپاره ګټور معلومات.',desc:'عملي مقالې، مسلکي لارښوونې او تازه معلومات.',all:'ټولې مقالې',empty:'په دې برخه کې مقاله نشته.',read:'مقاله ولولئ',filter:'د مقالو ډولونه'}
} as const;
export default async function BlogPreview({params,searchParams}:{params:Promise<{lang:string}>;searchParams:Promise<{category?:string|string[]}>}){
 const {lang:raw}=await params,lang=isLang(raw)?raw:'en',sp=await searchParams,w=copy[lang];
 const requested=typeof sp.category==='string'?sp.category.slice(0,85):'';
 const categories=await listBlogCategories(lang);
 const category=categories.some(c=>c.slug===requested)?requested:'';
 const posts=await listBlogPosts(lang,category||null);
 return <main id="main-content" className="aria-container aria-public-main">
  <header className="aria-public-hero"><div><span className="aria-public-hero__eyebrow">{w.eyebrow}</span><h1>{w.title}</h1><p>{w.desc}</p></div><BookOpen size={44} aria-hidden="true"/></header>
  <nav className="aria-public-chips" aria-label={w.filter}><Link href={'/'+lang+'/redesign-preview/blog'} aria-current={!category?'page':undefined}>{w.all}</Link>{categories.map(c=><Link key={c.slug} aria-current={category===c.slug?'page':undefined} href={'/'+lang+'/redesign-preview/blog?category='+encodeURIComponent(c.slug)}>{c.name} <span>{c.count}</span></Link>)}</nav>
  {posts.length?<div className="aria-public-grid">{posts.map(post=><article key={post.id} className="aria-public-card">
   {post.categoryName?<span className="aria-public-card__label">{post.categoryName}</span>:null}
   <h2 dir="auto">{post.title}</h2><p dir="auto">{post.excerpt}</p>
   <div className="aria-public-card__meta"><span><CalendarDays size={13} style={{display:'inline',verticalAlign:'middle'}}/> {new Intl.DateTimeFormat(lang==='en'?'en-US':lang==='fa'?'fa-AF':'ps-AF',{year:'numeric',month:'short',day:'numeric'}).format(post.publishedAt)}</span><span>{post.readingMinutes} min</span></div>
   <Link href={'/'+lang+'/redesign-preview/blog/'+encodeURIComponent(post.slug)} className="aria-card-link">{w.read}<ArrowUpRight size={15}/></Link>
  </article>)}</div>:<div className="aria-public-empty">{w.empty}</div>}
 </main>;
}