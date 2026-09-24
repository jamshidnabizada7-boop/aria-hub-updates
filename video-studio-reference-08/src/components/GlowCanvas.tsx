import React from 'react';
import {interpolate,useCurrentFrame} from 'remotion';

export const GlowCanvas:React.FC<{children:React.ReactNode;dark?:boolean}> = ({children,dark=false}) => {
  const f=useCurrentFrame();
  const x=interpolate(f%220,[0,110,220],[-50,55,-50]);
  return <div style={{position:'absolute',inset:0,overflow:'hidden',background:dark?'#111019':'linear-gradient(180deg,#fff 0%,#fbf9ff 100%)'}}>
    <div style={{position:'absolute',left:`calc(50% + ${x}px)`,bottom:-180,width:1600,height:580,transform:'translateX(-50%)',borderRadius:'50%',background:dark?'radial-gradient(ellipse,rgba(111,69,255,.40),rgba(44,38,120,.12) 48%,transparent 72%)':'radial-gradient(ellipse,rgba(113,79,255,.35),rgba(214,168,255,.22) 42%,transparent 74%)',filter:'blur(58px)'}}/>
    <div style={{position:'absolute',right:-100,top:-90,width:700,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,194,154,.24),transparent 70%)',filter:'blur(52px)'}}/>
    {children}
  </div>;
};
