'use client';
import {useEffect,useState} from 'react';

type Report={
 observedAt:string;applicant:{accounts:number;cvStates:Record<string,number>;staleOcrClaims:number;reviewedDocuments:number;encryptedCloudDrafts:number;activeSavedSearches:number};
 notifications:{recentAlerts:number;emailConsentAccounts:number;emailDeliveryStates:Record<string,number>};
 employers:{jobStates:Record<string,number>;pendingMembershipReviews:number};
 matchQuality:Record<string,number>;
 providerFlags:{cvOcr:boolean;email:boolean;mobilePush:boolean;whatsapp:boolean};
};
function Stats({rows}:{rows:Record<string,number>}){
 return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(rows).map(([label,value])=>
  <div className="rounded-lg border p-3" key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-xl font-semibold tabular-nums">{value}</dd></div>)}</dl>;
}
export function ApplicantOperationsPanel(){
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
   <section className="space-y-2"><h3 className="font-bold">Channel deployment switches (read-only)</h3>
    <ul className="grid grid-cols-2 gap-2 text-sm">{Object.entries(data.providerFlags).map(([key,enabled])=>
     <li key={key} className="rounded border p-2">{key}: <strong>{enabled?'Configured flag on':'Disabled'}</strong></li>)}</ul>
    <p className="text-xs text-muted-foreground">An enabled flag does not prove provider delivery or production readiness.</p>
   </section>
  </>}
 </section>;
}
