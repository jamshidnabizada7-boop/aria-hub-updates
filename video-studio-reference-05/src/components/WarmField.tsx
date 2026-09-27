import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

export const WarmField: React.FC<{strength?:number}> = ({strength=1}) => {
  const f=useCurrentFrame();
  const x=interpolate(f%120,[0,60,120],[-28,28,-28]);
  return <>
    <div style={{position:'absolute',left:`calc(50% + ${x}px)`,top:'52%',width:980,height:460,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(189,83,43,.22) 0%,rgba(130,55,27,.12) 38%,transparent 72%)',filter:'blur(65px)',opacity:strength}}/>
    <div style={{position:'absolute',left:'50%',top:'55%',width:520,height:230,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(244,145,99,.16),transparent 72%)',filter:'blur(48px)',opacity:strength}}/>
  </>;
};
