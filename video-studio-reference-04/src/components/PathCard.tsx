import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

const C={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;

export const PathCard: React.FC<{
  title:string;
  detail:string;
  accent?:'cyan'|'violet'|'blue';
  invert?:boolean;
  delay?:number;
}> = ({title,detail,accent='cyan',invert=false,delay=0}) => {
  const f=Math.max(0,useCurrentFrame()-delay);
  const p=interpolate(f,[0,24],[0,1],C);
  const colors={cyan:['#41E8E0','#2368FF'],violet:['#9A45FF','#224AFF'],blue:['#295DFF','#30D1FF']}[accent];
  return (
    <div style={{position:'relative', width:840, minHeight:340, opacity:p, transform:`translateY(${(1-p)*55}px)`}}>
      <svg width="840" height="270" viewBox="0 0 840 270" style={{overflow:'visible'}}>
        <path d="M70 15 C70 115, 220 48, 255 142 C295 250, 460 246, 500 142 C545 24, 725 42, 770 220" fill="none" stroke={invert?'rgba(20,20,25,.48)':'rgba(255,255,255,.38)'} strokeWidth="2.5" strokeDasharray="900" strokeDashoffset={900*(1-p)}/>
        <circle cx="70" cy="15" r="8" fill={invert?'#222':'#fff'}/>
        <circle cx="770" cy="220" r="8" fill={invert?'#222':'#fff'}/>
      </svg>
      <div style={{position:'absolute', left:146, top:98, borderRadius:999, padding:'22px 40px', minWidth:540, color:'#fff', background:invert?'#07090e':'#0a0d15', boxShadow:`0 0 34px ${colors[0]}55`, border:'1px solid rgba(255,255,255,.08)'}}>
        <span style={{position:'absolute', left:0, top:0, right:0, bottom:0, borderRadius:999, background:`radial-gradient(circle at 55% 0%,${colors[1]}55,transparent 45%)`, pointerEvents:'none'}}/>
        <div dir="rtl" style={{position:'relative', fontSize:48, fontWeight:700}}>{title}</div>
      </div>
      <div dir="rtl" style={{position:'absolute', left:120, right:120, bottom:-6, fontSize:31, fontWeight:500, color:invert?'#262833':'rgba(255,255,255,.66)', textAlign:'center'}}>{detail}</div>
    </div>
  );
};
