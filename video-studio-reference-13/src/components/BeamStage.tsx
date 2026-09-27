import React from 'react';
import {interpolate,useCurrentFrame} from 'remotion';

export const BeamStage:React.FC<{children:React.ReactNode;dark?:boolean}> = ({children,dark=false}) => {
  const f=useCurrentFrame();
  const drift=interpolate(f%120,[0,60,120],[-50,60,-50]);
  return <div style={{position:'absolute',inset:0,overflow:'hidden',background:dark?'#080A12':'#FBFBFC'}}>
    {dark && <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 35% 45%,rgba(61,72,170,.34),transparent 44%),radial-gradient(circle at 68% 40%,rgba(99,54,162,.24),transparent 42%)'}}/>}
    {!dark && <div style={{position:'absolute',left:`calc(50% + ${drift}px)`,top:'45%',width:1450,height:660,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(65,92,220,.10),rgba(244,211,152,.08) 42%,transparent 75%)',filter:'blur(60px)'}}/>}
    {children}
  </div>;
};
