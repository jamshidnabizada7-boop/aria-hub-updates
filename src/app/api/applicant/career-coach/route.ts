import {db} from '@/lib/db';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {careerAccount,careerEnabled,careerReply} from '@/lib/applicants/career-service';
import {CoachRequestSchema,deterministicCareerCoach,coachAiPrompt,COACH_SYSTEM} from '@/lib/applicants/career-coach';
import {checkDurableRateLimit} from '@/lib/security/durable-rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(!careerEnabled())return careerReply({error:'feature_disabled'},503);
 if(!applicantSameOrigin(req))return careerReply({error:'invalid_origin'},403);
 try{
  const account=await careerAccount(req);if(!account)return careerReply({error:'unauthorized'},401);
  const length=Number(req.headers.get('content-length')||0);if(length>4000)return careerReply({error:'payload_too_large'},413);
  const parsed=CoachRequestSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return careerReply({error:'invalid_request'},400);
  // Fail-closed quota. Even deterministic requests have a small abuse limit.
  let limiter;try{limiter=await checkDurableRateLimit(db,'applicant-career-coach:'+account.user.id,30,3600000);}
  catch{return careerReply({error:'rate_limit_unavailable'},503);}
  if(!limiter.allowed)return careerReply({error:'rate_limited'},429);
  const input=parsed.data;
  const listing=input.opportunitySlug?await db.opportunity.findFirst({
   where:{slug:input.opportunitySlug,status:'published'},
   select:{slug:true,title:true,organization:true,requirements:true,deadline:true,status:true}
  }):null;
  if(input.opportunitySlug&&!listing)return careerReply({error:'opportunity_not_found'},404);
  const facts=account.profile.verifiedCareerFacts;
  const safeFacts=facts&&typeof facts==='object'&&!Array.isArray(facts)?facts as Record<string,unknown>:{};
  const skills=Array.isArray(safeFacts.skills)?safeFacts.skills.filter((x):x is string=>typeof x==='string'&&x.length<=60).slice(0,15):[];
  const ctx={
   name:account.user.name||'',headline:account.profile.headline||'',skills,
   opportunityTitle:listing?.title||undefined,organization:listing?.organization||undefined,
   requirements:listing?.requirements||undefined,userNotes:input.userNotes
  };
  // Deterministic assistance is available without external model/provider costs.
  const fallback=()=>careerReply({task:input.task,mode:'guided',draft:deterministicCareerCoach(input.task,input.lang,ctx),sent:false,requiresUserReview:true,externalDataShared:false});
  if(!input.useAi)return fallback();
  if(!input.consentToShareContext)return careerReply({error:'explicit_ai_consent_required'},400);
  if(process.env.APPLICANT_COPILOT_AI_ENABLED!=='true'||!process.env.GROQ_API_KEY)return careerReply({error:'ai_not_enabled',guidedDraft:deterministicCareerCoach(input.task,input.lang,ctx)},503);
  let aiRate;try{aiRate=await checkDurableRateLimit(db,'applicant-copilot-ai-daily:'+account.user.id,5,86400000);}
  catch{return careerReply({error:'ai_rate_limit_unavailable'},503);}
  if(!aiRate.allowed)return careerReply({error:'ai_daily_quota'},429);
  // Hardcoded trusted endpoint; do not allow arbitrary user-defined endpoints.
  let res:Response;
  try{res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
   method:'POST',signal:AbortSignal.timeout(15000),
   headers:{Authorization:'Bearer '+process.env.GROQ_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({model:process.env.APPLICANT_COPILOT_MODEL||'llama-3.1-8b-instant',
    temperature:0.2,max_tokens:900,
    messages:[{role:'system',content:COACH_SYSTEM},{role:'user',content:coachAiPrompt(input.task,input.lang,ctx)}]
   }),cache:'no-store'
  });}catch{return careerReply({error:'ai_provider_unavailable',guidedDraft:deterministicCareerCoach(input.task,input.lang,ctx)},503);}
  if(!res.ok)return careerReply({error:'ai_provider_unavailable',guidedDraft:deterministicCareerCoach(input.task,input.lang,ctx)},503);
  const body=await res.json().catch(()=>null);
  const draft=body?.choices?.[0]?.message?.content;
  if(typeof draft!=='string'||draft.trim().length<20||draft.length>9000)return careerReply({error:'ai_output_invalid',guidedDraft:deterministicCareerCoach(input.task,input.lang,ctx)},503);
  // Audit metadata only. Do not persist prompt, candidate data or draft.
  await db.auditLog.create({data:{userId:account.user.id,action:'applicant_copilot_used',entity:'ApplicantProfile',entityId:account.profile.id,details:JSON.stringify({task:input.task,provider:'groq'})}}).catch(()=>{});
  return careerReply({task:input.task,mode:'ai',draft:draft.trim(),sent:false,requiresUserReview:true,externalDataShared:true});
 }catch{return careerReply({error:'request_failed'},500);}
}
