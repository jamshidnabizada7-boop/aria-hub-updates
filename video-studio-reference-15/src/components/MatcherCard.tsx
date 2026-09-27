import React from 'react';
const UI="'Vazirmatn Variable',sans-serif";
const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";
export const MatcherCard:React.FC=()=> <div dir="rtl" style={{width:1100,borderRadius:34,background:'#11141B',border:'1px solid #303746',padding:44,color:'#fff',fontFamily:UI,boxShadow:'0 35px 90px rgba(0,0,0,.20)'}}>
  <div style={{fontFamily:DISPLAY,fontSize:34,fontWeight:800}}>با تطبیق‌گر فرصت، مسیرت را مشخص کن</div>
  <div style={{fontSize:20,color:'#AEB5C1',marginTop:8}}>اطلاعات ساده وارد کن؛ آریا هاب فرصت‌های مناسب را پیدا می‌کند.</div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:18,marginTop:40}}>{[['سن','۲۴'],['کشور مقصد','آلمان'],['سطح تحصیلات','لیسانس'],['هدف شما','بورسیه تحصیلی']].map(([k,v])=><div key={k}><div style={{fontSize:17,color:'#858D9E',marginBottom:8}}>{k}</div><div style={{background:'#0B0E14',border:'1px solid #333A47',borderRadius:15,padding:'16px 18px',fontWeight:800}}>{v}</div></div>)}</div>
  <div style={{display:'flex',gap:14,marginTop:34}}><div style={{background:'#F9D498',color:'#162850',padding:'14px 30px',borderRadius:15,fontWeight:900}}>یافتن فرصت‌ها</div>{['بورسیه','کارآموزی','ویزای کار'].map((x,i)=><div key={x} style={{background:['#F9D498','#6EDDD4','#AAB8FF'][i],color:'#10131B',padding:'14px 25px',borderRadius:999,fontWeight:800}}>{x}</div>)}</div>
</div>;
