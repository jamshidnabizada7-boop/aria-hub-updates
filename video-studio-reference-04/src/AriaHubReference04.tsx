import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/noto-kufi-arabic';
import {GradientField} from './components/GradientField';
import {OrbitSystem} from './components/OrbitSystem';
import {PathCard} from './components/PathCard';

const UI = "'Vazirmatn Variable', system-ui, sans-serif";
const DISPLAY = "'Noto Kufi Arabic Variable', 'Vazirmatn Variable', sans-serif";
const C = {extrapolateLeft:'clamp', extrapolateRight:'clamp'} as const;
const E = Easing.bezier(.22,1,.36,1);
const logo = staticFile('logo-vector.svg');
const fade=(f:number,d:number)=>interpolate(f,[0,7,d-9,d],[0,1,1,0],C);
const rise=(f:number,px=38)=>interpolate(f,[0,24],[px,0],{...C,easing:E});

const Dark:React.FC<{children:React.ReactNode;opacity?:number}>=({children,opacity=1})=><AbsoluteFill style={{background:'#030408',color:'#fff',overflow:'hidden',opacity,fontFamily:UI}}>{children}</AbsoluteFill>;
const Light:React.FC<{children:React.ReactNode;opacity?:number}>=({children,opacity=1})=><AbsoluteFill style={{background:'#fafafa',color:'#0d1017',overflow:'hidden',opacity,fontFamily:UI}}>{children}</AbsoluteFill>;

const Intro:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();
 return <Dark opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:64,fontWeight:500,opacity:interpolate(f,[0,15,38,48],[0,1,1,0],C),transform:`translateY(${rise(f,20)}px)`}}>آغاز کنیم</div></AbsoluteFill></Dark>;
};

const SystemScene:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame(); const {fps}=useVideoConfig();
 const sp=spring({frame:f,fps,config:{damping:17,stiffness:85}});
 const morph=interpolate(f,[0,58,108,160],[0,1,2,3],C);
 const shape=morph<1?'line':morph<2?'stacks':'orbit';
 return <Dark opacity={fade(f,d)}><GradientField intensity={.72}/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}>
   {shape==='line'&&<div style={{position:'relative',width:650,height:800,transform:`scale(${.82+.18*sp})`}}>
     <svg width="650" height="800"><path d="M105 650 C95 515 270 495 265 355 C260 220 455 205 470 88" fill="none" stroke="rgba(255,255,255,.52)" strokeWidth="2.4" strokeDasharray="980" strokeDashoffset={interpolate(f,[0,58],[980,0],C)}/><circle cx="105" cy="650" r="9" fill="#fff"/><circle cx="470" cy="88" r="9" fill="#fff"/></svg>
     <div style={{position:'absolute',left:220,top:410,width:240,height:5,background:'linear-gradient(90deg,transparent,#235dff,#36efe5,transparent)',filter:'blur(3px)',boxShadow:'0 0 65px #255bff'}}/>
   </div>}
   {shape==='stacks'&&<div style={{position:'relative',width:710,height:900}}>{[0,1,2].map(i=><React.Fragment key={i}><div style={{position:'absolute',left:120+i*85,top:150+i*230,width:360,height:10,borderRadius:'50%',background:'linear-gradient(90deg,transparent,#2968ff,#32e9de,transparent)',filter:'blur(5px)',boxShadow:'0 0 75px #243eff'}}/><span style={{position:'absolute',left:300+i*45,top:90+i*230,width:18,height:18,borderRadius:'50%',background:'#fff'}}/></React.Fragment>)}</div>}
   {shape==='orbit'&&<OrbitSystem size={720} label="با یک مسیر روشن"/>}
 </AbsoluteFill></Dark>;
};

const FocusScene:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();
 const first=f<76; const second=f>=76;
 const showCard=f>118;
 return <Dark opacity={fade(f,d)}><GradientField intensity={.88} compact/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}>
   {first&&<div style={{fontFamily:DISPLAY,fontSize:64,fontWeight:500,transform:`translateY(${rise(f,24)}px)`}}>فرصت شکل می‌گیرد</div>}
   {second&&!showCard&&<div style={{width:620,height:220,borderRadius:52,background:'linear-gradient(100deg,#1b2aff 0%,#05e1da 100%)',boxShadow:'0 0 95px rgba(39,82,255,.42)',display:'flex',alignItems:'center',justifyContent:'center',transform:`scale(${interpolate(f,[76,118],[.75,1],{...C,easing:E})})`}}><Img src={logo} style={{width:115,height:115,borderRadius:24,opacity:.88}}/></div>}
   {showCard&&<div style={{width:870,height:330,borderRadius:38,background:'linear-gradient(100deg,#0a0d17 0%,#17133b 22%,#1848ff 55%,#18ded9 100%)',border:'1px solid rgba(255,255,255,.16)',boxShadow:'0 35px 110px rgba(0,0,0,.35)',display:'flex',alignItems:'center',padding:'0 70px',gap:38}}><Img src={logo} style={{width:95,height:95,borderRadius:22}}/><div dir="rtl"><div style={{fontFamily:DISPLAY,fontSize:66,fontWeight:700}}>تمرکز</div><div style={{fontSize:35,color:'rgba(255,255,255,.66)',marginTop:9}}>انتخاب را روشن‌تر می‌کند</div></div></div>}
 </AbsoluteFill></Dark>;
};

const FlowScene:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame(); const n=10;
 return <Dark opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}>
   <div style={{position:'relative',width:900,height:1050}}>
     {Array.from({length:n}).map((_,i)=>{const local=Math.max(0,f-i*6);const p=interpolate(local,[0,18],[0,1],C);const x=80+i*78;const h=interpolate(f,[80,186],[30,120+(i%4)*65],C);return <div key={i} style={{position:'absolute',left:x,top:470-h,width:3,height:h,background:'rgba(255,255,255,.35)',opacity:p}}><span style={{position:'absolute',left:-10,top:-10,width:23,height:23,borderRadius:'50%',background:'#fff',boxShadow:`0 0 28px ${i%2?'#35e2d8':'#283dff'},0 0 12px #fff`}}/></div>})}
     <svg width="900" height="580" style={{position:'absolute',left:0,top:140}}><path d="M80 375 C150 175 230 425 312 250 C392 83 472 405 552 227 C615 91 700 342 800 162" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeDasharray="1200" strokeDashoffset={interpolate(f,[0,d],[1200,0],C)}/></svg>
   </div>
   <div dir="rtl" style={{position:'absolute',bottom:315,fontFamily:DISPLAY,fontSize:54,fontWeight:500}}>تمرکز، انتخاب را منظم می‌کند</div>
 </AbsoluteFill></Dark>;
};

const BuildScene:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame(); const idx=Math.min(2,Math.floor(f/62));
 const items=[
  ['مسیر را بساز','جستجو و فیلتر، انتخاب‌های مناسب را جلو می‌آورد.','cyan'],
  ['ریتم ایجاد کن','ذخیره کن، مقایسه کن و در زمان مناسب اقدام کن.','violet'],
  ['به انتخاب معنا بده','فرصت مناسب را با اطلاعات روشن‌تر پیدا کن.','blue'],
 ] as const;
 return <Light opacity={fade(f,d)}><GradientField light intensity={.22}/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><PathCard title={items[idx][0]} detail={items[idx][1]} accent={items[idx][2]} invert delay={idx*2}/></AbsoluteFill></Light>;
};

const RhythmScene:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();
 return <Light opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{width:870,height:280,borderRadius:999,background:'#07090e',boxShadow:'0 0 70px rgba(41,78,255,.22)',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{position:'absolute',right:-20,top:-90,width:360,height:360,borderRadius:'50%',background:'radial-gradient(circle,#29e6df,transparent 70%)',filter:'blur(20px)',opacity:.5}}/><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:65,fontWeight:700,color:'#fff',position:'relative'}}>ذخیره. مقایسه. اقدام.</div></div></AbsoluteFill></Light>;
};

const ConnectedScene:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();
 const p=interpolate(f,[0,32],[0,1],C);
 return <Dark opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{position:'relative',width:870,height:280}}><div style={{position:'absolute',left:30,right:30,top:140,height:2,background:'rgba(255,255,255,.46)'}}/><span style={{position:'absolute',left:28,top:128,width:25,height:25,borderRadius:'50%',background:'#fff'}}/><div style={{position:'absolute',left:70,top:52,width:720,height:175,borderRadius:999,border:'2px solid transparent',background:'linear-gradient(#05060a,#05060a) padding-box,linear-gradient(90deg,#2f2aff,#1f56ff,#27dbc9) border-box',clipPath:`inset(0 ${(1-p)*100}% 0 0 round 999px)`,display:'flex',alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:62,fontWeight:600}}>همه‌چیز متصل</div></div></div></AbsoluteFill></Dark>;
};

const ThoughtScene:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();
 const p=interpolate(f,[0,d],[0,1],C);
 return <Dark opacity={fade(f,d)}><GradientField intensity={1.2}/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:64,fontWeight:600,transform:`translateX(${interpolate(p,[0,1],[-80,45],C)}px)`}}>فرصت در <span style={{background:'linear-gradient(90deg,#ff55d7,#5d7cff,#28e4d3)',WebkitBackgroundClip:'text',color:'transparent'}}>حرکت</span></div></AbsoluteFill></Dark>;
};

const BrandScene:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:88}});
 return <Dark opacity={fade(f,d)}><GradientField intensity={.56}/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',transform:`scale(${interpolate(p,[0,1],[.76,1])})`}}><Img src={logo} style={{width:215,height:215,borderRadius:44,boxShadow:'0 0 85px rgba(43,98,255,.25)'}}/><div style={{fontFamily:DISPLAY,fontSize:76,fontWeight:800,marginTop:30}}>ARIA HUB</div><div dir="rtl" style={{fontSize:34,color:'rgba(255,255,255,.66)',marginTop:12}}>فرصت را پیدا کن. مسیرت را بساز.</div><div style={{fontSize:29,color:'rgba(255,255,255,.46)',marginTop:22}}>myariahub.com</div></div></AbsoluteFill></Dark>;
};

const EndScene:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <Dark opacity={fade(f,d)}><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',alignItems:'center',gap:22,opacity:interpolate(f,[0,18],[0,1],C)}}><Img src={logo} style={{width:92,height:92,borderRadius:21}}/><div><div style={{fontFamily:DISPLAY,fontSize:48,fontWeight:800}}>ARIA HUB</div><div dir="rtl" style={{fontSize:27,color:'rgba(255,255,255,.6)'}}>جستجو · ذخیره · اقدام</div></div></div></AbsoluteFill></Dark>};

const D=[50,171,213,186,51,84,120,120,112];
const S=D.reduce((a,v,i)=>{a.push(i?a[i-1]+D[i-1]:0);return a},[] as number[]);

export const AriaHubReference04:React.FC=()=> <AbsoluteFill style={{background:'#030408',fontFamily:UI}}>
 <Audio src={staticFile('audio/reference-04-original.m4a')} volume={1}/>
 <Sequence from={S[0]} durationInFrames={D[0]}><Intro d={D[0]}/></Sequence>
 <Sequence from={S[1]} durationInFrames={D[1]}><SystemScene d={D[1]}/></Sequence>
 <Sequence from={S[2]} durationInFrames={D[2]}><FocusScene d={D[2]}/></Sequence>
 <Sequence from={S[3]} durationInFrames={D[3]}><FlowScene d={D[3]}/></Sequence>
 <Sequence from={S[4]} durationInFrames={D[4]}><RhythmScene d={D[4]}/></Sequence>
 <Sequence from={S[5]} durationInFrames={D[5]}><ConnectedScene d={D[5]}/></Sequence>
 <Sequence from={S[6]} durationInFrames={D[6]}><ThoughtScene d={D[6]}/></Sequence>
 <Sequence from={S[7]} durationInFrames={D[7]}><BrandScene d={D[7]}/></Sequence>
 <Sequence from={S[8]} durationInFrames={D[8]}><EndScene d={D[8]}/></Sequence>
</AbsoluteFill>;
