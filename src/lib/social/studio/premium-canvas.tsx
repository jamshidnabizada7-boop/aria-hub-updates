'use client';

import type { CSSProperties, ReactNode } from 'react';
import { BriefcaseBusiness, CalendarDays, FileText, MapPin } from 'lucide-react';
import { formatDateLong } from '@/lib/date-format';
import { resolveTheme, CANVAS_SIZES } from '@/lib/social/themes';
import { MediaLayer } from '@/lib/social/studio/media-layer';
import { resolveDesignFamily } from '@/lib/social/studio/registry';
import type { PremiumCanvasProps, StudioMediaConfig } from '@/lib/social/studio/types';

const W = 1080;

function clampTextSize(text: string, short: number, medium: number, long: number) {
  const n = text.trim().length;
  if (n > 105) return long;
  if (n > 58) return medium;
  return short;
}

function LogoLockup({ dark = true }: { dark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, direction: 'ltr' }}>
      <img src="/images/logo-mark.png" alt="" style={{ width: 58, height: 58, objectFit: 'contain' }} />
      <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1.4, color: dark ? '#fff' : '#1B2440' }}>ARIA HUB</span>
    </div>
  );
}

function QR({ src }: { src?: string | null }) {
  if (!src) return null;
  return <img src={src} alt="" style={{ width: 88, height: 88, borderRadius: 14, background: '#fff', padding: 7 }} />;
}

function Eyebrow({ children, accent }: { children?: ReactNode; accent: string }) {
  if (!children) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, width: 'fit-content',
      padding: '10px 18px', borderRadius: 999,
      border: `1px solid ${accent}70`, color: accent,
      fontSize: 21, fontWeight: 800, letterSpacing: .2,
      background: 'rgba(7,13,31,.38)', backdropFilter: 'blur(10px)',
    }}>{children}</div>
  );
}

function MetaPill({ icon, text, accent }: { icon?: ReactNode; text?: string; accent: string }) {
  if (!text) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 9,
      padding: '10px 15px', borderRadius: 999,
      fontSize: 20, fontWeight: 700, color: '#fff',
      border: '1px solid rgba(255,255,255,.16)',
      background: 'rgba(255,255,255,.08)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
    }}>{icon}{text}</div>
  );
}

function CanvasRoot({ children, props, style }: { children: ReactNode; props: PremiumCanvasProps; style?: CSSProperties }) {
  const h = CANVAS_SIZES[props.size].h;
  const theme = resolveTheme(props.themeId);
  return (
    <div style={{
      position: 'relative', width: W, height: h, overflow: 'hidden',
      fontFamily: '"Vazirmatn","Inter",system-ui,sans-serif',
      direction: props.lang === 'en' ? 'ltr' : 'rtl',
      color: '#fff',
      background: `linear-gradient(145deg,${theme.bgTop} 0%,${theme.bgMid} 48%,${theme.bgBottom} 100%)`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Ambient({ accent = '#F8D898' }: { accent?: string }) {
  return <>
    <div style={{ position:'absolute',width:620,height:620,borderRadius:'50%',right:-180,top:-220,background:`radial-gradient(circle,${accent}2d,transparent 68%)` }} />
    <div style={{ position:'absolute',width:760,height:760,borderRadius:'50%',left:-320,bottom:-360,background:'radial-gradient(circle,rgba(79,112,214,.25),transparent 68%)' }} />
    <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',backgroundSize:'54px 54px',opacity:.45 }} />
  </>;
}

function Footer({ props }: { props: PremiumCanvasProps }) {
  return (
    <div style={{
      position:'absolute',left:58,right:58,bottom:44,
      display:'flex',alignItems:'flex-end',justifyContent:'space-between',direction:'ltr',
      zIndex:20,
    }}>
      <QR src={props.qrDataUrl} />
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:27,fontWeight:900 }}>myariahub.com</div>
        <div style={{ fontSize:16,fontWeight:600,color:'rgba(255,255,255,.58)',marginTop:5 }}>Discover the opportunity</div>
      </div>
    </div>
  );
}

function HeroLayers({ media }: { media?: StudioMediaConfig }) {
  return <>
    <MediaLayer layer={media?.background} role="background" style={{ zIndex: 1 }} />
    <MediaLayer layer={media?.hero} role="hero" style={{ zIndex: 8 }} />
    <MediaLayer layer={media?.foreground} role="foreground" style={{ zIndex: 16, width:'82%', height:'82%' }} />
    <MediaLayer layer={media?.overlay} role="overlay" style={{ zIndex: 18, width:'100%', height:'100%', mixBlendMode:'screen' }} />
  </>;
}

function PortalFallback({ accent }: { accent: string }) {
  return (
    <div style={{ position:'absolute',right:84,top:255,width:420,height:570,zIndex:8,perspective:900 }}>
      <div style={{
        position:'absolute',inset:'0 30px 80px',borderRadius:'160px 160px 28px 28px',
        background:'linear-gradient(145deg,#0c1835,#1f3158)',border:`2px solid ${accent}55`,
        boxShadow:'0 45px 90px rgba(0,0,0,.52), inset 0 0 80px rgba(255,255,255,.04)',
      }}>
        <div style={{
          position:'absolute',left:72,right:72,top:82,bottom:58,borderRadius:'100px 100px 10px 10px',
          background:`radial-gradient(circle at 50% 45%,#fff 0 10%,${accent} 22%,rgba(248,216,152,.35) 36%,#071126 67%)`,
          boxShadow:`0 0 80px ${accent}66`,
        }} />
      </div>
      {[0,1,2,3,4].map(i=><div key={i} style={{
        position:'absolute',left:60-i*12,right:60+i*2,bottom:58-i*18,height:26,
        background:'linear-gradient(90deg,#111b31,#26365b)',borderTop:`1px solid ${accent}66`,
        transform:`translateZ(${i*8}px)`,boxShadow:'0 12px 18px rgba(0,0,0,.28)'
      }}/>)}
    </div>
  );
}

function SphereFallback({ accent, kind='cap' }: { accent: string; kind?: 'cap'|'briefcase'|'document' }) {
  return (
    <div style={{ position:'absolute',right:120,top:240,width:410,height:410,zIndex:8 }}>
      <div style={{
        position:'absolute',inset:30,borderRadius:'50%',
        background:'radial-gradient(circle at 34% 25%,#536b9c 0 5%,#26385f 22%,#0d1730 62%,#050a16 100%)',
        boxShadow:`0 48px 90px rgba(0,0,0,.55), 0 0 0 3px ${accent}99, 0 0 65px ${accent}2d`,
      }} />
      {kind==='cap' ? <>
        <div style={{ position:'absolute',width:330,height:92,left:36,top:8,background:'#111b34',transform:'rotate(-8deg) skewX(-18deg)',boxShadow:'0 24px 45px rgba(0,0,0,.45)' }} />
        <div style={{ position:'absolute',width:180,height:82,left:112,top:78,borderRadius:'0 0 80px 80px',background:'#0b1429' }} />
      </> : kind==='briefcase' ? (
        <div style={{ position:'absolute',left:68,right:68,top:108,bottom:86,borderRadius:40,border:`3px solid ${accent}88`,background:'linear-gradient(145deg,#101b36,#263862)',boxShadow:'0 34px 70px rgba(0,0,0,.5)' }} />
      ) : (
        <div style={{ position:'absolute',left:88,right:88,top:68,bottom:68,borderRadius:28,background:'linear-gradient(145deg,#fff,#cbd2df)',transform:'rotate(-7deg)',boxShadow:'0 34px 70px rgba(0,0,0,.5)' }} />
      )}
    </div>
  );
}

function PremiumHeader({ accent, eyebrow }: { accent:string; eyebrow?:string }) {
  return (
    <div style={{ position:'absolute',left:58,right:58,top:44,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:24,direction:'ltr' }}>
      <Eyebrow accent={accent}>{eyebrow}</Eyebrow>
      <LogoLockup />
    </div>
  );
}

function MetaRow({ props, accent }: { props: PremiumCanvasProps; accent:string }) {
  const date = props.deadlineDate ? new Date(props.deadlineDate) : null;
  return (
    <div style={{ display:'flex',flexWrap:'wrap',gap:9,marginTop:22 }}>
      <MetaPill accent={accent} text={props.country || props.location} icon={<MapPin style={{width:18,height:18,color:accent}}/>}/>
      <MetaPill accent={accent} text={props.organization} icon={<BriefcaseBusiness style={{width:18,height:18,color:accent}}/>}/>
      <MetaPill accent={accent} text={props.funding || props.salary}/>
      {date ? <MetaPill accent={accent} text={formatDateLong(date,props.lang)} icon={<CalendarDays style={{width:18,height:18,color:accent}}/>}/> : null}
    </div>
  );
}

function SplitEditorial({ props, side='left' }: { props:PremiumCanvasProps; side?:'left'|'right' }) {
  const theme=resolveTheme(props.themeId); const accent=theme.accent; const rtl=props.lang!=='en';
  const textSide = side==='left' ? { left:70, right:510 } : { left:520, right:70 };
  return (
    <CanvasRoot props={props}>
      <Ambient accent={accent}/><HeroLayers media={props.media}/>
      {!props.media?.hero?.url ? <PortalFallback accent={accent}/> : null}
      <PremiumHeader accent={accent} eyebrow={props.eyebrow || props.category || props.badge}/>
      <div style={{position:'absolute',top:210,bottom:190,...textSide,zIndex:12,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:rtl?'flex-end':'flex-start'}}>
        <div style={{fontSize:20,fontWeight:900,color:accent,letterSpacing:1.2,textTransform:'uppercase'}}>{props.badge || (props.lang==='en'?'YOUR NEXT MOVE':'فرصت بعدی شما')}</div>
        <div style={{marginTop:18,fontSize:clampTextSize(props.title,76,62,48),fontWeight:950,lineHeight:1.12,letterSpacing:-1.2,textAlign:rtl?'right':'left',textShadow:'0 14px 40px rgba(0,0,0,.38)'}}>{props.title}</div>
        {props.note ? <div style={{marginTop:19,fontSize:25,lineHeight:1.55,fontWeight:600,color:'rgba(255,255,255,.72)',textAlign:rtl?'right':'left'}}>{props.note}</div>:null}
        <MetaRow props={props} accent={accent}/>
      </div>
      <Footer props={props}/>
    </CanvasRoot>
  );
}

function CenterObject({ props, objectKind='cap', document=false }: { props:PremiumCanvasProps; objectKind?:'cap'|'briefcase'|'document'; document?:boolean }) {
  const theme=resolveTheme(props.themeId); const accent=theme.accent; const rtl=props.lang!=='en';
  return (
    <CanvasRoot props={props}>
      <Ambient accent={accent}/><HeroLayers media={props.media}/>
      {!props.media?.hero?.url ? <SphereFallback accent={accent} kind={document?'document':objectKind}/> : null}
      <PremiumHeader accent={accent} eyebrow={props.eyebrow || props.category || props.badge}/>
      <div style={{position:'absolute',left:90,right:90,top:600,bottom:180,zIndex:12,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center'}}>
        <div style={{fontSize:clampTextSize(props.title,68,57,46),fontWeight:950,lineHeight:1.13,maxWidth:860,textShadow:'0 12px 38px rgba(0,0,0,.42)'}}>{props.title}</div>
        {props.note?<div style={{marginTop:14,fontSize:24,color:'rgba(255,255,255,.68)',fontWeight:600,maxWidth:740}}>{props.note}</div>:null}
        <MetaRow props={props} accent={accent}/>
      </div>
      <Footer props={props}/>
    </CanvasRoot>
  );
}

function FullBleedEditorial({ props, bigType=false }: { props:PremiumCanvasProps; bigType?:boolean }) {
  const theme=resolveTheme(props.themeId); const accent=theme.accent; const rtl=props.lang!=='en';
  return (
    <CanvasRoot props={props}>
      <HeroLayers media={props.media}/>
      {!props.media?.background?.url && !props.media?.hero?.url ? <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#0b1227 0%,#24365e 55%,#0d1730 100%)'}}/>:null}
      <div style={{position:'absolute',inset:0,zIndex:10,background:'linear-gradient(180deg,rgba(5,10,25,.16),rgba(5,10,25,.38) 44%,rgba(5,10,25,.96) 88%)'}}/>
      <PremiumHeader accent={accent} eyebrow={props.eyebrow || props.badge}/>
      <div style={{position:'absolute',left:70,right:70,bottom:205,zIndex:14,textAlign:rtl?'right':'left'}}>
        {bigType?<div style={{fontSize:150,fontWeight:1000,lineHeight:.82,color:accent,opacity:.14,position:'absolute',bottom:75,left:0,right:0,whiteSpace:'nowrap',overflow:'hidden'}}>{props.badge || 'ARIA HUB'}</div>:null}
        <div style={{fontSize:clampTextSize(props.title,bigType?92:76,bigType?72:60,52),fontWeight:950,lineHeight:1.08,maxWidth:920,textShadow:'0 12px 38px rgba(0,0,0,.48)'}}>{props.title}</div>
        {props.note?<div style={{fontSize:25,lineHeight:1.5,fontWeight:600,color:'rgba(255,255,255,.75)',marginTop:17,maxWidth:760}}>{props.note}</div>:null}
      </div>
      <Footer props={props}/>
    </CanvasRoot>
  );
}

function DocumentAlert({ props }: { props:PremiumCanvasProps }) {
  const theme=resolveTheme(props.themeId); const accent=theme.accent; const rtl=props.lang!=='en';
  return (
    <CanvasRoot props={props}>
      <Ambient accent={accent}/><HeroLayers media={props.media}/>
      {!props.media?.hero?.url ? <SphereFallback accent={accent} kind="document"/> : null}
      <PremiumHeader accent={accent} eyebrow={props.eyebrow || props.badge}/>
      <div style={{position:'absolute',left:64,right:500,top:235,bottom:190,zIndex:12,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:rtl?'flex-end':'flex-start'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,color:accent,fontSize:21,fontWeight:900}}><FileText style={{width:26,height:26}}/>{props.badge || 'IMPORTANT UPDATE'}</div>
        <div style={{fontSize:clampTextSize(props.title,74,60,47),fontWeight:950,lineHeight:1.12,marginTop:20,textAlign:rtl?'right':'left'}}>{props.title}</div>
        {props.note?<div style={{fontSize:25,lineHeight:1.5,color:'rgba(255,255,255,.7)',fontWeight:600,marginTop:18,textAlign:rtl?'right':'left'}}>{props.note}</div>:null}
        <MetaRow props={props} accent={accent}/>
      </div>
      <Footer props={props}/>
    </CanvasRoot>
  );
}

function Surreal({ props }: { props:PremiumCanvasProps }) {
  const theme=resolveTheme(props.themeId); const accent=theme.accent; const rtl=props.lang!=='en';
  return (
    <CanvasRoot props={props}>
      <Ambient accent={accent}/><HeroLayers media={props.media}/>
      {!props.media?.hero?.url?<>
        <div style={{position:'absolute',right:75,top:210,width:500,height:500,borderRadius:'50%',border:`2px solid ${accent}80`,boxShadow:`0 0 100px ${accent}28`,zIndex:5}}/>
        <PortalFallback accent={accent}/>
        <div style={{position:'absolute',right:30,top:610,width:540,height:2,background:`linear-gradient(90deg,transparent,${accent},transparent)`,transform:'rotate(-10deg)',zIndex:9}}/>
      </>:null}
      <PremiumHeader accent={accent} eyebrow={props.eyebrow || props.category}/>
      <div style={{position:'absolute',left:70,right:535,top:235,bottom:190,zIndex:12,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:rtl?'flex-end':'flex-start'}}>
        <div style={{fontSize:18,fontWeight:900,letterSpacing:2.2,color:accent}}>BEYOND THE OBVIOUS</div>
        <div style={{fontSize:clampTextSize(props.title,78,62,48),fontWeight:950,lineHeight:1.1,marginTop:18,textAlign:rtl?'right':'left'}}>{props.title}</div>
        {props.note?<div style={{marginTop:18,fontSize:24,color:'rgba(255,255,255,.72)',fontWeight:600,lineHeight:1.5,textAlign:rtl?'right':'left'}}>{props.note}</div>:null}
        <MetaRow props={props} accent={accent}/>
      </div>
      <Footer props={props}/>
    </CanvasRoot>
  );
}

export function PremiumSocialCanvas(raw: PremiumCanvasProps) {
  const props={...raw,designFamily:resolveDesignFamily(raw.designFamily)};
  switch(props.designFamily){
    case 'global-portal': return <SplitEditorial props={props}/>;
    case 'document-desk': return <DocumentAlert props={props}/>;
    case 'global-object': return <CenterObject props={props}/>;
    case 'career-desk': return <SplitEditorial props={props} side="right"/>;
    case 'career-ascent': return <Surreal props={props}/>;
    case 'talent-profile': return <FullBleedEditorial props={props}/>;
    case 'editorial-break': return <FullBleedEditorial props={props}/>;
    case 'document-alert': return <DocumentAlert props={props}/>;
    case 'cinematic-person': return <FullBleedEditorial props={props}/>;
    case 'big-type-story': return <FullBleedEditorial props={props} bigType/>;
    case 'object-hero-3d': return <CenterObject props={props} objectKind="briefcase"/>;
    case 'surreal-opportunity': return <Surreal props={props}/>;
    case 'legacy':
    default: return <CenterObject props={props}/>;
  }
}
