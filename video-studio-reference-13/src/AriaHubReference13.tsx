import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,Sequence,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/noto-kufi-arabic';
import {BeamStage} from './components/BeamStage';
import {Projector} from './components/Projector';

const UI="'Vazirmatn Variable',system-ui,sans-serif";
const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";
const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const E=Easing.bezier(.22,1,.36,1);
const logo=staticFile('logo-vector.svg');
const NAVY='#162850',GOLD='#F9D498';
const fade=(f:number,d:number)=>interpolate(f,[0,5,d-6,d],[0,1,1,0],C);
const show=(f:number,a:number,b=a+12)=>interpolate(f,[a,b],[0,1],C);
const rise=(f:number,a:number,px=30)=>interpolate(f,[a,a+18],[px,0],{...C,easing:E});

const Intro:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <BeamStage><AbsoluteFill style={{fontFamily:UI,opacity:fade(f,d)}}><div style={{position:'absolute',left:180,top:410,transform:`translateX(${interpolate(f,[0,d],[-120,180],C)}px)`}}><Projector/></div><div dir="rtl" style={{position:'absolute',right:170,top:470,fontFamily:DISPLAY,fontSize:34,fontWeight:650,color:'rgba(22,40,80,.52)',opacity:show(f,18)}}>یک نور. یک مسیر.</div></AbsoluteFill></BeamStage>};

const BeamReveal:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <BeamStage><AbsoluteFill style={{fontFamily:UI,opacity:fade(f,d)}}><div style={{position:'absolute',left:160,top:405}}><Projector beam wide/></div><div style={{position:'absolute',left:780,top:325,overflow:'hidden',height:270,width:930}}><div style={{fontFamily:DISPLAY,fontSize:150,fontWeight:900,color:NAVY,letterSpacing:-5,transform:`translateX(${interpolate(f,[0,26],[520,0],{...C,easing:E})}px)`}}>ARIA</div><div style={{fontFamily:DISPLAY,fontSize:118,fontWeight:850,color:GOLD,letterSpacing:2,marginTop:-26,transform:`translateX(${interpolate(f,[10,38],[520,0],{...C,easing:E})}px)`}}>HUB</div></div></AbsoluteFill></BeamStage>};

const Categories:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const cats=['بورسیه','شغل','کارآموزی','فلوشیپ'];return <BeamStage dark><AbsoluteFill style={{fontFamily:UI,opacity:fade(f,d),color:'#fff'}}><div style={{position:'absolute',left:130,top:395,transform:'rotate(-8deg)'}}><Projector beam angle={-4}/></div><div dir="rtl" style={{position:'absolute',right:160,top:190,width:840}}>{cats.map((c,i)=><div key={c} style={{fontFamily:DISPLAY,fontSize:i===1?78:64,fontWeight:i===1?900:650,color:i===1?GOLD:'rgba(255,255,255,.70)',lineHeight:1.35,opacity:show(f,i*10),transform:`translateX(${rise(f,i*10,55)}px)`}}>{c}</div>)}</div><div dir="rtl" style={{position:'absolute',right:160,bottom:130,fontSize:22,color:'rgba(255,255,255,.48)',opacity:show(f,34)}}>فرصت مناسب را پیدا کن.</div></AbsoluteFill></BeamStage>};

const UrlReveal:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <BeamStage><AbsoluteFill style={{fontFamily:UI,opacity:fade(f,d)}}><div style={{position:'absolute',right:170,top:420,transform:'rotate(180deg)'}}><Projector beam angle={0}/></div><div style={{position:'absolute',left:230,top:410}}><div style={{fontFamily:DISPLAY,fontSize:82,fontWeight:850,color:NAVY,opacity:show(f,8),transform:`translateY(${rise(f,8,30)}px)`}}>myariahub.com</div><div dir="rtl" style={{fontSize:27,color:'rgba(22,40,80,.50)',marginTop:14,opacity:show(f,18)}}>جستجو · ذخیره · اقدام</div></div></AbsoluteFill></BeamStage>};

const LogoBuild:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:15,stiffness:90}});return <BeamStage dark><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d),color:'#fff'}}><div style={{position:'relative',width:950,height:420}}><div style={{position:'absolute',left:0,top:135,opacity:show(f,0)}}><Projector beam wide/></div><div style={{position:'absolute',left:520,top:75,display:'flex',alignItems:'center',gap:20,transform:`scale(${interpolate(p,[0,1],[.65,1])})`}}><Img src={logo} style={{width:128,height:128,borderRadius:28,boxShadow:'0 0 65px rgba(244,211,152,.20)'}}/><div><div style={{fontFamily:DISPLAY,fontSize:68,fontWeight:850}}>ARIA HUB</div><div dir="rtl" style={{fontSize:22,color:'rgba(255,255,255,.56)',marginTop:6}}>فرصت بعدی‌ات همین‌جا شروع می‌شود.</div></div></div></div></AbsoluteFill></BeamStage>};

const End:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:95}});return <BeamStage dark><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d),color:'#fff'}}><div style={{textAlign:'center',transform:`scale(${interpolate(p,[0,1],[.78,1])})`}}><Img src={logo} style={{width:130,height:130,borderRadius:28}}/><div style={{fontFamily:DISPLAY,fontSize:72,fontWeight:900,marginTop:18}}>ARIA HUB</div><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:34,fontWeight:650,marginTop:14,color:GOLD}}>فرصت بعدی‌ات را پیدا کن.</div><div style={{fontSize:23,color:'rgba(255,255,255,.55)',marginTop:16}}>myariahub.com</div></div></AbsoluteFill></BeamStage>};

const D=[60,75,90,75,75,75];
const S=D.reduce((a,v,i)=>{a.push(i?a[i-1]+D[i-1]:0);return a},[] as number[]);

export const AriaHubReference13:React.FC=()=> <AbsoluteFill style={{fontFamily:UI,background:'#FBFBFC'}}>
 <Audio src={staticFile('audio/reference-13-ad-original.m4a')} volume={1}/>
 <Sequence from={S[0]} durationInFrames={D[0]}><Intro d={D[0]}/></Sequence>
 <Sequence from={S[1]} durationInFrames={D[1]}><BeamReveal d={D[1]}/></Sequence>
 <Sequence from={S[2]} durationInFrames={D[2]}><Categories d={D[2]}/></Sequence>
 <Sequence from={S[3]} durationInFrames={D[3]}><UrlReveal d={D[3]}/></Sequence>
 <Sequence from={S[4]} durationInFrames={D[4]}><LogoBuild d={D[4]}/></Sequence>
 <Sequence from={S[5]} durationInFrames={D[5]}><End d={D[5]}/></Sequence>
</AbsoluteFill>;
