import React from 'react';
export const OpportunityCard:React.FC<{title:string;meta:string;tag:string;accent?:string;style?:React.CSSProperties}> = ({title,meta,tag,accent='#7056F5',style}) => <div dir="rtl" style={{width:360,minHeight:190,borderRadius:28,background:'rgba(255,255,255,.90)',border:'1px solid rgba(88,64,120,.10)',boxShadow:'0 24px 75px rgba(75,47,100,.12)',padding:24,...style}}>
  <span style={{display:'inline-flex',padding:'7px 12px',borderRadius:999,background:`${accent}15`,color:accent,fontSize:14,fontWeight:800}}>{tag}</span>
  <div style={{fontFamily:"'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif",fontSize:24,fontWeight:760,lineHeight:1.45,marginTop:13,color:'#212033'}}>{title}</div>
  <div style={{fontSize:15,color:'rgba(33,32,51,.50)',marginTop:11}}>{meta}</div>
</div>;
