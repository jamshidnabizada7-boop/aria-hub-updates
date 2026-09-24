import React from 'react';
import {interpolate,useCurrentFrame} from 'remotion';

export const AdBackdrop:React.FC<{children:React.ReactNode}> = ({children}) => {
  const f=useCurrentFrame();
  const x=interpolate(f%240,[0,120,240],[-60,55,-60]);
  return <div style={{position:'absolute',inset:0,overflow:'hidden',background:'linear-gradient(135deg,#b79aa9 0%,#9e91a8 47%,#aa8d9c 100%)'}}>
    <div style={{position:'absolute',left:`calc(50% + ${x}px)`,top:'53%',width:1750,height:970,transform:'translate(-50%,-50%)',borderRadius:90,background:'radial-gradient(circle at 30% 25%,rgba(255,255,255,.92),rgba(255,237,246,.92) 30%,rgba(255,204,224,.74) 57%,rgba(235,190,221,.42) 73%,transparent 90%)',filter:'blur(6px)'}}/>
    <div style={{position:'absolute',left:'50%',top:'51%',width:1580,height:870,transform:'translate(-50%,-50%)',borderRadius:48,background:'rgba(255,255,255,.14)',boxShadow:'0 50px 120px rgba(88,50,83,.16)'}}/>
    {children}
  </div>;
};
