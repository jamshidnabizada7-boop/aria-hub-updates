import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,Sequence,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/noto-kufi-arabic';
import {DarkAura} from './components/DarkAura';
import {OpportunityResult} from './components/OpportunityResult';

const UI="'Vazirmatn Variable',system-ui,sans-serif";
const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";
const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const E=Easing.bezier(.22,1,.36,1);
const logo=staticFile('logo-vector.svg');
const fade=(f:number,d:number)=>interpolate(f,[0,5,d-6,d],[0,1,1,0],C);
const o=(f:number,a:number,b=a+12)=>interpolate(f,[a,b],[0,1],C);
const y=(f:number,a:number,px=30)=>interpolate(f,[a,a+18],[px,0],{...C,easing:E});

const Brand:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:100}});return <DarkAura opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI}}><div style={{display:'flex',alignItems:'center',gap:24,transform:`scale(${interpolate(p,[0,1],[.74,1])})`}}><Img src={logo} style={{width:115,height:115,borderRadius:25,boxShadow:'0 0 55px rgba(73,172,255,.22)'}}/><div style={{fontFamily:DISPLAY,fontSize:72,fontWeight:850,color:'#fff'}}>ARIA HUB</div></div></AbsoluteFill></DarkAura>};

const Prompt:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const q='بورسیه‌های دارای تمویل کامل در اروپا را پیدا کن';const n=Math.floor(interpolate(f,[30,78],[0,q.length],C));return <DarkAura opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI}}><div style={{display:'flex',alignItems:'center',gap:34}}><div style={{width:190,height:190,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#dcf8ff,#84dfff 42%,#3f8cff 75%,#365de8 100%)',boxShadow:'0 0 75px rgba(79,174,255,.30)',transform:`scale(${1+Math.sin(f/16)*.025})`}}/><div dir="rtl" style={{width:780,fontFamily:DISPLAY,fontSize:39,fontWeight:650,lineHeight:1.6,color:'#fff'}}>{q.slice(0,n)}<span style={{opacity:(f%14)<7?1:0,color:'#74DCFF'}}>│</span></div></div></AbsoluteFill></DarkAura>};

const Generate:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <DarkAura opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI}}><div style={{transform:`scale(${interpolate(f,[0,24],[.80,1],{...C,easing:E})})`,opacity:o(f,0,12)}}><OpportunityResult/></div></AbsoluteFill></DarkAura>};

const Actions:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const actions=[['ذخیره','♡'],['مقایسه','◫'],['بررسی شرایط','✓'],['ددلاین','◷'],['اشتراک','↗']];return <DarkAura opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:24}}><OpportunityResult/><div style={{display:'flex',gap:12}}>{actions.map(([t,g],i)=><div key={t} style={{height:50,padding:'0 18px',borderRadius:999,background:'rgba(255,255,255,.09)',border:'1px solid rgba(255,255,255,.10)',color:'rgba(255,255,255,.72)',display:'flex',alignItems:'center',gap:8,fontSize:15,opacity:o(f,i*5),transform:`translateY(${y(f,i*5,20)}px)`}}><span>{g}</span><span>{t}</span></div>)}</div></div></AbsoluteFill></DarkAura>};

const Mobile:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <DarkAura opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI}}><div style={{width:500,height:840,borderRadius:68,background:'#16191f',padding:14,boxShadow:'0 55px 130px rgba(0,0,0,.42)',transform:`scale(${interpolate(f,[0,24],[.80,1],{...C,easing:E})})`}}><div style={{width:'100%',height:'100%',borderRadius:55,background:'#07090d',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{transform:'scale(.92)'}}><OpportunityResult portrait/></div></div></div></AbsoluteFill></DarkAura>};

const Close:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:92}});return <DarkAura opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI}}><div dir="rtl" style={{textAlign:'center',transform:`scale(${interpolate(p,[0,1],[.78,1])})`}}><div style={{fontFamily:DISPLAY,fontSize:62,fontWeight:780,color:'#fff'}}>فرصت مناسب را</div><div style={{fontFamily:DISPLAY,fontSize:92,fontWeight:900,marginTop:8,background:'linear-gradient(90deg,#75E8DF,#70A8FF,#A784FF)',WebkitBackgroundClip:'text',color:'transparent'}}>سریع‌تر پیدا کن.</div><div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,marginTop:34}}><Img src={logo} style={{width:72,height:72,borderRadius:16}}/><div style={{fontFamily:DISPLAY,fontSize:44,fontWeight:850,color:'#fff'}}>ARIA HUB</div></div><div style={{fontSize:21,color:'rgba(255,255,255,.50)',marginTop:15}}>myariahub.com</div></div></AbsoluteFill></DarkAura>};

const D=[42,90,72,72,72,57];
const S=D.reduce((a,v,i)=>{a.push(i?a[i-1]+D[i-1]:0);return a},[] as number[]);

export const AriaHubReference09:React.FC=()=> <AbsoluteFill style={{background:'#050609',fontFamily:UI}}>
 <Audio src={staticFile('audio/reference-09-ad-original.m4a')} volume={1}/>
 <Sequence from={S[0]} durationInFrames={D[0]}><Brand d={D[0]}/></Sequence>
 <Sequence from={S[1]} durationInFrames={D[1]}><Prompt d={D[1]}/></Sequence>
 <Sequence from={S[2]} durationInFrames={D[2]}><Generate d={D[2]}/></Sequence>
 <Sequence from={S[3]} durationInFrames={D[3]}><Actions d={D[3]}/></Sequence>
 <Sequence from={S[4]} durationInFrames={D[4]}><Mobile d={D[4]}/></Sequence>
 <Sequence from={S[5]} durationInFrames={D[5]}><Close d={D[5]}/></Sequence>
</AbsoluteFill>;
