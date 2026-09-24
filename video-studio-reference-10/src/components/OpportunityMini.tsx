import React from 'react';

export const OpportunityMini:React.FC<{title:string;meta:string;accent?:string;compact?:boolean}> = ({title,meta,accent='#162850',compact=false}) => <div dir="rtl" style={{width:compact?230:310,minHeight:compact?120:155,borderRadius:24,background:'#fff',border:'1px solid rgba(30,34,55,.08)',boxShadow:'0 18px 55px rgba(40,38,65,.10)',padding:compact?17:22}}>
  <div style={{width:42,height:7,borderRadius:999,background:accent,opacity:.9}}/>
  <div style={{fontFamily:"'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif",fontSize:compact?17:22,fontWeight:760,lineHeight:1.5,marginTop:12,color:'#1f2231'}}>{title}</div>
  <div style={{fontFamily:"'Vazirmatn Variable',sans-serif",fontSize:compact?12:14,color:'rgba(31,34,49,.46)',marginTop:8}}>{meta}</div>
</div>;
