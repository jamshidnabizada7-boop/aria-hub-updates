import Link from 'next/link';
import {db} from '@/lib/db';
import {getSiteData} from '@/lib/get-site';
import {PageShell} from '@/components/site/page-shell';
import {GallerySection} from '@/components/site/sections/gallery';
import {isLang} from '@/lib/lang-route';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}){const {lang}=await params;return {title:lang==='fa'?'گالری | آریا هاب':lang==='ps'?'ګالري | آریا هاب':'Gallery | ARIA HUB',alternates:{canonical:`/${lang}/gallery`}};}
export default async function GalleryPage({params,searchParams}:{params:Promise<{lang:string}>;searchParams:Promise<{album?:string}>}){
 const raw=await params,lang=isLang(raw.lang)?raw.lang:'fa',query=await searchParams;
 const [data,albums]=await Promise.all([getSiteData(),db.galleryAlbum.findMany({select:{id:true,title:true,slug:true},orderBy:{order:'asc'}})]);
 const items=query.album?await db.galleryItem.findMany({where:{album:{slug:query.album}},orderBy:{order:'asc'}}):data.gallery;
 return <PageShell lang={lang}><div className="mx-auto max-w-7xl px-4"><h1 className="text-3xl font-bold">{lang==='fa'?'گالری آریا هاب':lang==='ps'?'د آریا هاب ګالري':'ARIA HUB gallery'}</h1><nav aria-label="Albums" className="mt-5 flex flex-wrap gap-2"><Link className="rounded-lg border px-4 py-2" href={`/${lang}/gallery`}>{lang==='fa'?'همه':lang==='ps'?'ټول':'All'}</Link>{albums.map(a=><Link key={a.id} aria-current={query.album===a.slug?'page':undefined} className="rounded-lg border px-4 py-2 aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground" href={`/${lang}/gallery?album=${encodeURIComponent(a.slug)}`}>{a.title}</Link>)}</nav></div><GallerySection items={items as any}/></PageShell>;
}
