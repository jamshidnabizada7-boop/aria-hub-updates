import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLang } from '@/lib/lang-route';
import { getLocalizedContent } from '@/lib/i18n-content';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { CookieBanner } from '@/components/site/cookie-banner';
import { DiscoveryTracker } from '@/components/site/discovery-tracker';
import { discoverySpec, DISCOVERY_COPY, discoveryHeadline, discoveryUrl } from '@/lib/social/discovery/catalog';
import { readDiscoveryListings } from '@/lib/social/discovery/inventory';
export const dynamic = 'force-dynamic';
export async function generateMetadata({params}:{params:Promise<{lang:string;collection:string}>}):Promise<Metadata> {
  const {lang,collection}=await params;const spec=discoverySpec(collection);if(!isLang(lang)||!spec)return {};
  return {title:`${DISCOVERY_COPY[lang][spec.kind]} | ARIA HUB`,alternates:{canonical:discoveryUrl(spec,lang)}};
}
export default async function DiscoveryPage({params,searchParams}:{params:Promise<{lang:string;collection:string}>;searchParams:Promise<{page?:string;campaign?:string;utm_source?:string}>}) {
  const {lang,collection}=await params;if(!isLang(lang))notFound();const spec=discoverySpec(collection);if(!spec)notFound();
  const query=await searchParams;const page=Math.min(10000,Math.max(1,parseInt(query.page||'1',10)||1));const now=new Date();
  const [listings,site]=await Promise.all([readDiscoveryListings(spec,now),getSiteData()]);
  const total=listings.length;const rows=listings.sort((a,b)=>a.deadline!.getTime()-b.deadline!.getTime()||a.id.localeCompare(b.id)).slice((page-1)*24,page*24);
  const c=DISCOVERY_COPY[lang];const href=(n:number)=>{const u=new URL(discoveryUrl(spec,lang));u.searchParams.set('page',String(n));if(query.campaign){u.searchParams.set('campaign',query.campaign);u.searchParams.set('utm_source',query.utm_source||'');}return u.pathname+u.search;};
  return <><Navbar menu={site.menu} languages={site.languages} siteName={site.settings?.siteName || 'ARIA HUB'} logoUrl={site.settings?.logoUrl || null}/><DiscoveryTracker queueId={query.campaign} platform={query.utm_source}/><main dir={lang==='en'?'ltr':'rtl'} className="mx-auto min-h-screen max-w-6xl px-5 pb-20 pt-36">
    <section className="rounded-3xl brand-panel p-8 md:p-12"><p className="text-sm font-semibold text-primary">{c.series}</p><h1 className="mt-4 text-3xl font-black leading-relaxed md:text-5xl">{discoveryHeadline({spec,count:total,capturedAt:now.toISOString(),fingerprint:''},lang)}</h1><p className="mt-5 max-w-3xl text-lg text-muted-foreground">{c.changes}</p><Link href={`/${lang}/register`} className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-bold text-primary-foreground">{c.signup}</Link></section>
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rows.map(row=><Link data-discovery-opportunity key={row.slug} href={`/${lang}/opportunities/${row.slug}`} className="flex min-h-56 flex-col rounded-2xl border bg-card p-6 transition hover:border-primary hover:shadow-md"><p className="text-sm text-muted-foreground" dir="auto">{row.organization}</p><h2 className="mt-3 flex-1 text-lg font-bold leading-relaxed" dir="auto">{getLocalizedContent(row.title,row.titleI18n as Record<string,string>|null,lang)}</h2><p className="mt-5 font-semibold text-primary">{c.listing} →</p></Link>)}</div>
    {total===0&&<p className="mt-10 text-center text-lg">{c.noResults}</p>}
    <nav aria-label="Pagination" className="mt-10 flex justify-between">{page>1?<Link href={href(page-1)} className="rounded-lg border px-5 py-3">←</Link>:<span/>}{page*24<total&&<Link href={href(page+1)} className="rounded-lg border px-5 py-3">→</Link>}</nav>
    <Link href={`/${lang}/opportunities`} className="mt-8 inline-block text-primary">{c.explore}</Link>
  </main><CookieBanner/></>;
}
