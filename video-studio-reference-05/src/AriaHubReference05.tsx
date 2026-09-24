import React from 'react';
import {AbsoluteFill,Easing,Img,Sequence,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/noto-kufi-arabic';
import {WarmField} from './components/WarmField';
import {PromptPanel} from './components/PromptPanel';

const UI="'Vazirmatn Variable',system-ui,sans-serif";
const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";
const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const E=Easing.bezier(.22,1,.36,1);
const logo=staticFile('logo-vector.svg');
const fade=(f:number,d:number)=>interpolate(f,[0,5,d-6,d],[0,1,1,0],C);
const blurIn=(f:number)=>interpolate(f,[0,10],[11,0],C);

const Base:React.FC<{children:React.ReactNode;opacity?:number}>=({children,opacity=1})=><AbsoluteFill style={{background:'#050505',color:'#f5f1eb',fontFamily:UI,overflow:'hidden',opacity}}><WarmField/>{children}</AbsoluteFill>;

const BrandIntro:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:100}});return <Base opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',alignItems:'center',gap:24,transform:`scale(${interpolate(p,[0,1],[.74,1])})`,filter:`blur(${blurIn(f)}px)`}}><Img src={logo} style={{width:92,height:92,borderRadius:20,boxShadow:'0 0 40px rgba(241,143,108,.22)'}}/><div style={{fontFamily:DISPLAY,fontSize:76,fontWeight:700}}>ARIA HUB</div></div></AbsoluteFill></Base>};

const Greeting:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const text='صبح بخیر، فرصت‌های امروز را نشان بده';const n=Math.floor(interpolate(f,[0,d-10],[0,text.length],C));return <Base opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:62,fontWeight:600,filter:`blur(${interpolate(f,[0,7],[7,0],C)}px)`,transform:`translateX(${interpolate(f,[0,12],[35,0],{...C,easing:E})}px)`}}><span style={{color:'#e89171'}}>✦</span> {text.slice(0,n)}<span style={{opacity:(f%14)<7?1:0}}>│</span></div></AbsoluteFill></Base>};

const UiScene:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const scale=interpolate(f,[0,d],[1.06,.96],C);return <Base opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',transform:`scale(${scale}) translateY(${interpolate(f,[0,18],[70,0],{...C,easing:E})}px)`}}><PromptPanel text="بورسیه‌ها، کارآموزی‌ها و فرصت‌های نزدیک را برای من پیدا کن" typed submitted={f>44}/></AbsoluteFill></Base>};

const SubmitImpact:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const p=interpolate(f,[0,d],[0,1],C);return <Base opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}>{Array.from({length:9}).map((_,i)=><div key={i} style={{position:'absolute',width:140+i*95,height:140+i*95,borderRadius:'50%',border:'3px solid rgba(238,161,125,.22)',transform:`scale(${.35+p*(1+i*.08)})`,opacity:1-p}}/>)}<div style={{width:100,height:100,borderRadius:26,background:'#ee9a78',display:'flex',alignItems:'center',justifyContent:'center',fontSize:58,color:'#24100b',boxShadow:'0 0 65px rgba(242,158,123,.36)'}}>↑</div></AbsoluteFill></Base>};

const Response:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const rows=[['بورسیه‌های دارای تمویل کامل','فرصت‌های تازه برای تحصیل در خارج'],['فرصت‌های شغلی جدید','موقعیت‌های فعال و نزدیک به ددلاین'],['کارآموزی و فلوشیپ','برای ساخت تجربه و مسیر حرفه‌ای'],['ذخیره و مقایسه','فرصت‌های مناسب را برای اقدام نگه دار']];return <Base opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{width:1250,fontFamily:UI,transform:`translateY(${interpolate(f,[0,15],[38,0],{...C,easing:E})}px)`}}><div style={{fontFamily:DISPLAY,fontSize:50,fontWeight:700,marginBottom:32}}>پیشنهادهای امروز برای تو:</div>{rows.map((r,i)=>{const local=f-i*8;const o=interpolate(local,[0,10],[0,1],C);return <div key={r[0]} style={{opacity:o,margin:'18px 0',display:'grid',gridTemplateColumns:'1fr 1.35fr',gap:28,fontSize:31,lineHeight:1.45}}><b style={{color:i===3?'#ef9b79':'#f3eee8'}}>{r[0]}</b><span style={{color:'rgba(255,255,255,.60)'}}>{r[1]}</span></div>})}</div></AbsoluteFill></Base>};

const Close:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const first=f<18;const second=f>=18&&f<38;return <Base opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}>{first&&<div dir="rtl" style={{fontFamily:DISPLAY,fontSize:85,fontWeight:700}}>فرصت‌ها را</div>}{second&&<div dir="rtl" style={{fontFamily:DISPLAY,fontSize:78,fontWeight:500,color:'#e9dfd8'}}>سریع‌تر</div>}{!first&&!second&&<Img src={logo} style={{width:94,height:94,borderRadius:20,boxShadow:'0 0 45px rgba(238,151,115,.28)'}}/>}</AbsoluteFill></Base>};

const D=[42,45,66,47,82,54];
const S=D.reduce((a,v,i)=>{a.push(i?a[i-1]+D[i-1]:0);return a},[] as number[]);

export const AriaHubReference05:React.FC=()=> <AbsoluteFill style={{background:'#050505',fontFamily:UI}}>
  <Sequence from={S[0]} durationInFrames={D[0]}><BrandIntro d={D[0]}/></Sequence>
  <Sequence from={S[1]} durationInFrames={D[1]}><Greeting d={D[1]}/></Sequence>
  <Sequence from={S[2]} durationInFrames={D[2]}><UiScene d={D[2]}/></Sequence>
  <Sequence from={S[3]} durationInFrames={D[3]}><SubmitImpact d={D[3]}/></Sequence>
  <Sequence from={S[4]} durationInFrames={D[4]}><Response d={D[4]}/></Sequence>
  <Sequence from={S[5]} durationInFrames={D[5]}><Close d={D[5]}/></Sequence>
</AbsoluteFill>;
