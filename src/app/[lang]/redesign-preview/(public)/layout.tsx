import type {ReactNode} from 'react';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {AriaPreviewNav} from '@/components/site/redesign/aria-preview-nav';
import {AriaNewsletter} from '@/components/site/redesign/aria-newsletter';
import {AriaPublicFooter} from '@/components/site/redesign/aria-public-footer';
import {ariaSans,ariaRtl} from '@/components/site/redesign/aria-fonts';
import {isLang} from '@/lib/lang-route';
import '@/components/site/redesign/aria-v2.css';
import '@/components/site/redesign/aria-public.css';

export const metadata:Metadata={robots:{index:false,follow:false}};
export const dynamic='force-dynamic';

export default async function AriaPublicPreviewLayout({children,params}:{children:ReactNode;params:Promise<{lang:string}>}){
 if(process.env.ARIA_REDESIGN_PREVIEW_ENABLED!=='true')notFound();
 const {lang:raw}=await params;
 if(!isLang(raw))notFound();
 const lang=raw;
 return <div className={ariaSans.variable+' '+ariaRtl.variable}>
  <div className="aria-v2 aria-public" dir={lang==='en'?'ltr':'rtl'} lang={lang}>
   <AriaPreviewNav lang={lang} preview/>
   {children}
   <div className="aria-container"><AriaNewsletter lang={lang}/></div>
   <AriaPublicFooter lang={lang}/>
  </div>
 </div>;
}