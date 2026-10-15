'use client';
import {useEffect,useState} from 'react';
let pending:Promise<{ok:boolean;items:Array<{id:string}>}>|null=null;let expires=0;
function followed(){if(!pending||Date.now()>expires){expires=Date.now()+5000;pending=fetch('/api/applicant/organization-follows',{cache:'no-store'}).then(async r=>({ok:r.ok,items:(await r.json()).items||[]}));}return pending;}
export function OrganizationFollowButton({organizationId,lang}:{organizationId:string;lang:'en'|'fa'|'ps'}){
 const [following,setFollowing]=useState(false),[ready,setReady]=useState(false),[signed,setSigned]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const labels=lang==='fa'?['دنبال کردن','دنبال می‌کنید','برای دنبال کردن وارد شوید']:lang==='ps'?['تعقیب کړئ','تعقیب شوې','د تعقیب لپاره ننوځئ']:['Follow organization','Following','Log in to follow'];
 useEffect(()=>{let live=true;followed().then(d=>{if(live){setSigned(d.ok);setFollowing(d.items.some(i=>i.id===organizationId));setReady(true);}}).catch(()=>live&&setReady(true));return()=>{live=false;};},[organizationId]);
 async function toggle(){setBusy(true);setMessage('');try{const r=await fetch('/api/applicant/organization-follows',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId,follow:!following})}),d=await r.json();if(!r.ok)throw Error(d.error);setFollowing(d.following);expires=0;}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <span>{ready&&!signed?<a className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold" href={`/${lang}/login`}>{labels[2]}</a>:<button disabled={!ready||busy} aria-pressed={following} onClick={()=>void toggle()} className={'min-h-11 rounded-xl border px-4 text-sm font-semibold '+(following?'border-primary/40 bg-primary/10 text-primary':'bg-primary text-primary-foreground')}>{following?'✓ ': '+ '}{labels[following?1:0]}</button>}{message&&<span role="status" className="ms-2 text-xs">{message}</span>}</span>;
}
