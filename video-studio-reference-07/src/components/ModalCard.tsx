import React from 'react';
export const ModalCard:React.FC<{children:React.ReactNode;width?:number;height?:number}> = ({children,width=650,height=500}) => <div style={{width,height,borderRadius:24,background:'#fff',border:'1px solid rgba(60,45,70,.10)',boxShadow:'0 35px 95px rgba(74,39,70,.17)',overflow:'hidden'}}>{children}</div>;
