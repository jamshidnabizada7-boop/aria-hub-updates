import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;

export const PromptPanel: React.FC<{text:string; typed?:boolean; submitted?:boolean}> = ({text,typed=true,submitted=false}) => {
  const f=useCurrentFrame();
  const count=typed?Math.floor(interpolate(f,[2,42],[0,text.length],C)):text.length;
  const visible=text.slice(0,count);
  const click=interpolate(f,[44,49,56],[0,1,0],C);
  return <div style={{width:1280,height:270,borderRadius:42,background:'rgba(27,28,30,.96)',border:'1px solid rgba(255,255,255,.08)',boxShadow:'0 35px 100px rgba(0,0,0,.45)',position:'relative',overflow:'hidden'}}>
    <div style={{position:'absolute',left:38,top:44,fontSize:42,color:'rgba(255,255,255,.38)'}}>＋</div>
    <div dir="rtl" style={{position:'absolute',left:95,right:95,top:55,fontFamily:"'Vazirmatn Variable',sans-serif",fontSize:47,fontWeight:550,color:'#f1eee9',textAlign:'right'}}>{visible}<span style={{opacity:(f%16)<8?1:0,color:'#e79b77'}}>│</span></div>
    <div style={{position:'absolute',left:44,bottom:30,fontSize:25,color:'rgba(255,255,255,.34)'}}>ARIA Match</div>
    <div style={{position:'absolute',right:34,bottom:24,width:66,height:66,borderRadius:18,background:submitted?'#f3a080':'#df8b6f',display:'flex',alignItems:'center',justifyContent:'center',fontSize:42,color:'#25130f',transform:`scale(${1-click*.14})`,boxShadow:'0 0 30px rgba(238,137,100,.20)'}}>↑</div>
  </div>;
};
