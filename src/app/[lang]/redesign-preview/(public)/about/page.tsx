import {notFound} from 'next/navigation';
import {db} from '@/lib/db';
import {getLocalizedContent} from '@/lib/i18n-content';
import {ABOUT_DOC,pickTril} from '@/lib/static-page-content';
import {sanitizeListingHtml} from '@/lib/content-html';
import {isLang} from '@/lib/lang-route';
export const dynamic='force-dynamic';
export default async function AboutPreview({params}:{params:Promise<{lang:string}>}){
 const {lang:raw}=await params,lang=isLang(raw)?raw:'en';
 let title=pickTril(ABOUT_DOC.title,lang),html='';
 try{
  const row=await db.page.findUnique({where:{slug:'about'}});
  if(row){
   if(row.status!=='published')notFound();
   title=getLocalizedContent(row.title,row.titleI18n as Record<string,string>|null,lang)||title;
   html=getLocalizedContent(row.content,row.contentI18n as Record<string,string>|null,lang);
  }
 }catch(e){
  if(e && typeof e==='object' && 'digest' in e && String(e.digest).includes('NEXT_NOT_FOUND'))throw e;
 }
 return <main id="main-content" className="aria-container aria-public-main">
  <div className="aria-public-hero"><div><span className="aria-public-hero__eyebrow">ARIA HUB</span><h1>{title}</h1></div></div>
  <article className="aria-public-article">
   {html?<div className="aria-public-article__content" dir="auto" dangerouslySetInnerHTML={{__html:sanitizeListingHtml(html)}}/>:
    <div className="aria-public-article__content">{ABOUT_DOC.sections.map((s,i)=><section key={i}>
     <h2>{pickTril(s.heading,lang)}</h2>
     {s.paragraphs?.map((p,j)=><p key={j}>{pickTril(p,lang)}</p>)}
     {s.bullets?.length?<ul>{s.bullets.map((p,j)=><li key={j}>{pickTril(p,lang)}</li>)}</ul>:null}
    </section>)}</div>}
  </article>
 </main>;
}