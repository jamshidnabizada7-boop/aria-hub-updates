import React from 'react';
import {Img, staticFile} from 'remotion';

const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";
const UI="'Vazirmatn Variable',system-ui,sans-serif";
const logo=staticFile('logo-vector.svg');

export const Shell:React.FC<{children:React.ReactNode;active?:string}> = ({children,active='فرصت‌ها'}) => {
  const nav=[['فرصت‌ها','✦'],['ذخیره‌شده','♡'],['تطبیق هوشمند','◎'],['هشدارها','◴'],['آمادگی مصاحبه','▤']];
  return <div style={{width:1500,height:800,borderRadius:40,overflow:'hidden',background:'rgba(255,255,255,.94)',border:'1px solid rgba(255,255,255,.9)',boxShadow:'0 40px 130px rgba(79,35,83,.18)',display:'flex',fontFamily:UI}}>
    <aside style={{width:285,padding:'30px 22px',background:'linear-gradient(180deg,#fff7fb,#fff)',borderRight:'1px solid rgba(55,45,70,.08)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'0 12px 28px'}}><Img src={logo} style={{width:49,height:49,borderRadius:11}}/><b style={{fontFamily:DISPLAY,fontSize:23,color:'#162850'}}>ARIA HUB</b></div>
      {nav.map(([n,g])=><div key={n} dir="rtl" style={{height:54,borderRadius:14,display:'flex',alignItems:'center',gap:12,padding:'0 15px',margin:'5px 0',background:active===n?'#f3dfe8':'transparent',color:active===n?'#8d2948':'#3e3b45',fontWeight:active===n?750:500,fontSize:18}}><span>{g}</span><span>{n}</span></div>)}
    </aside>
    <main style={{flex:1,position:'relative',background:'linear-gradient(145deg,#fff 0%,#fff9fb 60%,#fbf5ff 100%)'}}>{children}</main>
  </div>;
};
