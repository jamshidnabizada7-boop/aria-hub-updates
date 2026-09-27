import React from 'react';

export const PortfolioCard:React.FC<{title:string;meta:string;tag:string;accent?:string;style?:React.CSSProperties}> = ({title,meta,tag,accent='#F4D398',style}) => <div dir="rtl" style={{width:330,height:420,borderRadius:30,background:'linear-gradient(165deg,#fff 0%,#f7f8fb 60%,#eef3ff 100%)',border:'1px solid rgba(255,255,255,.75)',boxShadow:'0 28px 80px rgba(2,13,55,.28)',padding:24,color:'#17213C',overflow:'hidden',position:'relative',...style}}>
  <div style={{position:'absolute',right:-75,top:-75,width:230,height:230,borderRadius:'50%',background:`radial-gradient(circle,${accent}99,transparent 70%)`}}/>
  <span style={{position:'relative',display:'inline-flex',padding:'7px 12px',borderRadius:999,background:`${accent}33`,color:'#17213C',fontSize:13,fontWeight:850}}>{tag}</span>
  <div style={{position:'relative',fontFamily:"'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif",fontSize:25,fontWeight:780,lineHeight:1.5,marginTop:22}}>{title}</div>
  <div style={{position:'relative',fontFamily:"'Vazirmatn Variable',sans-serif",fontSize:15,color:'rgba(23,33,60,.52)',lineHeight:1.6,marginTop:13}}>{meta}</div>
  <div style={{position:'absolute',left:24,right:24,bottom:26,height:92,borderRadius:20,background:'linear-gradient(135deg,#172850,#1E4D9D)',padding:18,color:'#fff'}}><div style={{fontSize:13,opacity:.58}}>ARIA HUB Match</div><b style={{fontSize:26}}>۹۲٪</b></div>
</div>;
