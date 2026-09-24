import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

const clamp = {extrapolateLeft:'clamp', extrapolateRight:'clamp'} as const;

export const OrbitSystem: React.FC<{size?: number; label?: string}> = ({size=720, label='با یک مسیر روشن'}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 34], [0, 1], clamp);
  const rot = f * .18;
  const points = [0, 90, 180, 270];
  return (
    <div style={{position:'relative', width:size, height:size}}>
      <div style={{
        position:'absolute', inset:12, borderRadius:'50%', border:'2px solid rgba(255,255,255,.20)',
        boxShadow:'0 0 34px rgba(52,94,255,.12) inset',
      }}/>
      <div style={{
        position:'absolute', inset:0, borderRadius:'50%', padding:4,
        background:'conic-gradient(from 30deg,transparent 0 7%,#22e4c5 10%,#195bff 22%,transparent 35%,#263cff 49%,#23d8be 65%,transparent 78%,#7a39ff 90%,transparent 100%)',
        WebkitMask:'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite:'xor', maskComposite:'exclude', filter:'blur(7px)', opacity:.9*p,
        transform:`rotate(${rot}deg)`,
      }}/>
      {points.map((deg,i)=>{
        const a=(deg+rot*.22)*Math.PI/180;
        const r=size/2-10;
        const x=size/2+Math.cos(a)*r-11;
        const y=size/2+Math.sin(a)*r-11;
        return <span key={i} style={{position:'absolute', left:x, top:y, width:22, height:22, borderRadius:'50%', background:'#fff', boxShadow:'0 0 12px rgba(255,255,255,.55)'}}/>;
      })}
      <div dir="rtl" style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:58, fontWeight:500, color:'white', opacity:p}}>{label}</div>
    </div>
  );
};
