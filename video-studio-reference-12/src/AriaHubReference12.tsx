import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,Sequence,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/noto-kufi-arabic';
import {ArcadeStage} from './components/ArcadeStage';
import {CategoryChip} from './components/CategoryChip';
import {ResultCard} from './components/ResultCard';

const UI="'Vazirmatn Variable',system-ui,sans-serif";
const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";
const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const E=Easing.bezier(.22,1,.36,1);
const logo=staticFile('logo-vector.svg');
const NAVY='#162850',GOLD='#F4D398',PURPLE='#7762FF',CYAN='#68E0D0';
const fade=(f:number,d:number)=>interpolate(f,[0,5,d-6,d],[0,1,1,0],C);
const o=(f:number,a:number,b=a+10)=>interpolate(f,[a,b],[0,1],C);
const rise=(f:number,a:number,px=34)=>interpolate(f,[a,a+17],[px,0],{...C,easing:E});

const Hook:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <ArcadeStage><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,color:'#fff',opacity:fade(f,d)}}><div dir="rtl" style={{textAlign:'center',fontFamily:DISPLAY,fontWeight:780}}><div style={{fontSize:74,opacity:o(f,0)}}>فرصت زیاد است.</div><div style={{fontSize:96,color:GOLD,opacity:o(f,22),transform:`translateY(${rise(f,22,28)}px)`}}>وقت کم.</div></div></AbsoluteFill></ArcadeStage>};

const Categories:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const items=[['بورسیه','✦','#F4D398'],['شغل','↗','#6FE4D3'],['کارآموزی','◫','#8CA2FF'],['فلوشیپ','◎','#F2A7CF']];const pos=[[260,220],[1150,190],[260,650],[1160,650]];return <ArcadeStage><AbsoluteFill style={{fontFamily:UI,opacity:fade(f,d)}}><div style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)'}}><Img src={logo} style={{width:145,height:145,borderRadius:30,boxShadow:'0 0 70px rgba(102,126,255,.24)'}}/></div>{items.map(([t,s,a],i)=><CategoryChip key={t} title={t} symbol={s} accent={a} style={{position:'absolute',left:pos[i][0],top:pos[i][1],opacity:o(f,i*6),transform:`translateY(${rise(f,i*6,35)}px) rotate(${i%2?-3:3}deg)`}}/>)}</AbsoluteFill></ArcadeStage>};

const Search:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const q='تمویل کامل، علوم کمپیوتر، اروپا';const n=Math.floor(interpolate(f,[20,62],[0,q.length],C));return <ArcadeStage light><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{width:1260,height:360,borderRadius:44,background:'#fff',border:'1px solid rgba(35,38,60,.08)',boxShadow:'0 35px 100px rgba(63,52,102,.14)',padding:'48px 56px'}}><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:42,fontWeight:760,color:'#1D2234'}}>چه فرصتی می‌خواهی؟</div><div style={{height:92,borderRadius:22,border:'1px solid rgba(38,42,67,.12)',marginTop:28,display:'flex',alignItems:'center',padding:'0 24px'}}><span style={{fontSize:31,color:PURPLE}}>⌕</span><div dir="rtl" style={{flex:1,fontSize:31,fontWeight:600,color:'#22273A',textAlign:'right',padding:'0 22px'}}>{q.slice(0,n)}<span style={{opacity:(f%14)<7?1:0,color:PURPLE}}>│</span></div><div style={{padding:'13px 22px',borderRadius:15,background:NAVY,color:'#fff',fontWeight:800}}>جستجو</div></div></div></AbsoluteFill></ArcadeStage>};

const Match:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:95}});return <ArcadeStage><AbsoluteFill style={{alignItems:'center',justifyContent:'center',opacity:fade(f,d)}}><div style={{transform:`scale(${interpolate(p,[0,1],[.76,1])})`}}><ResultCard/></div></AbsoluteFill></ArcadeStage>};

const Actions:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const actions=[['ذخیره','♡'],['مقایسه','◫'],['ددلاین','◷'],['بررسی شرایط','✓']];return <ArcadeStage><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{display:'flex',alignItems:'center',gap:54}}><ResultCard compact/><div dir="rtl" style={{width:550}}><div style={{fontFamily:DISPLAY,fontSize:44,fontWeight:780,color:'#fff',lineHeight:1.55}}>فقط پیدا نکن.<br/><span style={{color:GOLD}}>آمادهٔ اقدام شو.</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:28}}>{actions.map(([t,s],i)=><div key={t} style={{height:76,borderRadius:19,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',gap:10,color:'#fff',fontWeight:760,opacity:o(f,i*5),transform:`translateY(${rise(f,i*5,22)}px)`}}><span style={{color:CYAN}}>{s}</span>{t}</div>)}</div></div></div></AbsoluteFill></ArcadeStage>};

const CTA:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <ArcadeStage><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,color:'#fff',opacity:fade(f,d)}}><div dir="rtl" style={{textAlign:'center',fontFamily:DISPLAY,fontWeight:850}}><div style={{fontSize:62,opacity:o(f,0)}}>پیدا کن.</div><div style={{fontSize:86,color:CYAN,opacity:o(f,16),transform:`translateY(${rise(f,16,26)}px)`}}>ذخیره کن.</div><div style={{fontSize:104,color:GOLD,opacity:o(f,32),transform:`translateY(${rise(f,32,28)}px)`}}>اقدام کن.</div></div></AbsoluteFill></ArcadeStage>};

const End:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:92}});return <ArcadeStage><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,color:'#fff',opacity:fade(f,d)}}><div style={{textAlign:'center',transform:`scale(${interpolate(p,[0,1],[.75,1])})`}}><div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20}}><Img src={logo} style={{width:118,height:118,borderRadius:25}}/><div style={{fontFamily:DISPLAY,fontSize:68,fontWeight:850}}>ARIA HUB</div></div><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:35,fontWeight:680,marginTop:22}}>فرصت مناسب را سریع‌تر پیدا کن.</div><div style={{display:'inline-flex',marginTop:23,padding:'13px 28px',borderRadius:999,background:GOLD,color:NAVY,fontWeight:850}}>myariahub.com</div></div></AbsoluteFill></ArcadeStage>};

const D=[60,72,84,78,96,78,72];
const S=D.reduce((a,v,i)=>{a.push(i?a[i-1]+D[i-1]:0);return a},[] as number[]);

export const AriaHubReference12:React.FC=()=> <AbsoluteFill style={{fontFamily:UI,background:'#080A12'}}>
 <Audio src={staticFile('audio/reference-12-ad-original.m4a')} volume={1}/>
 <Sequence from={S[0]} durationInFrames={D[0]}><Hook d={D[0]}/></Sequence>
 <Sequence from={S[1]} durationInFrames={D[1]}><Categories d={D[1]}/></Sequence>
 <Sequence from={S[2]} durationInFrames={D[2]}><Search d={D[2]}/></Sequence>
 <Sequence from={S[3]} durationInFrames={D[3]}><Match d={D[3]}/></Sequence>
 <Sequence from={S[4]} durationInFrames={D[4]}><Actions d={D[4]}/></Sequence>
 <Sequence from={S[5]} durationInFrames={D[5]}><CTA d={D[5]}/></Sequence>
 <Sequence from={S[6]} durationInFrames={D[6]}><End d={D[6]}/></Sequence>
</AbsoluteFill>;
