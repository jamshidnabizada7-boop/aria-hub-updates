import React from 'react';
import {interpolate,useCurrentFrame} from 'remotion';

export const ScanFrame:React.FC<{children:React.ReactNode}> = ({children}) => {
  const f=useCurrentFrame();
  const pos=interpolate(f%50,[0,50],[8,92]);
  return <div style={{position:'relative',width:580,height:430,borderRadius:36,background:'#f8f8f6',overflow:'hidden',border:'1px solid rgba(40,45,60,.07)',boxShadow:'0 26px 85px rgba(45,48,66,.10)'}}>
    <div style={{position:'absolute',left:25,top:25,width:62,height:62,borderLeft:'7px solid #91C77E',borderTop:'7px solid #91C77E',borderRadius:'14px 0 0 0'}}/>
    <div style={{position:'absolute',right:25,top:25,width:62,height:62,borderRight:'7px solid #91C77E',borderTop:'7px solid #91C77E',borderRadius:'0 14px 0 0'}}/>
    <div style={{position:'absolute',left:25,bottom:25,width:62,height:62,borderLeft:'7px solid #91C77E',borderBottom:'7px solid #91C77E',borderRadius:'0 0 0 14px'}}/>
    <div style={{position:'absolute',right:25,bottom:25,width:62,height:62,borderRight:'7px solid #91C77E',borderBottom:'7px solid #91C77E',borderRadius:'0 0 14px 0'}}/>
    <div style={{position:'absolute',left:20,right:20,top:`${pos}%`,height:5,borderRadius:999,background:'linear-gradient(90deg,transparent,#A2D78D,transparent)',boxShadow:'0 0 22px rgba(135,200,111,.45)'}}/>
    {children}
  </div>;
};
