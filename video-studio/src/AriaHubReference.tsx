import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,Sequence,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';

const B={navy:'#162850',deep:'#08101f',gold:'#F9D498',ink:'#11131A',white:'#fff'};
const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const E=Easing.bezier(.22,1,.36,1);
const logo=staticFile('images/logo-vector.svg');
const fMed=staticFile('fonts/Vazirmatn-Medium.ttf');
const fBold=staticFile('fonts/Vazirmatn-Bold.ttf');
const fBlack=staticFile('fonts/Vazirmatn-Black.ttf');

const fade=(f:number,d:number)=>interpolate(f,[0,9,d-10,d],[0,1,1,0],C);
const rise=(f:number)=>interpolate(f,[0,22],[28,0],{...C,easing:E});

const Fonts=()=> <style>{'@font-face{font-family:V;src:url('+fMed+');font-weight:500}@font-face{font-family:V;src:url('+fBold+');font-weight:700}@font-face{font-family:V;src:url('+fBlack+');font-weight:900}*{box-sizing:border-box}'}</style>;

const Backdrop:React.FC<{dark?:boolean;grid?:boolean}>=({dark=false,grid=false})=>{
 const f=useCurrentFrame(),y=Math.sin(f/28)*4;
 return <AbsoluteFill style={{overflow:'hidden',background:dark?B.deep:'#f8f7f4'}}>
  <AbsoluteFill style={{background:dark?'radial-gradient(circle at 50% 35%,#263f78 0,#0a1327 42%,#060b15 100%)':'radial-gradient(circle at 50% 28%,#fff 0,#f3f2ef 48%,#d9dce5 78%,#8d98b2 125%)'}}/>
  <div style={{position:'absolute',left:'-10%',right:'-10%',bottom:'-24%',height:'58%',borderRadius:'50%',filter:'blur(74px)',transform:'translateY('+y+'px)',background:dark?'radial-gradient(ellipse,rgba(65,98,166,.55),transparent 70%)':'radial-gradient(ellipse,rgba(22,40,80,.43),rgba(22,40,80,.1) 48%,transparent 76%)'}}/>
  {grid&&<AbsoluteFill style={{opacity:.14,backgroundImage:'linear-gradient(rgba(22,40,80,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(22,40,80,.13) 1px,transparent 1px)',backgroundSize:'145px 145px'}}/>}
 </AbsoluteFill>
};

const Mark:React.FC<{s?:number;frost?:boolean}>=({s=150,frost=false})=><div style={{width:s,height:s,borderRadius:s*.2,padding:frost?s*.055:0,background:frost?'rgba(255,255,255,.35)':'transparent',border:frost?'1px solid rgba(255,255,255,.65)':'none',boxShadow:frost?'0 28px 80px rgba(22,40,80,.23)':'none'}}><Img src={logo} style={{width:'100%',height:'100%',borderRadius:'18%'}}/></div>;

const Intro:React.FC<{d:number}>=({d})=>{
 const f=useCurrentFrame(),{fps}=useVideoConfig(),p=spring({frame:f,fps,config:{damping:16,stiffness:95}}),sc=interpolate(p,[0,1],[.72,1]),bl=interpolate(f,[0,28,80],[17,0,1.5],C);
 return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop grid/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{transform:'scale('+sc+')',filter:'blur('+bl+'px)'}}><Mark s={184} frost/></div></AbsoluteFill></AbsoluteFill>
};

const Manifesto:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><div style={{position:'absolute',inset:60,border:'1px solid rgba(22,40,80,.09)'}}/><div style={{position:'absolute',left:94,right:94,top:108,height:1,background:'rgba(22,40,80,.12)'}}/><div style={{position:'absolute',left:94,right:94,bottom:108,height:1,background:'rgba(22,40,80,.12)'}}/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:'V',fontWeight:700,fontSize:64,color:B.ink,transform:'translateY('+rise(f)+'px)'}}>هر فرصتی، یک آغاز است.</div></AbsoluteFill></AbsoluteFill>};

const Slogans:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame(),cuts=[0,47,94],words=['یک پلتفرم','یک مسیر','یک‌جا.'],i=f<47?0:f<94?1:2,l=f-cuts[i],o=interpolate(l,[0,8,34,44],[0,1,1,0],C);return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:'V',fontSize:64,fontWeight:500,color:B.ink,opacity:o}}>{words[i]}</div></AbsoluteFill></AbsoluteFill>};

const Bubble:React.FC<{t:string;a:number;r:number}>=({t,a,r})=>{const f=useCurrentFrame(),x=Math.cos(a+f*.0025)*r,y=Math.sin(a+f*.0025)*r*.56;return <div dir="rtl" style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%) translate('+x+'px,'+y+'px)',padding:'13px 22px',borderRadius:28,background:'rgba(255,255,255,.82)',border:'1px solid rgba(22,40,80,.12)',boxShadow:'0 12px 35px rgba(22,40,80,.12)',fontFamily:'V',fontSize:23,fontWeight:700,color:B.navy}}>{t}</div>};

const Orbit:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame(),sc=interpolate(f,[0,30],[.78,1],{...C,easing:E});return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><AbsoluteFill style={{alignItems:'center',justifyContent:'center',transform:'scale('+sc+')'}}><div style={{position:'absolute',width:760,height:430,borderRadius:'50%',border:'1px solid rgba(22,40,80,.12)'}}/><div style={{position:'absolute',width:590,height:335,borderRadius:'50%',border:'1px solid rgba(22,40,80,.1)'}}/><div style={{width:420,height:420,borderRadius:'50%',background:'rgba(255,255,255,.86)',boxShadow:'0 30px 90px rgba(22,40,80,.16)',display:'flex',alignItems:'center',justifyContent:'center'}}><Mark s={145}/></div><Bubble t="بورسیه" a={-.7} r={455}/><Bubble t="شغل" a={.08} r={470}/><Bubble t="کارآموزی" a={1.55} r={445}/><Bubble t="فلوشیپ" a={2.7} r={465}/><Bubble t="آموزش" a={3.5} r={455}/></AbsoluteFill></AbsoluteFill>};

const Question:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame(),big=f>=42;return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><AbsoluteFill style={{alignItems:'center',justifyContent:'center',overflow:'hidden'}}><div dir="rtl" style={{fontFamily:'V',fontWeight:big?500:500,fontSize:big?142:58,color:B.ink,whiteSpace:'nowrap',transform:big?'scale('+interpolate(f,[42,70],[.84,1],{...C,easing:E})+')':'none'}}>{big?'فقط یک‌جا باشند.':'اگر همه‌شان'}</div></AbsoluteFill></AbsoluteFill>};

const ThisIs:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame(),{fps}=useVideoConfig(),p=spring({frame:f,fps,config:{damping:18,stiffness:110}});return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop grid/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:25,transform:'translateY('+interpolate(p,[0,1],[30,0])+'px)'}}><Mark s={150} frost/><div dir="rtl" style={{fontFamily:'V',fontWeight:900,fontSize:54,color:B.ink,padding:'16px 34px',borderRadius:24,background:'rgba(255,255,255,.56)',border:'1px solid rgba(255,255,255,.85)'}}>این ARIA HUB است.</div></div></AbsoluteFill></AbsoluteFill>};

const Browser:React.FC<{list?:boolean}>=({list=false})=><div style={{width:1450,height:780,borderRadius:34,overflow:'hidden',background:B.deep,border:'1px solid rgba(255,255,255,.13)',boxShadow:'0 60px 120px rgba(8,16,32,.28)'}}><div style={{height:56,background:'#0c1427',display:'flex',alignItems:'center',gap:10,padding:'0 22px'}}><i style={{width:12,height:12,borderRadius:'50%',background:'#7a8293'}}/><i style={{width:12,height:12,borderRadius:'50%',background:'#7a8293'}}/><i style={{width:12,height:12,borderRadius:'50%',background:B.gold}}/><div style={{marginLeft:25,width:620,height:28,borderRadius:14,background:'rgba(255,255,255,.08)'}}/></div>{list?<List/>:<Home/>}</div>;

const Home=()=> <div dir="rtl" style={{height:724,padding:'42px 56px',fontFamily:'V',color:'white',background:'radial-gradient(circle at 20% 5%,#134485 0,#0b162b 42%,#07101f 100%)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{display:'flex',gap:14,alignItems:'center'}}><Mark s={58}/><b style={{fontSize:24}}>ARIA HUB</b></div><div style={{display:'flex',gap:24,color:'rgba(255,255,255,.65)',fontSize:17}}><span>خانه</span><span>فرصت‌ها</span><span>خدمات</span><span>درباره ما</span></div></div><div style={{textAlign:'center',marginTop:72}}><div style={{color:B.gold,fontSize:19}}>هر روز فرصت‌های جدید</div><div style={{fontSize:58,fontWeight:900,lineHeight:1.15,marginTop:14}}>مشاغل، بورسیه‌ها و<br/><span style={{color:'#41a5ff'}}>فرصت‌ها در افغانستان</span></div><div style={{fontSize:19,color:'rgba(255,255,255,.6)',marginTop:20}}>فرصت‌های معتبر افغانستان و جهان، خلاصه‌شده و به‌روزرسانی روزانه</div><div style={{width:870,height:67,borderRadius:18,margin:'35px auto 0',background:'#091326',border:'1px solid rgba(255,255,255,.12)',display:'flex',alignItems:'center',padding:10}}><span style={{flex:1,textAlign:'right',paddingRight:20,color:'rgba(255,255,255,.4)'}}>جستجوی عنوان، سازمان یا کلیدواژه…</span><b style={{width:145,height:47,borderRadius:12,background:'#278ff0',display:'flex',alignItems:'center',justifyContent:'center'}}>جستجو</b></div></div></div>;

const rows=[['بورسیه اراسموس پلاس ۲۰۲۷','European Commission','بورسیه'],['بورسیه چیونینگ ۲۰۲۶–۲۷','UK FCDO','بورسیه'],['Logistics Officer — Kabul','Action Against Hunger','شغل'],['World Bank Group Fellowship','World Bank Group','فلوشیپ']];
const List=()=> <div dir="rtl" style={{height:724,padding:'38px 52px',fontFamily:'V',color:'white',background:'#091426'}}><div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:32}}>فرصت‌های امروز</b><span style={{color:B.gold}}>ARIA HUB</span></div><div style={{height:55,borderRadius:14,background:'#10213d',marginTop:25,border:'1px solid rgba(255,255,255,.09)',padding:'15px 20px',color:'rgba(255,255,255,.4)'}}>جستجو و فیلتر فرصت‌ها…</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginTop:22}}>{rows.map((r,i)=><div key={r[0]} style={{padding:22,borderRadius:18,background:'#0e1d35',border:'1px solid rgba(255,255,255,.09)'}}><div style={{display:'flex',justifyContent:'space-between',gap:15}}><b style={{fontSize:21}}>{r[0]}</b><span style={{fontSize:13,color:i===2?B.gold:'#6ed7aa'}}>{r[2]}</span></div><div style={{fontSize:15,color:'rgba(255,255,255,.5)',marginTop:11}}>{r[1]}</div></div>)}</div></div>;

const UI:React.FC<{d:number;list?:boolean}>=({d,list=false})=>{const f=useCurrentFrame(),sc=interpolate(f,[0,d],[1.08,1],C);return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><AbsoluteFill style={{alignItems:'center',justifyContent:'center',transform:'translateY('+interpolate(f,[0,26],[100,0],{...C,easing:E})+'px) scale('+sc+')'}}><Browser list={list}/></AbsoluteFill></AbsoluteFill>};

const Bridge:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame(),a=interpolate(f,[0,20],[0,1],C),b=interpolate(f,[23,45],[0,1],C);return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:'V',fontSize:64,color:B.ink,display:'flex',alignItems:'center',gap:25}}><span style={{opacity:a}}>فرصت‌های جهان.</span><i style={{width:80,height:2,background:B.gold,opacity:b}}/><b style={{opacity:b}}>یک صفحه.</b></div></AbsoluteFill></AbsoluteFill>};

const Lang:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><div style={{position:'absolute',top:74,left:86,fontFamily:'V',fontWeight:700,fontSize:42}}>سه زبان. یک تجربه.</div><AbsoluteFill style={{alignItems:'center',justifyContent:'center',transform:'translateY(70px) scale(.87) rotate('+interpolate(f,[0,d],[-4,2],C)+'deg)'}}><Browser list/></AbsoluteFill><div style={{position:'absolute',right:115,top:270,display:'flex',flexDirection:'column',gap:15,fontFamily:'V',fontSize:26,fontWeight:700}}>{['فارسی','پښتو','English'].map((x,i)=><span key={x} style={{padding:'11px 24px',borderRadius:20,background:i===0?B.navy:'rgba(255,255,255,.8)',color:i===0?'white':B.ink}}>{x}</span>)}</div></AbsoluteFill>};

const Statement:React.FC<{d:number;second?:boolean}>=({d,second=false})=>{const f=useCurrentFrame();return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:'V',fontSize:second?78:62,fontWeight:second?900:500,color:B.ink,transform:second?'scale('+interpolate(f,[0,26],[1.12,1],C)+')':'none'}}>{second?'تا فرصت‌های جهانی.':'از منابع معتبر'}</div></AbsoluteFill></AbsoluteFill>};

const Stat:React.FC<{v:string;t:string;x:number;y:number}>=({v,t,x,y})=><div dir="rtl" style={{position:'absolute',left:'calc(50% + '+x+'px)',top:'calc(50% + '+y+'px)',transform:'translate(-50%,-50%)',width:270,padding:'22px 24px',borderRadius:20,background:'#0d1628',border:'1px solid rgba(255,255,255,.12)',fontFamily:'V',color:'white',boxShadow:'0 18px 46px rgba(0,0,0,.28)'}}><b style={{fontSize:34,color:B.gold}}>{v}</b><div style={{fontSize:16,color:'rgba(255,255,255,.58)'}}>{t}</div></div>;

const Stats:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame();return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop dark/><AbsoluteFill style={{alignItems:'center',justifyContent:'center',transform:'scale('+interpolate(f,[0,d],[1.13,1],C)+')'}}><div style={{width:310,height:310,borderRadius:'50%',background:'radial-gradient(circle,#162850,#080d18)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 80px rgba(52,90,171,.34)'}}><Mark s={140}/></div><Stat v="۵۹۴" t="فرصت فعال" x={-430} y={-205}/><Stat v="۱۰۴" t="سازمان" x={430} y={-175}/><Stat v="۲۷" t="کشور تحت پوشش" x={-420} y={220}/><Stat v="روزانه" t="به‌روزرسانی" x={425} y={225}/></AbsoluteFill></AbsoluteFill>};

const CTA:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame(),o=interpolate(f,[0,26],[0,1],C);return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div dir="rtl" style={{fontFamily:'V',fontSize:68,fontWeight:900,lineHeight:1.35,textAlign:'center',color:B.ink,opacity:o,transform:'translateY('+(1-o)*24+'px)'}}>فرصت مناسب بعدی‌ات را<br/><span style={{color:B.navy}}>ساده‌تر پیدا کن.</span></div></AbsoluteFill></AbsoluteFill>};

const Lock:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame(),o=interpolate(f,[0,24],[0,1],C);return <AbsoluteFill style={{opacity:fade(f,d)}}><Backdrop/><AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',opacity:o}}><Mark s={128}/><b style={{fontFamily:'V',fontSize:82,marginTop:20}}>ARIA HUB</b><div dir="rtl" style={{fontFamily:'V',fontWeight:900,fontSize:38,color:B.navy}}>یک پلتفرم. فرصت‌های بی‌مرز.</div><div dir="rtl" style={{fontFamily:'V',fontSize:20,opacity:.5,marginTop:18}}>مشاغل · بورسیه‌ها · کارآموزی‌ها · فلوشیپ‌ها</div></div></AbsoluteFill></AbsoluteFill>};

const End:React.FC<{d:number}>=({d})=>{const f=useCurrentFrame(),{fps}=useVideoConfig(),p=spring({frame:f,fps,config:{damping:16,stiffness:95}});return <AbsoluteFill style={{background:'#050505',opacity:fade(f,d),alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',transform:'scale('+interpolate(p,[0,1],[.82,1])+')'}}><Mark s={155}/><b style={{fontFamily:'V',fontSize:56,color:'white',marginTop:24}}>ARIA HUB</b><div dir="rtl" style={{fontFamily:'V',fontSize:25,color:B.gold}}>فرصت‌ها را کشف کن</div><div style={{fontFamily:'V',fontSize:23,color:'rgba(255,255,255,.65)',marginTop:20}}>myariahub.com</div></div></AbsoluteFill>};

const D=[90,55,138,68,107,43,87,69,63,36,36,72,72,108,171,141];
const S=D.reduce((a,v,i)=>{a.push(i? a[i-1]+D[i-1]:0);return a},[] as number[]);

export const AriaHubReference:React.FC=()=> <AbsoluteFill style={{background:'#f8f7f4'}}><Fonts/><Audio src={staticFile('advideo/audio-38s.wav')} volume={.72}/>
<Sequence from={S[0]} durationInFrames={D[0]}><Intro d={D[0]}/></Sequence>
<Sequence from={S[1]} durationInFrames={D[1]}><Manifesto d={D[1]}/></Sequence>
<Sequence from={S[2]} durationInFrames={D[2]}><Slogans d={D[2]}/></Sequence>
<Sequence from={S[3]} durationInFrames={D[3]}><Orbit d={D[3]}/></Sequence>
<Sequence from={S[4]} durationInFrames={D[4]}><Question d={D[4]}/></Sequence>
<Sequence from={S[5]} durationInFrames={D[5]}><ThisIs d={D[5]}/></Sequence>
<Sequence from={S[6]} durationInFrames={D[6]}><UI d={D[6]}/></Sequence>
<Sequence from={S[7]} durationInFrames={D[7]}><UI d={D[7]} list/></Sequence>
<Sequence from={S[8]} durationInFrames={D[8]}><Bridge d={D[8]}/></Sequence>
<Sequence from={S[9]} durationInFrames={D[9]}><Lang d={D[9]}/></Sequence>
<Sequence from={S[10]} durationInFrames={D[10]}><Statement d={D[10]}/></Sequence>
<Sequence from={S[11]} durationInFrames={D[11]}><Statement d={D[11]} second/></Sequence>
<Sequence from={S[12]} durationInFrames={D[12]}><Stats d={D[12]}/></Sequence>
<Sequence from={S[13]} durationInFrames={D[13]}><CTA d={D[13]}/></Sequence>
<Sequence from={S[14]} durationInFrames={D[14]}><Lock d={D[14]}/></Sequence>
<Sequence from={S[15]} durationInFrames={D[15]}><End d={D[15]}/></Sequence>
</AbsoluteFill>;
