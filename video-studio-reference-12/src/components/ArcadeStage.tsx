import React from 'react';
import {interpolate,useCurrentFrame} from 'remotion';

export const ArcadeStage:React.FC<{children:React.ReactNode;light?:boolean}> = ({children,light=false}) => {
  const f=useCurrentFrame();
  const x=interpolate(f%160,[0,80,160],[-60,60,-60]);
  return <div style={{position:'absolute',inset:0,overflow:'hidden',background:light?'#F8F8FB':'#080A12'}}>
    <div style={{position:'absolute',left:`calc(50% + ${x}px)`,top:'48%',width:1350,height:760,transform:'translate(-50%,-50%)',borderRadius:'50%',background:light?'radial-gradient(circle,rgba(96,105,255,.20),rgba(255,205,120,.18) 38%,transparent 72%)':'radial-gradient(circle,rgba(54,97,255,.42),rgba(111,57,255,.24) 42%,rgba(10,233,210,.12) 62%,transparent 76%)',filter:'blur(60px)'}}/>
    <div style={{position:'absolute',right:-80,bottom:-120,width:650,height:520,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,192,92,.16),transparent 72%)',filter:'blur(50px)'}}/>
    {children}
  </div>;
};
