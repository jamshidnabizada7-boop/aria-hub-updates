import React from 'react';

export const OpportunityResult:React.FC<{portrait?:boolean}> = ({portrait=false}) => <div dir="rtl" style={{width:portrait?420:940,height:portrait?650:520,borderRadius:42,background:'linear-gradient(150deg,#10151f 0%,#0b1018 62%,#102a33 100%)',border:'1px solid rgba(255,255,255,.10)',boxShadow:'0 45px 110px rgba(0,0,0,.40)',padding:portrait?30:42,color:'#fff',overflow:'hidden',position:'relative'}}>
  <div style={{position:'absolute',right:-70,top:-90,width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(69,231,215,.40),rgba(44,99,255,.18),transparent 70%)',filter:'blur(8px)'}}/>
  <span style={{display:'inline-flex',padding:'8px 13px',borderRadius:999,background:'rgba(78,225,164,.15)',color:'#6AF1AE',fontSize:portrait?14:16,fontWeight:800}}>تمویل کامل</span>
  <div style={{fontFamily:"'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif",fontSize:portrait?32:46,fontWeight:780,lineHeight:1.55,marginTop:18,position:'relative'}}>بورسیه بین‌المللی ۲۰۲۷</div>
  <div style={{fontSize:portrait?17:20,color:'rgba(255,255,255,.55)',marginTop:12}}>کارشناسی ارشد · اروپا · ددلاین ۱۲ روز</div>
  <div style={{marginTop:portrait?28:40,padding:portrait?18:24,borderRadius:22,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)'}}>
    <div style={{fontSize:14,color:'rgba(255,255,255,.45)'}}>تطبیق با پروفایل تو</div>
    <div style={{display:'flex',alignItems:'center',gap:14,marginTop:10}}><b style={{fontSize:portrait?34:44,color:'#78E6C7'}}>۹۲٪</b><div style={{height:8,flex:1,borderRadius:999,background:'rgba(255,255,255,.10)',overflow:'hidden'}}><div style={{width:'92%',height:'100%',background:'linear-gradient(90deg,#48D6B2,#4A82FF)',borderRadius:999}}/></div></div>
  </div>
  <div style={{display:'flex',gap:12,marginTop:portrait?28:36}}><div style={{flex:1,padding:'13px 18px',borderRadius:14,background:'rgba(255,255,255,.08)',textAlign:'center',fontWeight:750}}>ذخیره</div><div style={{flex:1.3,padding:'13px 18px',borderRadius:14,background:'#fff',color:'#0a0d12',textAlign:'center',fontWeight:800}}>مشاهده جزئیات</div></div>
</div>;
