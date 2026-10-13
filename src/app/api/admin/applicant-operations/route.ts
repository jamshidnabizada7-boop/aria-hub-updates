import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import {statfs} from 'node:fs/promises';
import {smtpConfigured} from '@/lib/mailer';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {whatsappConfigured,pushConfigured} from '@/lib/applicants/channel-providers';
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
  const disk=process.env.CV_PRIVATE_DIRECTORY?await statfs(process.env.CV_PRIVATE_DIRECTORY).catch(()=>null):null;
  const freeBytes=disk?disk.bavail*disk.bsize:null;
  const states={
   cv:{ready:process.env.CLOUD_CV_STORAGE_ENABLED==='true'&&freeBytes!==null&&freeBytes>=2*1024**3,detail:freeBytes===null?'Private storage unavailable':freeBytes<2*1024**3?'Storage reserve too low for uploads':'Private uploads and local extraction enabled',freeGiB:freeBytes===null?null:Math.round(freeBytes/1024**3*10)/10},
   email:{ready:process.env.APPLICANT_MATCH_ALERT_EMAIL_ENABLED==='true'&&smtpConfigured(),detail:process.env.APPLICANT_MATCH_ALERT_EMAIL_ENABLED!=='true'?'Applicant digest worker disabled':smtpConfigured()?'SMTP configured; delivery receipts appear below':'SMTP setup required'},
   copilot:{ready:process.env.APPLICANT_COPILOT_AI_ENABLED==='true'&&Boolean(process.env.GROQ_API_KEY),detail:process.env.APPLICANT_COPILOT_AI_ENABLED==='true'&&process.env.GROQ_API_KEY?'AI available with per-account limits and consent':'Guided assistance only; AI disabled'},
   whatsapp:{ready:whatsappConfigured(),detail:whatsappConfigured()?'Private verified-number alerts configured':'Private alerts need a registered sender and approved templates; the public Channel is available separately'},
   push:{ready:pushConfigured(),detail:pushConfigured()?'Device opt-in push configured':'Push provider setup required'}
  };
  return response({
   observedAt:new Date().toISOString(),
   applicant:{accounts:applicants,cvStates:counts(documents),staleOcrClaims:processingStale,
    reviewedDocuments:reviewed,encryptedCloudDrafts:cloudDrafts,activeSavedSearches:savedSearches},
   notifications:{recentAlerts:alerts,emailConsentAccounts:consents,emailDeliveryStates:counts(deliveries)},
   employers:{jobStates:counts(employerJobs),pendingMembershipReviews:members},
   matchQuality:Object.fromEntries(feedback.map(r=>[r.signal,r._count._all])),
   serviceStates:states,
   canManage:['super_admin','admin'].includes(admin.role),
   providerFlags:{
    cvOcr:process.env.CV_OCR_ENABLED==='true',
    email:process.env.APPLICANT_MATCH_ALERT_EMAIL_ENABLED==='true',
    mobilePush:process.env.APPLICANT_PUSH_DELIVERY_ENABLED==='true',
    whatsapp:process.env.APPLICANT_WHATSAPP_DELIVERY_ENABLED==='true'
   }
  });
 }catch{return response({error:'applicant_operations_unavailable'},503);}
}

/** Operational retries only: never disclose documents or override consent. */
export async function POST(req:Request){
 const admin=await getCurrentAdmin();if(!admin)return response({error:'unauthorized'},401);
 if(!['super_admin','admin'].includes(admin.role))return response({error:'forbidden'},403);
 if(!applicantSameOrigin(req))return response({error:'invalid_origin'},403);
 const input=await req.json().catch(()=>null);
 if(input?.action!=='retry-failed-cvs')return response({error:'invalid_action'},400);
 try{
  const rows=await db.applicantDocument.findMany({where:{status:'failed',reviewedAt:null},select:{id:true},take:50,orderBy:{createdAt:'asc'}});
  const updated=await db.applicantDocument.updateMany({where:{id:{in:rows.map(r=>r.id)},status:'failed',reviewedAt:null},data:{status:'uploaded',processingAttempts:0,processingError:null,processingClaimedAt:null}});
  await db.auditLog.create({data:{userId:admin.id,action:'admin_cv_extraction_retry',entity:'ApplicantDocument',details:JSON.stringify({count:updated.count})}});
  return response({queued:updated.count,processor:'oracle'});
 }catch{return response({error:'retry_failed'},503);}
}
