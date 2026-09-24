import React from 'react';
export const ResultCard:React.FC<{compact?:boolean}> = ({compact=false}) => <div dir="rtl" style={{width:compact?430:820,height:compact?500:430,borderRadius:38,background:'linear-gradient(150deg,#101522,#101018 65%,#122630 100%)',border:'1px solid rgba(255,255,255,.12)',boxShadow:'0 36px 100px rgba(0,0,0,.38)',padding:compact?30:40,color:'#fff',fontFamily:"'Vazirmatn Variable',sans-serif",position:'relative',overflow:'hidden'}}>
  <div style={{position:'absolute',right:-70,top:-80,width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(94,242,207,.42),rgba(63,104,255,.18),transparent 70%)'}}/>
  <span style={{position:'relative',display:'inline-flex',padding:'8px 13px',borderRadius:999,background:'rgba(87,225,160,.14)',color:'#70F1B6',fontSize:compact?13:15,fontWeight:800}}>تمویل کامل</span>
  <div style={{position:'relative',fontFamily:"'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif",fontSize:compact?31:43,fontWeight:780,lineHeight:1.5,marginTop:18}}>بورسیه بین‌المللی ۲۰۲۷</div>
  <div style={{position:'relative',fontSize:compact?16:19,color:'rgba(255,255,255,.54)',marginTop:10}}>کارشناسی ارشد · اروپا · ددلاین ۱۲ روز</div>
  <div style={{position:'relative',marginTop:compact?28:34,padding:compact?18:22,borderRadius:22,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)'}}>
    <div style={{fontSize:13,color:'rgba(255,255,255,.42)'}}>تطبیق با پروفایل تو</div>
    <div style={{display:'flex',alignItems:'center',gap:14,marginTop:9}}><b style={{fontSize:compact?35:42,color:'#75E8C7'}}>۹۲٪</b><div style={{height:8,flex:1,borderRadius:999,background:'rgba(255,255,255,.10)',overflow:'hidden'}}><div style={{width:'92%',height:'100%',background:'linear-gradient(90deg,#4DE0B9,#5B80FF)',borderRadius:999}}/></div></div>
  </div>
</div>;
