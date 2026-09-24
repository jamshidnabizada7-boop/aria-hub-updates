import React from 'react';

export const OpportunityTile:React.FC<{title:string;tag:string;meta:string;accent:string;style?:React.CSSProperties}> = ({title,tag,meta,accent,style}) => (
  <div dir="rtl" style={{width:250,height:315,borderRadius:26,background:'#fff',boxShadow:'0 24px 70px rgba(27,39,77,.12)',border:'1px solid rgba(22,40,80,.08)',padding:22,color:'#162850',position:'relative',overflow:'hidden',...style}}>
    <div style={{position:'absolute',right:-50,top:-55,width:170,height:170,borderRadius:'50%',background:`radial-gradient(circle,${accent}66,transparent 72%)`}}/>
    <span style={{position:'relative',display:'inline-flex',padding:'7px 11px',borderRadius:999,background:`${accent}22`,color:'#162850',fontSize:13,fontWeight:850}}>{tag}</span>
    <div style={{position:'relative',fontFamily:"'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif",fontSize:22,fontWeight:780,lineHeight:1.55,marginTop:18}}>{title}</div>
    <div style={{position:'relative',fontFamily:"'Vazirmatn Variable',sans-serif",fontSize:14,color:'rgba(22,40,80,.48)',lineHeight:1.65,marginTop:12}}>{meta}</div>
    <div style={{position:'absolute',left:22,right:22,bottom:22,height:56,borderRadius:16,background:'#162850',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800}}>مشاهده فرصت</div>
  </div>
);
