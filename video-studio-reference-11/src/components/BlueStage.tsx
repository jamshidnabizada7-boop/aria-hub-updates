import React from 'react';
import {interpolate,useCurrentFrame} from 'remotion';

export const BlueStage:React.FC<{children:React.ReactNode;opacity?:number;dark?:boolean}> = ({children,opacity=1,dark=false}) => {
  const f=useCurrentFrame();
  const x=interpolate(f%180,[0,90,180],[-70,70,-70]);
  const y=interpolate(f%240,[0,120,240],[45,-35,45]);
  return <div style={{position:'absolute',inset:0,overflow:'hidden',background:dark?'#06070B':'#082A73',opacity}}>
    {!dark && <>
      <div style={{position:'absolute',left:`calc(50% + ${x}px)`,top:`calc(48% + ${y}px)`,width:1650,height:720,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(30,117,255,.95) 0%,rgba(10,63,170,.78) 42%,rgba(4,28,96,.55) 63%,transparent 78%)',filter:'blur(44px)'}}/>
      <div style={{position:'absolute',left:'45%',bottom:-200,width:1280,height:560,transform:'translateX(-50%)',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(55,155,255,.76),rgba(24,83,220,.28) 48%,transparent 74%)',filter:'blur(60px)'}}/>
      <div style={{position:'absolute',right:-180,top:-120,width:850,height:620,borderRadius:'50%',background:'radial-gradient(circle,rgba(94,142,255,.40),transparent 72%)',filter:'blur(65px)'}}/>
    </>}
    {children}
  </div>;
};
