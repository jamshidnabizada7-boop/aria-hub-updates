import React from 'react';

export const GlassCard: React.FC<{
  children:React.ReactNode;
  width?:number;
  height?:number;
  radius?:number;
  style?:React.CSSProperties;
}> = ({children,width=420,height=230,radius=28,style}) => <div style={{width,height,borderRadius:radius,background:'rgba(255,255,255,.70)',border:'1px solid rgba(255,255,255,.84)',boxShadow:'0 28px 90px rgba(75,49,110,.12), inset 0 1px 0 rgba(255,255,255,.8)',backdropFilter:'blur(24px)',overflow:'hidden',...style}}>{children}</div>;
