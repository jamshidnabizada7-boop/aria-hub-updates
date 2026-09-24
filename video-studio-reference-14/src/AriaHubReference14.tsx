import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,Sequence,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/noto-kufi-arabic';
import {OpportunityTile} from './components/OpportunityTile';

const UI="'Vazirmatn Variable',system-ui,sans-serif";
const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";
const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const E=Easing.bezier(.22,1,.36,1);
const logo=staticFile('logo-vector.svg');
const NAVY='#162850';
const fade=(f:number,d:number)=>interpolate(f,[0,4,d-5,d],[0,1,1,0],C);
const show=(f:number,a:number,b=a+10)=>interpolate(f,[a,b],[0,1],C);
const rise=(f:number,a:number,px=28)=>interpolate(f,[a,a+16],[px,0],{...C,easing:E});

const Clean:React.FC<{children:React.ReactNode;opacity?:number}>=({children,opacity=1})=><AbsoluteFill style={{background:'#fff',fontFamily:UI,color:NAVY,overflow:'hidden',opacity}}><div style={{position:'absolute',left:'50%',top:'48%',width:1250,height:620,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(249,212,152,.22),rgba(115,89,246,.08) 42%,transparent 72%)',filter:'blur(58px)'}}/>{children}</AbsoluteFill>;

const Hook:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <Clean opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:48,fontWeight:620,transform:`translateY(${rise(f,0,18)}px)`}}>دنبال یک <span style={{color:'#7C5DF6'}}>فرصت تازه‌ای؟</span></div></AbsoluteFill></Clean>};

const Intro:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <Clean opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:DISPLAY,fontSize:118,fontWeight:850,letterSpacing:-2,background:'linear-gradient(90deg,#162850 0%,#7C5DF6 48%,#F1B7B0 100%)',WebkitBackgroundClip:'text',color:'transparent',transform:`scale(${interpolate(f,[0,20],[.82,1],{...C,easing:E})})`}}>ARIA HUB</div></AbsoluteFill></Clean>};

const LogoPop:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:15,stiffness:105}});return <Clean opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><Img src={logo} style={{width:145,height:145,borderRadius:30,boxShadow:'0 24px 65px rgba(22,40,80,.15)',transform:`scale(${interpolate(p,[0,1],[.45,1])})`}}/></AbsoluteFill></Clean>};

const Collage:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const cards=[['بورسیه ۲۰۲۷','بورسیه','تمویل کامل · اروپا','#9EDDBB'],['Junior Developer','شغل','ریموت · تمام‌وقت','#B2B9FF'],['Global Internship','کارآموزی','تابستان · بین‌المللی','#F8C7D9'],['Professional Fellowship','فلوشیپ','۶ ماه · تمویل‌شده','#F9D498'],['Exchange Program','تبادله','فرصت بین‌المللی','#A9E5DD'],['Research Grant','پژوهش','ددلاین نزدیک','#D2C4FF']];const pos=[[255,160],[535,110],[815,170],[1090,125],[675,500],[965,505]];return <Clean opacity={fade(f,d)}><AbsoluteFill>{cards.map((c,i)=><div key={c[0]} style={{position:'absolute',left:pos[i][0],top:pos[i][1],opacity:show(f,i*3),transform:`translateY(${rise(f,i*3,36)}px) rotate(${i%2?-4:4}deg) scale(${i>3?.86:.95})`}}><OpportunityTile title={c[0]} tag={c[1]} meta={c[2]} accent={c[3]}/></div>)}</AbsoluteFill></Clean>};

const Shortlist:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <Clean opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',alignItems:'center',gap:54}}><div style={{transform:'scale(.82)'}}><OpportunityTile title="بورسیه بین‌المللی ۲۰۲۷" tag="پیشنهاد ویژه" meta="تمویل کامل · کارشناسی ارشد · اروپا" accent="#F9D498"/></div><div dir="rtl" style={{width:650}}><div style={{fontFamily:DISPLAY,fontSize:50,fontWeight:780,lineHeight:1.55}}>از میان صدها فرصت،<br/><span style={{color:'#7C5DF6'}}>گزینهٔ مناسب را پیدا کن.</span></div><div style={{fontSize:21,color:'rgba(22,40,80,.48)',marginTop:14}}>جستجو · مقایسه · ذخیره · اقدام</div></div></div></AbsoluteFill></Clean>};

const End:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:95}});return <Clean opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{textAlign:'center',transform:`scale(${interpolate(p,[0,1],[.76,1])})`}}><div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:18}}><Img src={logo} style={{width:100,height:100,borderRadius:22}}/><div style={{fontFamily:DISPLAY,fontSize:61,fontWeight:850}}>ARIA HUB</div></div><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:32,fontWeight:680,marginTop:18}}>فرصتت را با ARIA HUB پیدا کن.</div><div style={{display:'inline-flex',marginTop:18,padding:'11px 25px',borderRadius:999,background:NAVY,color:'#fff',fontSize:19,fontWeight:800}}>myariahub.com</div></div></AbsoluteFill></Clean>};

const D=[30,24,24,52,30,20];
const S=D.reduce((a,v,i)=>{a.push(i?a[i-1]+D[i-1]:0);return a},[] as number[]);

export const AriaHubReference14:React.FC=()=> <AbsoluteFill style={{fontFamily:UI,background:'#fff'}}>
 <Audio src={staticFile('audio/reference-14-ad-original.m4a')} volume={1}/>
 <Sequence from={S[0]} durationInFrames={D[0]}><Hook d={D[0]}/></Sequence>
 <Sequence from={S[1]} durationInFrames={D[1]}><Intro d={D[1]}/></Sequence>
 <Sequence from={S[2]} durationInFrames={D[2]}><LogoPop d={D[2]}/></Sequence>
 <Sequence from={S[3]} durationInFrames={D[3]}><Collage d={D[3]}/></Sequence>
 <Sequence from={S[4]} durationInFrames={D[4]}><Shortlist d={D[4]}/></Sequence>
 <Sequence from={S[5]} durationInFrames={D[5]}><End d={D[5]}/></Sequence>
</AbsoluteFill>;
