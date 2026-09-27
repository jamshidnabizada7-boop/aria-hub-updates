import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

export const GradientField: React.FC<{
  intensity?: number;
  light?: boolean;
  compact?: boolean;
}> = ({intensity = 1, light = false, compact = false}) => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame % 180, [0, 90, 180], [-30, 35, -30]);
  const shift2 = interpolate(frame % 240, [0, 120, 240], [50, -30, 50]);
  const h = compact ? 300 : 620;
  return (
    <div style={{position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none'}}>
      <div style={{
        position:'absolute', left:`calc(50% + ${shift}px)`, top:'50%', width:690, height:h,
        transform:'translate(-50%,-50%)', borderRadius:'50%', filter:`blur(${compact ? 42 : 75}px)`,
        background:light
          ? 'radial-gradient(circle,rgba(56,220,255,.78) 0%,rgba(48,69,255,.68) 32%,rgba(129,46,255,.56) 53%,transparent 76%)'
          : 'radial-gradient(circle,rgba(43,224,222,.68) 0%,rgba(24,55,255,.82) 36%,rgba(124,33,255,.54) 57%,transparent 76%)',
        opacity:.78*intensity,
      }}/>
      <div style={{
        position:'absolute', left:`calc(50% + ${shift2}px)`, top:'54%', width:460, height:460,
        transform:'translate(-50%,-50%)', borderRadius:'50%', filter:'blur(70px)',
        background:'radial-gradient(circle,rgba(255,50,230,.62),rgba(58,45,255,.34) 52%,transparent 76%)',
        opacity:.58*intensity,
      }}/>
    </div>
  );
};
