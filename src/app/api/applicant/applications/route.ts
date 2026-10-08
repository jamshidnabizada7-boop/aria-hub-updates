import { db } from '@/lib/db';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { checkDurableRateLimit } from '@/lib/security/durable-rate-limit';
import { careerAccount, careerEnabled, careerReply, TrackerCreate } from '@/lib/applicants/career-service';
export const runtime='nodejs'; export const dynamic='force-dynamic';
const fields={id:true,status:true,notes:true,appliedAt:true,nextActionAt:true,createdAt:true,updatedAt:true,
 opportunity:{select:{id:true,slug:true,title:true,titleI18n:true,organization:true,deadline:true,status:true,category:{select:{slug:true}}}}} as const;

export async function GET(req:Request){
 try{
  if(!careerEnabled())return careerReply({error:'feature_disabled'},503);
  const account=await careerAccount(req);if(!account)return careerReply({error:'unauthorized'},401);
  const items=await db.applicantApplication.findMany({
   where:{applicantProfileId:account.profile.id},orderBy:{updatedAt:'desc'},take:100,select:fields
  });
  return careerReply({items,autoApplications:false});
 }catch{return careerReply({error:'request_failed'},500);}
}
export async function POST(req:Request){
 if(!careerEnabled())return careerReply({error:'feature_disabled'},503);
 if(!applicantSameOrigin(req))return careerReply({error:'invalid_origin'},403);
 try{
  const account=await careerAccount(req);if(!account)return careerReply({error:'unauthorized'},401);
  const length=Number(req.headers.get('content-length')||0);
  if(length>2048)return careerReply({error:'payload_too_large'},413);
  // Unlike legacy allowDurable, an unavailable limiter must fail CLOSED for writes.
  let limit;try{limit=await checkDurableRateLimit(db,'applicant-career-create:'+account.user.id,20,3600000);}
  catch{return careerReply({error:'rate_limit_unavailable'},503);}
  if(!limit.allowed)return careerReply({error:'rate_limited'},429);
  const parsed=TrackerCreate.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return careerReply({error:'invalid_opportunity'},400);
  const now=new Date();
  const opportunity=await db.opportunity.findFirst({
   where:{slug:parsed.data.opportunitySlug,status:'published',OR:[{deadline:null},{deadline:{gte:now}}]},
   select:{id:true}
  });
  if(!opportunity)return careerReply({error:'opportunity_not_open'},404);
  try{
   const item=await db.$transaction(async tx=>{
    // Serializes each user's quota to 100 active/historical records.
    await tx.$queryRaw`SELECT "id" FROM "ApplicantProfile" WHERE "id"=${account.profile.id} FOR UPDATE`;
    const n=await tx.applicantApplication.count({where:{applicantProfileId:account.profile.id}});
    if(n>=100)return null;
    return tx.applicantApplication.create({
     data:{applicantProfileId:account.profile.id,opportunityId:opportunity.id,status:'saved'},
     select:fields
    });
   });
   if(!item)return careerReply({error:'tracker_full'},409);
   return careerReply({item},201);
  }catch(error){
   if(error&&typeof error==='object'&&'code' in error&&(error as {code?:string}).code==='P2002')return careerReply({error:'already_tracked'},409);
   throw error;
  }
 }catch{return careerReply({error:'request_failed'},500);}
}
