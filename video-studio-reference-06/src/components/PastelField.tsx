import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

export const PastelField: React.FC<{strength?:number}> = ({strength=1}) => {
  const f=useCurrentFrame();
  const x=interpolate(f%180,[0,90,180],[-70,65,-70]);
  const y=interpolate(f%220,[0,110,220],[35,-35,35]);
  return <>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#f9f8ff 0%,#fff8f5 42%,#f7f4ff 100%)'}}/>
    <div style={{position:'absolute',left:`calc(45% + ${x}px)`,top:`calc(48% + ${y}px)`,width:1050,height:720,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(255,132,166,.55) 0%,rgba(255,162,121,.27) 34%,transparent 72%)',filter:'blur(65px)',opacity:.78*strength}}/>
    <div style={{position:'absolute',left:`calc(60% - ${x*.35}px)`,top:'47%',width:980,height:700,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(130,83,255,.42) 0%,rgba(85,137,255,.24) 38%,transparent 74%)',filter:'blur(70px)',opacity:.72*strength}}/>
    <div style={{position:'absolute',left:'50%',top:'78%',width:900,height:400,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(255,255,255,.95) 0%,rgba(255,255,255,.35) 45%,transparent 75%)',filter:'blur(30px)',opacity:.86}}/>
  </>;
};
