'use client';
import {useEffect,useState} from 'react';

type Report={
 observedAt:string;applicant:{accounts:number;cvStates:Record<string,number>;staleOcrClaims:number;reviewedDocuments:number;encryptedCloudDrafts:number;activeSavedSearches:number};
 notifications:{recentAlerts:number;emailConsentAccounts:number;emailDeliveryStates:Record<string,number>};
 employers:{jobStates:Record<string,number>;pendingMembershipReviews:number};
 matchQuality:Record<string,number>;
 providerFlags:{cvOcr:boolean;email:boolean;mobilePush:boolean;whatsapp:boolean};
 serviceStates?:Record<string,{ready:boolean;detail:string;freeGiB?:number|null}>;canManage?:boolean;
};
const labels:Record<string,string>={accounts:'Applicant accounts',staleClaims:'Stalled extraction claims',reviewed:'Owner-reviewed CVs',cloudDrafts:'Private saved CV drafts',savedSearches:'Active saved searches',recentAlerts:'Recent matching alerts',emailOptIns:'Accounts with email consent',pendingClaims:'Employer claims awaiting approval',uploaded:'Awaiting extraction',processing:'Processing',review:'Awaiting applicant review',failed:'Failed',sent:'Sent',pending:'Pending',suppressed:'Suppressed',published:'Published employer jobs'};
function Stats({rows}:{rows:Record<string,number>}){
 return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(rows).map(([label,value])=>
  <div className="rounded-lg border p-3" key={label}><dt className="text-xs text-muted-foreground">{labels[label]||label.replace(/([A-Z])/g,' $1').replace(/_/g,' ')}</dt><dd className="text-xl font-semibold tabular-nums">{value}</dd></div>)}</dl>;
}
export function ApplicantOperationsPanel({onNavigate}:{onNavigate?:(key:string)=>void}){
 const [data,setData]=useState<Report|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 async function load(signal?:AbortSignal){
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/admin/applicant-operations',{cache:'no-store',signal});
   if(!r.ok)throw Error('Applicant operations unavailable');
   setData(await r.json());
  }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Unable to load');}
  finally{if(!signal?.aborted)setBusy(false);}
 }
 useEffect(()=>{const ctrl=new AbortController();void load(ctrl.signal);return ()=>ctrl.abort();},[]);
 async function retry(){setBusy(true);setError('');try{const r=await fetch('/api/admin/applicant-operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'retry-failed-cvs'})});const d=await r.json();if(!r.ok)throw Error('Unable to queue extraction retries');await load();setError(d.queued+' CV extraction retries queued on Oracle.');}catch(e){setError(e instanceof Error?e.message:'Retry failed');}finally{setBusy(false);}}
 return <section className="space-y-6" aria-label="Applicant operations overview">
  <div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Applicant, CV and delivery operations</h2>
   <p className="text-sm text-muted-foreground">Aggregated 30-day metrics. Applicant documents and contact details are never displayed.</p></div>
   <button type="button" className="rounded-lg border px-3 py-2" onClick={()=>void load()} disabled={busy}>Refresh</button></div>
  {error&&<p role="alert" className="border p-3 text-sm">{error}</p>}
  {!data?<p role="status">{busy?'Loading operational counters…':'No data available'}</p>:<>
   <p className="text-xs text-muted-foreground">Observed: {new Date(data.observedAt).toLocaleString()}</p>
   <section className="space-y-3"><h3 className="font-bold">Applicants and CV/OCR queue</h3><Stats rows={{accounts:data.applicant.accounts,staleClaims:data.applicant.staleOcrClaims,reviewed:data.applicant.reviewedDocuments,cloudDrafts:data.applicant.encryptedCloudDrafts,savedSearches:data.applicant.activeSavedSearches,...data.applicant.cvStates}}/></section>
   <section className="space-y-3"><h3 className="font-bold">Email and match notifications</h3><Stats rows={{recentAlerts:data.notifications.recentAlerts,emailOptIns:data.notifications.emailConsentAccounts,...data.notifications.emailDeliveryStates}}/></section>
   <section className="space-y-3"><h3 className="font-bold">Employer moderation</h3><Stats rows={{pendingClaims:data.employers.pendingMembershipReviews,...data.employers.jobStates}}/></section>
   <section className="space-y-3"><h3 className="font-bold">Relevance feedback</h3><Stats rows={data.matchQuality}/></section>
   {data.serviceStates&&<section className="space-y-3"><h3 className="font-bold">Service readiness</h3><div className="grid gap-3 sm:grid-cols-2">{Object.entries(data.serviceStates).map(([key,s])=><div key={key} className="rounded-xl border p-4"><h4 className="font-semibold capitalize">{key==='cv'?'Private CV storage':key==='copilot'?'Career Copilot':key}</h4><p className="mt-1 text-sm">{s.ready?'Configured':'Setup needed'} · {s.detail}</p>{s.freeGiB!=null&&<p className="mt-2 text-xs text-muted-foreground">Available storage: {s.freeGiB} GB · 2 GB reserve required</p>}</div>)}</div></section>}
   <section className="space-y-3 rounded-xl border p-4"><h3 className="font-bold">Actions you can take</h3><p className="text-sm text-muted-foreground">Applicants own their private documents and consent. You can retry failed processing, review employer claims, and manage your subscriber lists and inbox.</p><div className="flex flex-wrap gap-2">{data.canManage&&<button className="rounded-lg border px-3 py-2 text-sm" type="button" disabled={busy||!data.applicant.cvStates.failed} onClick={()=>void retry()}>Retry failed CV extraction</button>}{[['organizations','Review employers and organizations'],['alertSubscriber','Manage opportunity alerts'],['contactMessage','Open messages'],['automation','Check social delivery']].map(([key,label])=><button key={key} className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={()=>onNavigate?.(key)}>{label}</button>)}</div><p className="text-xs text-muted-foreground">Match scanning runs on Oracle. Email follows each applicant’s daily or weekly preference; no email is sent when there are no qualifying new matches.</p></section>
   <section className="space-y-2"><h3 className="font-bold">Deployment switches</h3>
    <ul className="grid grid-cols-2 gap-2 text-sm">{Object.entries(data.providerFlags).map(([key,enabled])=>
     <li key={key} className="rounded border p-2">{key}: <strong>{enabled?'Configured flag on':'Disabled'}</strong></li>)}</ul>
    <p className="text-xs text-muted-foreground">An enabled flag does not prove provider delivery or production readiness.</p>
   </section>
  </>}
 </section>;
}
