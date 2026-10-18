import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowUpRight} from 'lucide-react';
import {getBlogPost,listRelatedPosts} from '@/lib/blog-queries';
import {sanitizeListingHtml} from '@/lib/content-html';
import {isLang} from '@/lib/lang-route';
export const dynamic='force-dynamic';
export default async function ArticlePreview({params}:{params:Promise<{lang:string;slug:string}>}){
 const {lang:raw,slug}=await params,lang=isLang(raw)?raw:'en';
 const post=await getBlogPost(slug,lang);if(!post)notFound();
 const related=await listRelatedPosts(lang,post.categorySlug,post.slug,3);
 const w=lang==='fa'?{back:'بازگشت به مقالات',related:'مقالات مشابه',read:'خواندن مقاله',original:'متن ممکن است به زبان اصلی نمایش داده شود.'}:lang==='ps'?{back:'مقالو ته ستنېدل',related:'ورته مقالې',read:'مقاله ولولئ',original:'متن ښايي په اصلي ژبه وي.'}:{back:'Back to articles',related:'Related articles',read:'Read article',original:'Part of this article may be in its original language.'};
 return <main id="main-content" className="aria-container aria-public-main">
  <Link href={'/'+lang+'/redesign-preview/blog'} className="aria-card-link">{w.back} ←</Link>
  <article className="aria-public-article" style={{marginTop:18}}>
   {post.categoryName?<span className="aria-public-card__label">{post.categoryName}</span>:null}
   <h1 dir="auto">{post.title}</h1>
   <div className="aria-public-article__meta"><span>{post.author||'ARIA HUB'}</span><time dateTime={post.publishedAt.toISOString()}>{new Intl.DateTimeFormat(lang==='en'?'en-US':lang==='fa'?'fa-AF':'ps-AF',{year:'numeric',month:'long',day:'numeric'}).format(post.publishedAt)}</time></div>
   {post.originalLanguage&&<p className="aria-public-notice">{w.original}</p>}
   <div className="aria-public-article__content" dir="auto" dangerouslySetInnerHTML={{__html:sanitizeListingHtml(post.content||'')}}/>
  </article>
  {related.length>0&&<section style={{marginTop:35}}><div className="aria-public-head"><h2>{w.related}</h2></div><div className="aria-public-grid">{related.map(p=><article key={p.id} className="aria-public-card"><h3 dir="auto">{p.title}</h3><p>{p.excerpt}</p><Link className="aria-card-link" href={'/'+lang+'/redesign-preview/blog/'+encodeURIComponent(p.slug)}>{w.read}<ArrowUpRight size={15}/></Link></article>)}</div></section>}
 </main>;
}