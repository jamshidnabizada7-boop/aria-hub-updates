import React from 'react';
import {interpolate,useCurrentFrame} from 'remotion';

export const DarkAura: React.FC<{children:React.ReactNode;opacity?:number}> = ({children,opacity=1}) => {
  const f=useCurrentFrame();
  const x=interpolate(f%160,[0,80,160],[-35,40,-35]);
  return <div style={{position:'absolute',inset:0,overflow:'hidden',background:'#050609',opacity}}>
    <div style={{position:'absolute',left:`calc(50% + ${x}px)`,top:'50%',width:1050,height:700,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(circle,rgba(48,193,255,.18),rgba(38,87,255,.10) 35%,rgba(101,53,255,.08) 52%,transparent 72%)',filter:'blur(54px)'}}/>
    <div style={{position:'absolute',right:-160,bottom:-120,width:720,height:520,borderRadius:'50%',background:'radial-gradient(circle,rgba(28,229,210,.14),transparent 70%)',filter:'blur(60px)'}}/>
    {children}
  </div>;
};
