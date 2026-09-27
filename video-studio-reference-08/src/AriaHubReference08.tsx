import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,Sequence,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/noto-kufi-arabic';
import {GlowCanvas} from './components/GlowCanvas';
import {OpportunityCard} from './components/OpportunityCard';
import {Phone} from './components/Device';

const UI="'Vazirmatn Variable',system-ui,sans-serif";
const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";
const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const E=Easing.bezier(.22,1,.36,1);
const logo=staticFile('logo-vector.svg');
const NAVY='#162850',PURPLE='#7359F6',GREEN='#3FB77B';
const fade=(f:number,d:number)=>interpolate(f,[0,7,d-8,d],[0,1,1,0],C);
const show=(f:number,a:number,b=a+15)=>interpolate(f,[a,b],[0,1],C);
const rise=(f:number,a:number,px=36)=>interpolate(f,[a,a+20],[px,0],{...C,easing:E});

const Hook:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:15,stiffness:90}});
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{position:'relative',width:1180,height:760}}>
  <Phone style={{position:'absolute',left:'50%',top:'50%',transform:`translate(-50%,-50%) scale(${interpolate(p,[0,1],[.72,1])})`}}><div dir="rtl" style={{padding:'100px 25px 20px',background:'linear-gradient(180deg,#f7f3ff,#fff)',height:'100%'}}><div style={{display:'flex',alignItems:'center',gap:10}}><Img src={logo} style={{width:44,height:44,borderRadius:10}}/><b style={{fontFamily:DISPLAY,color:NAVY}}>ARIA HUB</b></div><div style={{fontFamily:DISPLAY,fontSize:35,fontWeight:760,lineHeight:1.5,marginTop:60}}>فرصت بعدی‌ات<br/>ممکن است همین‌جا باشد.</div><div style={{marginTop:30,padding:'15px 18px',borderRadius:18,background:'#fff',boxShadow:'0 12px 32px rgba(65,45,90,.09)',color:'rgba(33,32,51,.48)'}}>جستجوی بورسیه، شغل، کارآموزی…</div></div></Phone>
  {([['بورسیه',110,80],['شغل',850,130],['کارآموزی',90,560],['فلوشیپ',880,560]] as const).map(([t,x,y],i)=><div key={t} dir="rtl" style={{position:'absolute',left:x,top:y,padding:'12px 19px',borderRadius:999,background:'#fff',boxShadow:'0 15px 40px rgba(75,45,100,.11)',fontWeight:800,color:i%2?PURPLE:NAVY,opacity:show(f,5+i*7),transform:`translateY(${rise(f,5+i*7,25)}px)`}}>{t}</div>)}
 </div></AbsoluteFill></GlowCanvas>
};

const ProblemText:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();const lines=[['هر روز،','فرصتی هست'],['که ارزش','کشف کردن دارد.']];
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div dir="rtl" style={{textAlign:'center',fontFamily:DISPLAY,fontSize:70,fontWeight:650,lineHeight:1.65}}>{lines.map((l,i)=><div key={i} style={{opacity:show(f,i*40),transform:`translateY(${rise(f,i*40,30)}px)`}}>{l[0]} <span style={{color:PURPLE}}>{l[1]}</span></div>)}</div></AbsoluteFill></GlowCanvas>
};

const ProblemCollage:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();const cards=[['بورسیه با تمویل کامل','اروپا · ددلاین ۱۲ روز','بورسیه','#3FB77B'],['Junior Developer','ریموت · تمام‌وقت','شغل','#7359F6'],['Global Fellowship','بین‌المللی · ۶ ماه','فلوشیپ','#D37C42'],['Internship Program','کارآموزی · تابستان','کارآموزی','#A72A52']];
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{position:'relative',width:1500,height:760}}>
  {cards.map((c,i)=>{const pos=[[90,90],[1020,95],[120,485],[1010,485]][i];return <OpportunityCard key={c[0]} title={c[0]} meta={c[1]} tag={c[2]} accent={c[3]} style={{position:'absolute',left:pos[0],top:pos[1],opacity:show(f,i*6),transform:`rotate(${i%2?-4:4}deg) translateY(${rise(f,i*6,35)}px)`}}/>})}
  <div dir="rtl" style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',fontFamily:DISPLAY,fontSize:60,fontWeight:780,textAlign:'center',lineHeight:1.55}}>فرصت زیاد است.<br/><span style={{color:PURPLE}}>پیدا کردن گزینهٔ درست سخت است.</span></div>
 </div></AbsoluteFill></GlowCanvas>
};

const SimpleBrand:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:15,stiffness:95}});
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',transform:`scale(${interpolate(p,[0,1],[.72,1])})`}}><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:90,fontWeight:800,color:NAVY}}>ساده‌تر.</div><div style={{display:'flex',alignItems:'center',gap:18,marginTop:30}}><Img src={logo} style={{width:105,height:105,borderRadius:23}}/><div style={{fontFamily:DISPLAY,fontSize:62,fontWeight:850,color:NAVY}}>ARIA HUB</div></div></div></AbsoluteFill></GlowCanvas>
};

const DesktopUse:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{width:1450,height:780,borderRadius:32,background:'#16171c',padding:16,boxShadow:'0 50px 130px rgba(49,32,80,.20)',transform:`scale(${interpolate(f,[0,d],[1.04,.98],C)})`}}><div style={{height:'100%',borderRadius:20,background:'#fff',overflow:'hidden'}}><div style={{height:64,display:'flex',alignItems:'center',padding:'0 28px',borderBottom:'1px solid rgba(38,36,55,.08)'}}><div style={{display:'flex',alignItems:'center',gap:12}}><Img src={logo} style={{width:40,height:40,borderRadius:9}}/><b style={{fontFamily:DISPLAY,color:NAVY}}>ARIA HUB</b></div><div style={{marginLeft:'auto',display:'flex',gap:26,color:'rgba(33,32,51,.50)',fontSize:16}}><span>فرصت‌ها</span><span>ذخیره‌شده‌ها</span><span>درباره ما</span></div></div><div dir="rtl" style={{padding:'38px 46px'}}><div style={{fontFamily:DISPLAY,fontSize:43,fontWeight:780}}>فرصت مناسب را سریع‌تر پیدا کن</div><div style={{marginTop:22,height:62,borderRadius:17,border:'1px solid rgba(55,45,80,.12)',display:'flex',alignItems:'center',padding:'0 20px',color:'rgba(33,32,51,.42)'}}>جستجوی عنوان، سازمان یا کشور… <span style={{marginRight:'auto',padding:'10px 18px',background:NAVY,color:'#fff',borderRadius:12}}>جستجو</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginTop:28}}>{[['بورسیه‌ها','۱۸۴'],['شغل‌ها','۲۲۱'],['کارآموزی‌ها','۷۹']].map(([a,b],i)=><div key={a} style={{height:120,borderRadius:18,background:i===0?'#f0ecff':'#f8f7fb',padding:20,opacity:show(f,i*6)}}><div style={{fontSize:15,color:'rgba(33,32,51,.44)'}}>{a}</div><b style={{fontSize:32,color:i===0?PURPLE:NAVY}}>{b}</b></div>)}</div></div></div></div></AbsoluteFill></GlowCanvas>
};

const MobileGuide:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{position:'relative',width:1320,height:780}}><div dir="rtl" style={{position:'absolute',left:80,top:180,width:530}}><div style={{fontFamily:DISPLAY,fontSize:58,fontWeight:800,lineHeight:1.45}}>هر جا که باشی،<br/><span style={{color:PURPLE}}>مسیرت را پیدا کن.</span></div><div style={{fontSize:24,color:'rgba(33,32,51,.50)',marginTop:20}}>فرصت‌ها را ببین، ذخیره کن و قبل از ددلاین اقدام کن.</div></div><Phone style={{position:'absolute',right:110,top:0,transform:`translateY(${rise(f,0,55)}px)`}}><div dir="rtl" style={{height:'100%',padding:'90px 22px 25px',background:'linear-gradient(180deg,#faf7ff,#fff)'}}><div style={{fontFamily:DISPLAY,fontSize:23,fontWeight:800,color:NAVY}}>فرصت‌های امروز</div>{[['بورسیه','تمویل کامل'],['شغل','ریموت'],['کارآموزی','بین‌المللی']].map((x,i)=><div key={x[0]} style={{marginTop:22,padding:16,borderRadius:18,background:'#fff',boxShadow:'0 10px 28px rgba(67,45,90,.08)',opacity:show(f,i*7)}}><b>{x[0]}</b><div style={{fontSize:14,color:'rgba(33,32,51,.45)',marginTop:4}}>{x[1]}</div></div>)}</div></Phone></div></AbsoluteFill></GlowCanvas>
};

const LinkScene:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();const scan=interpolate(f,[0,d],[0,1],C);
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{position:'relative',width:1260,height:730}}><div style={{position:'absolute',left:100,top:145,width:520,height:390,borderRadius:30,background:'#fff',boxShadow:'0 30px 90px rgba(70,45,100,.14)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:230,height:230,borderRadius:22,background:'repeating-linear-gradient(45deg,#162850 0 12px,#fff 12px 24px)',position:'relative',overflow:'hidden'}}><div style={{position:'absolute',left:0,right:0,top:`${scan*100}%`,height:4,background:PURPLE,boxShadow:'0 0 18px #7359F6'}}/></div></div><Phone style={{position:'absolute',right:120,top:-5,transform:`scale(${interpolate(f,[0,20],[.86,1],{...C,easing:E})})`}}><div dir="rtl" style={{height:'100%',padding:'100px 24px 24px',background:'#fff'}}><div style={{fontFamily:DISPLAY,fontSize:25,fontWeight:800,color:NAVY}}>ARIA HUB</div><div style={{marginTop:50,fontFamily:DISPLAY,fontSize:34,fontWeight:760,lineHeight:1.55}}>همهٔ فرصت‌ها،<br/>در موبایل تو.</div><div style={{marginTop:28,padding:'15px 18px',borderRadius:16,background:'#f3efff',color:PURPLE,fontWeight:800}}>myariahub.com</div></div></Phone></div></AbsoluteFill></GlowCanvas>
};

const PhoneFlow:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{position:'relative',width:1420,height:800}}><Phone style={{position:'absolute',left:'50%',top:0,transform:'translateX(-50%)'}}><div dir="rtl" style={{height:'100%',padding:'92px 20px 22px',background:'linear-gradient(180deg,#fbf9ff,#fff)'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><b style={{fontFamily:DISPLAY,color:NAVY}}>پیشنهاد برای تو</b><span style={{fontSize:14,color:PURPLE}}>۹۲٪ تطبیق</span></div><div style={{marginTop:25,padding:18,borderRadius:20,background:'#fff',boxShadow:'0 12px 34px rgba(75,45,100,.09)'}}><span style={{padding:'7px 10px',borderRadius:999,background:'#e7f7ed',color:GREEN,fontWeight:800,fontSize:12}}>تمویل کامل</span><div style={{fontFamily:DISPLAY,fontSize:23,fontWeight:760,lineHeight:1.5,marginTop:12}}>بورسیه بین‌المللی ۲۰۲۷</div><div style={{fontSize:14,color:'rgba(33,32,51,.46)',marginTop:7}}>ددلاین: ۱۲ روز دیگر</div><div style={{display:'flex',gap:10,marginTop:18}}><div style={{flex:1,padding:'11px',borderRadius:12,background:'#f0ecff',color:PURPLE,textAlign:'center',fontWeight:800}}>ذخیره</div><div style={{flex:1,padding:'11px',borderRadius:12,background:NAVY,color:'#fff',textAlign:'center',fontWeight:800}}>جزئیات</div></div></div></div></Phone>{['ذخیره','مقایسه','اقدام'].map((t,i)=><div key={t} dir="rtl" style={{position:'absolute',left:i===0?150:i===1?1050:120,top:i===0?190:i===1?380:580,padding:'13px 22px',borderRadius:999,background:'#fff',boxShadow:'0 14px 38px rgba(75,45,100,.11)',fontWeight:850,color:i===2?GREEN:PURPLE,opacity:show(f,i*10),transform:`translateY(${rise(f,i*10,22)}px)`}}>{t}</div>)}</div></AbsoluteFill></GlowCanvas>
};

const CTA:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div dir="rtl" style={{textAlign:'center',fontFamily:DISPLAY,fontWeight:850}}><div style={{fontSize:58,opacity:show(f,0),transform:`translateY(${rise(f,0,20)}px)`}}>پیدایش کن.</div><div style={{fontSize:98,color:PURPLE,opacity:show(f,20),transform:`translateY(${rise(f,20,28)}px)`}}>اقدام کن.</div></div></AbsoluteFill></GlowCanvas>
};

const End:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f,fps,config:{damping:16,stiffness:90}});
 return <GlowCanvas><AbsoluteFill style={{alignItems:'center',justifyContent:'center',fontFamily:UI,opacity:fade(f,d)}}><div style={{textAlign:'center',transform:`scale(${interpolate(p,[0,1],[.76,1])})`}}><div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:22}}><Img src={logo} style={{width:130,height:130,borderRadius:28}}/><div style={{fontFamily:DISPLAY,fontSize:70,fontWeight:850,color:NAVY}}>ARIA HUB</div></div><div dir="rtl" style={{fontFamily:DISPLAY,fontSize:36,fontWeight:700,marginTop:20}}>فرصت مناسب بعدی‌ات را پیدا کن</div><div style={{display:'inline-flex',marginTop:23,padding:'13px 29px',borderRadius:999,background:NAVY,color:'#fff',fontSize:21,fontWeight:800}}>myariahub.com</div></div></AbsoluteFill></GlowCanvas>
};

const D=[96,180,114,90,180,180,180,135,81,72];
const S=D.reduce((a,v,i)=>{a.push(i?a[i-1]+D[i-1]:0);return a},[] as number[]);

export const AriaHubReference08:React.FC=()=> <AbsoluteFill style={{fontFamily:UI,background:'#fff'}}>
 <Audio src={staticFile('audio/reference-08-ad-original.m4a')} volume={1}/>
 <Sequence from={S[0]} durationInFrames={D[0]}><Hook d={D[0]}/></Sequence>
 <Sequence from={S[1]} durationInFrames={D[1]}><ProblemText d={D[1]}/></Sequence>
 <Sequence from={S[2]} durationInFrames={D[2]}><ProblemCollage d={D[2]}/></Sequence>
 <Sequence from={S[3]} durationInFrames={D[3]}><SimpleBrand d={D[3]}/></Sequence>
 <Sequence from={S[4]} durationInFrames={D[4]}><DesktopUse d={D[4]}/></Sequence>
 <Sequence from={S[5]} durationInFrames={D[5]}><MobileGuide d={D[5]}/></Sequence>
 <Sequence from={S[6]} durationInFrames={D[6]}><LinkScene d={D[6]}/></Sequence>
 <Sequence from={S[7]} durationInFrames={D[7]}><PhoneFlow d={D[7]}/></Sequence>
 <Sequence from={S[8]} durationInFrames={D[8]}><CTA d={D[8]}/></Sequence>
 <Sequence from={S[9]} durationInFrames={D[9]}><End d={D[9]}/></Sequence>
</AbsoluteFill>;
