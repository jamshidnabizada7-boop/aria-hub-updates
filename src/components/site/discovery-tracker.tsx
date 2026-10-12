'use client';
import { useEffect } from 'react';
export function DiscoveryTracker({ queueId, platform }: { queueId?: string; platform?: string }) {
  useEffect(()=>{
    const send=(kind:string)=>{
      try {if(localStorage.getItem('aria-cookie-consent')!=='all' || !queueId || !platform)return;
        let visitor=sessionStorage.getItem('aria-discovery-visitor');
        if(!visitor){visitor=Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('aria-discovery-visitor',visitor);}
        void fetch('/api/discovery/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queueId,platform,kind,visitor,consent:true}),keepalive:true}).catch(()=>{});
      } catch { /* Storage denied. */ }
    };
    send('landing_view');
    const consent=()=>{try {if(localStorage.getItem('aria-cookie-consent')==='all')send('landing_view');else void fetch('/api/discovery/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'revoke',consent:true})}).catch(()=>{});}catch{}};
    const click=(e:MouseEvent)=>{const target=e.target as Element;if(target.closest('a[data-discovery-opportunity]'))send('opportunity_click');};
    window.addEventListener('aria-cookie-consent',consent);document.addEventListener('click',click);
    return()=>{window.removeEventListener('aria-cookie-consent',consent);document.removeEventListener('click',click);};
  },[queueId,platform]);
  return null;
}
