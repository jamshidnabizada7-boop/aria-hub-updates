'use client';
import { ArrowUpRight, BriefcaseBusiness, GraduationCap, Globe2, MapPin } from 'lucide-react';
import type { Lang } from '@/lib/lang-route';
import type { PosterSize } from '@/lib/social/templates';
import { CANVAS_SIZES } from '@/lib/social/themes';
import { DISCOVERY_COPY, discoveryLocation, discoveryNumber, discoveryTimestamp, type DiscoverySnapshot, type DiscoveryStyle } from './catalog';

/** Vector geometry, original brand mark and embedded local type: no stock-photo dependency or baked-in copy. */
export function DiscoveryCanvas({ snapshot, lang, size, style = 'atlas', qrDataUrl }: { snapshot: DiscoverySnapshot; lang: Lang; size: PosterSize; style?: DiscoveryStyle; qrDataUrl?: string | null }) {
  const c = DISCOVERY_COPY[lang]; const paper = style === 'ledger'; const signal = style === 'signal';
  const ink = paper ? '#142442' : '#F6F8FE'; const accent = paper ? '#086B63' : signal ? '#87E8D0' : '#F3D28A';
  const h = CANVAS_SIZES[size].h; const story = size === 'story'; const province = discoveryLocation(snapshot.spec, lang);
  const Icon = snapshot.spec.province ? MapPin : snapshot.spec.kind === 'scholarships' || snapshot.spec.kind === 'fellowships' ? GraduationCap : BriefcaseBusiness;
  const stamp = discoveryTimestamp(snapshot.capturedAt,lang);
  const titleNode=<h1 data-campaign-title style={{fontSize:paper?52:snapshot.spec.kind==='ngo'&&lang!=='en'?52:size==='square'?60:76,fontWeight:900,lineHeight:1.3,margin:0,maxWidth:950,overflowWrap:'break-word'}}>{c[snapshot.spec.kind]}{province&&<span style={{display:'block',color:paper?'#086B63':accent}}>{province}</span>}</h1>;
  const countNode=<strong data-count style={{fontSize:paper?Math.min(size==='square'?190:230,600/Math.max(3,discoveryNumber(snapshot.count,lang).length)):snapshot.count>=10000?170:size==='square'?210:280,lineHeight:1.06,fontWeight:900,letterSpacing:lang==='en'?-8:0,color:paper?'#F4F1E9':signal?'#122342':accent,fontVariantNumeric:'tabular-nums',background:signal?accent:undefined,padding:signal?'10px 36px':undefined,borderRadius:signal?32:undefined}}>{discoveryNumber(snapshot.count,lang)}</strong>;
  return <div data-discovery-canvas={style} data-captured-at={snapshot.capturedAt} data-lang={lang} style={{ width:1080, height:h, position:'relative', overflow:'hidden', boxSizing:'border-box', padding:64, background:paper ? '#F4F1E9' : '#122342', color:ink, direction:lang === 'en' ? 'ltr':'rtl', fontFamily:'"ARIA Studio", sans-serif', display:'flex', flexDirection:'column' }}>
    <style>{`@font-face{font-family:'ARIA Studio';src:url('/fonts/Vazirmatn-Medium.ttf') format('truetype');font-weight:400 650}@font-face{font-family:'ARIA Studio';src:url('/fonts/Vazirmatn-Bold.ttf') format('truetype');font-weight:700 850}@font-face{font-family:'ARIA Studio';src:url('/fonts/Vazirmatn-Black.ttf') format('truetype');font-weight:900}`}</style>
    {style === 'atlas' && <div aria-hidden style={{position:'absolute',insetInlineEnd:-300,top:140,color:'#F3D28A',opacity:.10}}><Globe2 size={1000} strokeWidth={.55}/></div>}
    {paper && <div aria-hidden style={{position:'absolute',width:22,insetInlineStart:0,top:0,bottom:0,background:accent}}/>}
    {signal && <div aria-hidden style={{position:'absolute',height:500,width:500,insetInlineEnd:-340,top:340,border:'100px solid #87E8D015',transform:'rotate(-25deg)',borderRadius:80}}/>}
    <header style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:28,borderBottom:`1px solid ${paper ? '#14244225' : '#ffffff35'}`}}>
      <div style={{display:'flex',alignItems:'center',gap:18,direction:'ltr'}}><img src="/images/logo-mark.png" alt="ARIA HUB" style={{width:66,height:66,objectFit:'contain',borderRadius:12}}/><span style={{fontSize:32,fontWeight:900}}>ARIA <span style={{color:paper ? '#047E98':accent}}>HUB</span></span></div>
      <Icon size={42} color={accent} strokeWidth={1.5}/>
    </header>
    <main style={{position:'relative',flex:1,minHeight:0,display:'flex',flexDirection:'column',justifyContent:'center',gap:story ? 42 : size==='square' ? 16:22,paddingBlock:size==='square'?18:30}}>
      <div style={{fontSize:23,fontWeight:800,color:accent,letterSpacing:lang === 'en' ? 2 : 0}}>{c.series}</div>
      {paper?<div style={{display:'flex',alignItems:'center',gap:36}}><div style={{width:380,minHeight:320,boxSizing:'border-box',flexShrink:0,padding:24,background:accent,borderRadius:24,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:22}}>{countNode}<span style={{fontSize:23,fontWeight:700,color:'#F4F1E9'}}>{c.open}</span></div><div style={{flex:1,minWidth:0}}>{titleNode}</div></div>:<><div style={{display:'flex',alignItems:'center'}}>{countNode}</div>{titleNode}</>}
      <p style={{fontSize:size==='square'?24:28,lineHeight:1.6,margin:0,maxWidth:850,color:paper ? '#40506A' : '#CFD8E9'}}>{c.supporting}</p>
      {size !== 'square' && !paper && <div style={{display:'flex',alignItems:'center',gap:14,fontSize:26,color:accent,borderTop:'1px solid #ffffff25',paddingTop:26}}><span style={{width:9,height:9,background:accent,borderRadius:'50%'}}/>{c.open}</div>}
    </main>
    <footer style={{position:'relative',display:'flex',flexDirection:'column',gap:18}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:24,background:paper ? '#142442':accent,color:paper ? '#F4F1E9':'#142442',borderRadius:signal ? 24:4,padding:26}}>
        <div style={{minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:16,fontSize:29,fontWeight:800,lineHeight:1.5}}>{c.explore}<ArrowUpRight size={30}/></div><div dir="ltr" style={{fontSize:44,fontWeight:900,marginTop:6,textAlign:lang==='en'?'left':'right'}}>myariahub.com</div></div>
        {qrDataUrl && <div style={{padding:10,background:'#fff',borderRadius:10,flexShrink:0}}><img src={qrDataUrl} alt="Explore current opportunities" style={{display:'block',width:118,height:118}}/></div>}
      </div>
      <div style={{fontSize:18,lineHeight:1.6,color:paper ? '#40506A':'#CFD8E9'}}><div>{c.asof}: {stamp} · AFT</div><div>{c.changes}</div></div>
    </footer>
  </div>;
}
