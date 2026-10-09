import {db} from '@/lib/db';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {careerAccount,careerEnabled,careerReply,validTrackerId,TrackerUpdate,nextStatusDates} from '@/lib/applicants/career-service';
import {checkDurableRateLimit} from '@/lib/security/durable-rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:Request,{params}:Ctx){
 if(!careerEnabled())return careerReply({error:'feature_disabled'},503);
 if(!applicantSameOrigin(req))return careerReply({error:'invalid_origin'},403);
 try{
  const account=await careerAccount(req);if(!account)return careerReply({error:'unauthorized'},401);
  const {id}=await params;if(!validTrackerId(id))return careerReply({error:'not_found'},404);
  if(Number(req.headers.get('content-length')||0)>4096)return careerReply({error:'payload_too_large'},413);
  let rate;try{rate=await checkDurableRateLimit(db,'applicant-career-edit:'+account.user.id,50,3600000);}
  catch{return careerReply({error:'rate_limit_unavailable'},503);}
  if(!rate.allowed)return careerReply({error:'rate_limited'},429);
  const data=TrackerUpdate.safeParse(await req.json().catch(()=>null));
  if(!data.success)return careerReply({error:'invalid_update'},400);
  const future=data.data.nextActionAt===undefined?undefined:data.data.nextActionAt===null?null:new Date(data.data.nextActionAt);
  if(future&&future.getTime()>Date.now()+2*365*86400000)return careerReply({error:'follow_up_too_far'},400);
  const result=await db.$transaction(async tx=>{
   const rows=await tx.$queryRaw<Array<{id:string;status:string;appliedAt:Date|null}>>`
     SELECT "id","status","appliedAt" FROM "ApplicantApplication"
     WHERE "id"=${id} AND "applicantProfileId"=${account.profile.id} FOR UPDATE
   `;
   const old=rows[0];if(!old)return null;
   return tx.applicantApplication.update({where:{id:old.id},data:{
    status:data.data.status,...nextStatusDates(data.data.status,old,new Date()),
    ...(data.data.notes!==undefined?{notes:data.data.notes}:{}),
    ...(future!==undefined?{nextActionAt:future}:{})
   },select:{id:true,status:true,notes:true,nextActionAt:true,appliedAt:true,updatedAt:true}});
  });
  return result?careerReply({item:result}):careerReply({error:'not_found'},404);
 }catch{return careerReply({error:'request_failed'},500);}
}
export async function DELETE(req:Request,{params}:Ctx){
 if(!careerEnabled())return careerReply({error:'feature_disabled'},503);
 if(!applicantSameOrigin(req))return careerReply({error:'invalid_origin'},403);
 try{
  const account=await careerAccount(req);if(!account)return careerReply({error:'unauthorized'},401);
  const {id}=await params;if(!validTrackerId(id))return careerReply({error:'not_found'},404);
  const n=await db.applicantApplication.deleteMany({where:{id,applicantProfileId:account.profile.id}});
  return n.count?careerReply({success:true}):careerReply({error:'not_found'},404);
 }catch{return careerReply({error:'request_failed'},500);}
}
