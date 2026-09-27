import React from 'react';
import {interpolate,useCurrentFrame} from 'remotion';

export const Projector:React.FC<{beam?:boolean;angle?:number;wide?:boolean}> = ({beam=false,angle=0,wide=false}) => {
  const f=useCurrentFrame();
  const pulse=1+Math.sin(f/9)*.025;
  return <div style={{position:'relative',width:220,height:160,transform:`rotate(${angle}deg) scale(${pulse})`}}>
    {beam && <div style={{position:'absolute',left:132,top:42,width:wide?1180:900,height:78,transformOrigin:'0 50%',clipPath:'polygon(0 42%,100% 0,100% 100%,0 58%)',background:'linear-gradient(90deg,rgba(22,40,80,.92),rgba(71,57,159,.72) 46%,rgba(244,211,152,.40) 82%,transparent)',filter:'blur(.3px)',opacity:interpolate(f,[0,14],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}/>}
    <div style={{position:'absolute',left:40,top:50,width:135,height:72,borderRadius:22,background:'linear-gradient(180deg,#191B20,#050608)',boxShadow:'0 18px 40px rgba(0,0,0,.28)'}}/>
    <div style={{position:'absolute',left:19,top:67,width:42,height:39,borderRadius:'12px 8px 8px 12px',background:'#090A0D'}}/>
    <div style={{position:'absolute',left:160,top:66,width:38,height:40,borderRadius:'8px 15px 15px 8px',background:'#050608',boxShadow:'0 0 20px rgba(255,255,255,.12)'}}/>
  </div>;
};
