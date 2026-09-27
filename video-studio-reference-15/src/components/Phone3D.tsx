import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const UI="'Vazirmatn Variable',sans-serif";
const DISPLAY="'Noto Kufi Arabic Variable','Vazirmatn Variable',sans-serif";

export const Phone3D:React.FC<{progress?:number}>=({progress})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig();
  const p=progress ?? spring({frame,fps,config:{damping:16,stiffness:78}});
  const yaw=interpolate(p,[0,1],[-36,-5]);
  const pitch=interpolate(p,[0,1],[7,0]);
  const rot=interpolate(p,[0,1],[-7,0]);
  return <div style={{width:430,height:850,perspective:1500,transformStyle:'preserve-3d'}}>
    <div style={{position:'relative',width:'100%',height:'100%',borderRadius:66,background:'linear-gradient(140deg,#050609,#23262d)',padding:18,boxShadow:'0 55px 110px rgba(22,40,80,.22)',transform:`rotateY(${yaw}deg) rotateX(${pitch}deg) rotateZ(${rot}deg)`,transformStyle:'preserve-3d'}}>
      <div style={{height:'100%',borderRadius:52,overflow:'hidden',background:'#fff',position:'relative'}}>
        <div style={{height:80,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 25px',background:'#f8f9fc'}}>
          <b style={{fontFamily:'system-ui',fontSize:22,color:'#162850'}}>ARIA HUB</b><Img src={staticFile('logo-vector.svg')} style={{width:42,height:42,borderRadius:10}}/>
        </div>
        <div dir="rtl" style={{margin:22,borderRadius:24,background:'#162850',padding:22,color:'#fff',fontFamily:UI}}><div style={{fontFamily:DISPLAY,fontSize:25,fontWeight:800}}>فرصت بعدی‌ات را پیدا کن</div><div style={{marginTop:16,borderRadius:13,background:'#fff',color:'#777',padding:'11px 14px'}}>جستجوی فرصت‌ها…</div></div>
        {['بورسیه‌های تحصیلی','فرصت‌های شغلی','کارآموزی‌ها'].map((x,i)=><div key={x} dir="rtl" style={{margin:'0 22px 18px',border:'1px solid #e4e7ed',borderRadius:20,padding:18,fontFamily:UI,color:'#151821'}}><b>{x}</b><div style={{fontSize:15,color:'#7b8190',marginTop:8}}>{['فرصت‌های بین‌المللی','جدیدترین موقعیت‌ها','برنامه‌های حرفه‌ای'][i]}</div></div>)}
        <div style={{position:'absolute',top:13,left:'50%',transform:'translateX(-50%)',width:132,height:31,borderRadius:18,background:'#08090b'}}/>
      </div>
    </div>
  </div>;
};
