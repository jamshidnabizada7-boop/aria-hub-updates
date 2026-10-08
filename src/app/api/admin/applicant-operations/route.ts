import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const response=(value:object,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
/** Aggregate only. No applicant email, phone, CV text, raw OCR, ciphertext,
 * push endpoint or WhatsApp destination is ever returned to administrators. */
export async function GET(){
 const admin=await getCurrentAdmin();
 if(!admin)return response({error:'unauthorized'},401);
 try{
  const stale=new Date(Date.now()-15*60_000);
  const recent=new Date(Date.now()-30*86400000);
  const [applicants,documents,processingStale,reviewed,cloudDrafts,
   savedSearches,alerts,deliveries,consents,employerJobs,members,feedback] = await Promise.all([
   db.applicantProfile.count(),
   db.applicantDocument.groupBy({by:['status'],_count:{_all:true}}),
   db.applicantDocument.count({where:{status:'processing',processingClaimedAt:{lt:stale}}}),
   db.applicantDocument.count({where:{reviewedAt:{not:null}}}),
   db.applicantCVDraft.count(),
   db.applicantSavedSearch.count({where:{active:true}}),
   db.applicantNotification.count({where:{createdAt:{gte:recent}}}),
   db.applicantEmailDelivery.groupBy({by:['status'],_count:{_all:true}}),
   db.applicantNotificationPreference.count({where:{emailEnabled:true}}),
   db.opportunity.groupBy({by:['status'],where:{sourceName:'Employer'},_count:{_all:true}}),
   db.organizationMember.count({where:{status:'pending'}}),
   db.matcherFeedback.groupBy({by:['signal'],where:{createdAt:{gte:recent}},_count:{_all:true}})
  ]);
  const counts=(rows:Array<{status:string;_count:{_all:number}}>)=>Object.fromEntries(rows.map(r=>[r.status,r._count._all]));
  return response({
   observedAt:new Date().toISOString(),
   applicant:{accounts:applicants,cvStates:counts(documents),staleOcrClaims:processingStale,
    reviewedDocuments:reviewed,encryptedCloudDrafts:cloudDrafts,activeSavedSearches:savedSearches},
   notifications:{recentAlerts:alerts,emailConsentAccounts:consents,emailDeliveryStates:counts(deliveries)},
   employers:{jobStates:counts(employerJobs),pendingMembershipReviews:members},
   matchQuality:Object.fromEntries(feedback.map(r=>[r.signal,r._count._all])),
   providerFlags:{
    cvOcr:process.env.CV_OCR_ENABLED==='true',
    email:process.env.APPLICANT_MATCH_ALERT_EMAIL_ENABLED==='true',
    mobilePush:process.env.APPLICANT_PUSH_DELIVERY_ENABLED==='true',
    whatsapp:process.env.APPLICANT_WHATSAPP_DELIVERY_ENABLED==='true'
   }
  });
 }catch{return response({error:'applicant_operations_unavailable'},503);}
}
