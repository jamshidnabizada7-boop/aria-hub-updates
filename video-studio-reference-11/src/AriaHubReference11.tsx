import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,Sequence,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/noto-kufi-arabic';
import {BlueStage} from './components/BlueStage';
import {PortfolioCard} from './components/PortfolioCard';

const UI="'Vazirmatn Variable',system-ui,sans-serif";
const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";
const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const E=Easing.bezier(.22,1,.36,1);
const logo=staticFile('logo-vector.svg');
const GOLD='#F4D398',WHITE='#fff';
const fade=(f:number,d:number)=>interpolate(f,[0,6,d-7,d],[0,1,1,0],C);
const o=(f:number,a:number,b=a+12)=>interpolate(f,[a,b],[0,1],C);
const y=(f:number,a:number,px=30)=>interpolate(f,[a,a+18],[px,0],{...C,easing:E});

const Hook:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <BlueStage opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,color:WHITE}}><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:70,fontWeight:620,textAlign:'center',lineHeight:1.6}}><div style={{opacity:o(f,0)}}>فرصت از یک <span style={{color:GOLD}}>انتخاب</span> شروع می‌شود،</div><div style={{opacity:o(f,36),transform:`translateY(${y(f,36,26)}px)`}}>و ما دوست داریم ساده‌اش کنیم.</div></div></AbsoluteFill></BlueStage>};

const PlayScene:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const items=[['بورسیه','✦'],['شغل','↗'],['کارآموزی','◫'],['فلوشیپ','◎'],['آموزش','△'],['تبادله','◇']];return <BlueStage opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,color:'#fff'}}><div style={{display:'flex',flexWrap:'wrap',gap:26,width:1050,justifyContent:'center'}}>{items.map(([t,g],i)=><div key={t} dir="rtl" style={{width:290,height:120,borderRadius:28,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.18)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',gap:18,fontSize:26,fontWeight:750,opacity:o(f,i*7),transform:`translateY(${y(f,i*7,34)}px) rotate(${i%2?-2:2}deg)`,boxShadow:'0 18px 55px rgba(0,0,0,.12)'}}><span style={{color:GOLD,fontSize:31}}>{g}</span><span>{t}</span></div>)}</div></AbsoluteFill></BlueStage>};

const CategoryCascade:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const cats=['بورسیه تحصیلی','فرصت شغلی','کارآموزی','فلوشیپ','برنامه تبادله','دوره آموزشی','فرصت پژوهشی','رویداد بین‌المللی'];return <BlueStage opacity={fade(f,d)}><AbsoluteFill style={{fontFamily:UI,color:'#fff'}}><div dir="rtl" style={{position:'absolute',left:170,top:120,fontFamily:DISPLAY,fontSize:42,fontWeight:650}}>هر نوع فرصت، یک مسیر تازه.</div><div dir="rtl" style={{position:'absolute',right:150,top:170,width:900}}>{cats.map((c,i)=><div key={c} style={{fontFamily:DISPLAY,fontSize:43,fontWeight:i===3?850:560,color:i===3?GOLD:'rgba(255,255,255,.64)',lineHeight:1.45,opacity:o(f,i*5),transform:`translateX(${y(f,i*5,45)}px)`}}>{c}</div>)}</div></AbsoluteFill></BlueStage>};

const Portfolio:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const cards=[['بورسیه ۲۰۲۷','تمویل کامل · اروپا · ددلاین نزدیک','بورسیه','#A8E6C4'],['Junior Software Engineer','ریموت · تمام‌وقت · ۰–۲ سال','شغل','#F4D398'],['Global Internship','تابستان · بین‌المللی','کارآموزی','#B7C8FF'],['Professional Fellowship','۶ ماه · تمویل‌شده','فلوشیپ','#F5B5D3']];return <BlueStage opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI}}><div style={{display:'flex',gap:22,perspective:1400,transform:`translateX(${interpolate(f,[0,d],[-80,70],C)}px)`}}>{cards.map((c,i)=><div key={c[0]} style={{opacity:o(f,i*7),transform:`translateY(${y(f,i*7,48)}px) rotateY(${i===0?10:i===3?-10:0}deg) scale(${i===1||i===2?1:.92})`}}><PortfolioCard title={c[0]} meta={c[1]} tag={c[2]} accent={c[3]}/></div>)}</div></AbsoluteFill></BlueStage>};

const LogoBuild:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const dots=[[0,-95],[72,-35],[72,55],[0,100],[-72,55],[-72,-35]];const p=interpolate(f,[0,d],[0,1],C);return <BlueStage opacity={fade(f,d)} dark><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{position:'relative',width:430,height:430}}>{dots.map(([xv,yv],i)=>{const lp=interpolate(f,[i*5,i*5+20],[0,1],C);return <span key={i} style={{position:'absolute',left:`calc(50% + ${xv*lp}px)`,top:`calc(50% + ${yv*lp}px)`,width:52,height:52,borderRadius:'50%',background:i%2?GOLD:'#fff',transform:'translate(-50%,-50%)',boxShadow:'0 0 35px rgba(255,255,255,.14)',opacity:lp}}/>})}<div style={{position:'absolute',left:'50%',top:'50%',transform:`translate(-50%,-50%) scale(${interpolate(p,[.35,.8],[0,1],C)})`,opacity:interpolate(p,[.35,.6],[0,1],C)}}><Img src={logo} style={{width:150,height:150,borderRadius:32}}/></div></div></AbsoluteFill></BlueStage>};

const End:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:90}});return <BlueStage opacity={fade(f,d)} dark><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,color:'#fff'}}><div style={{textAlign:'center',transform:`scale(${interpolate(p,[0,1],[.76,1])})`}}><div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20}}><Img src={logo} style={{width:115,height:115,borderRadius:25}}/><div style={{fontFamily:DISPLAY,fontSize:68,fontWeight:850}}>ARIA HUB</div></div><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:36,fontWeight:680,marginTop:22}}>فرصت بعدی‌ات را پیدا کن.</div><div style={{display:'inline-flex',marginTop:22,padding:'13px 30px',borderRadius:999,background:GOLD,color:'#17213C',fontWeight:850,fontSize:21}}>myariahub.com</div></div></AbsoluteFill></BlueStage>};

const D=[105,105,120,150,75,75];
const S=D.reduce((a,v,i)=>{a.push(i?a[i-1]+D[i-1]:0);return a},[] as number[]);

export const AriaHubReference11:React.FC=()=> <AbsoluteFill style={{fontFamily:UI,background:'#082A73'}}>
 <Audio src={staticFile('audio/reference-11-ad-original.m4a')} volume={1}/>
 <Sequence from={S[0]} durationInFrames={D[0]}><Hook d={D[0]}/></Sequence>
 <Sequence from={S[1]} durationInFrames={D[1]}><PlayScene d={D[1]}/></Sequence>
 <Sequence from={S[2]} durationInFrames={D[2]}><CategoryCascade d={D[2]}/></Sequence>
 <Sequence from={S[3]} durationInFrames={D[3]}><Portfolio d={D[3]}/></Sequence>
 <Sequence from={S[4]} durationInFrames={D[4]}><LogoBuild d={D[4]}/></Sequence>
 <Sequence from={S[5]} durationInFrames={D[5]}><End d={D[5]}/></Sequence>
</AbsoluteFill>;
