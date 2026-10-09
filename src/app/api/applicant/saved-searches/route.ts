import {SavedSearchRequest,sendSavedSearch as send,savedSearchAccount as account} from '@/lib/applicants/saved-search-service';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { allowDurable } from '@/lib/security/durable-rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{
  const profile=await account(req);if(!profile)return send({error:'unauthorized_or_unavailable'},401);
  const items=await db.applicantSavedSearch.findMany({
   where:{applicantProfileId:profile.id},orderBy:{updatedAt:'desc'},take:10,
   select:{id:true,name:true,profile:true,active:true,updatedAt:true}
  });
  return send({items,notificationsEnabled:false});
 }catch{return send({error:'server_error'},500);}
}
export async function POST(req:Request){
 if(!applicantSameOrigin(req))return send({error:'invalid_origin'},403);
 try{
  const profile=await account(req);if(!profile)return send({error:'unauthorized_or_unavailable'},401);
  const length=Number(req.headers.get('content-length')||0);if(length>10000)return send({error:'payload_too_large'},413);
  if(!(await allowDurable(db,'applicant-saved-search-write',[profile.userId],20,3600000)))return send({error:'rate_limited'},429);
  const parsed=SavedSearchRequest.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return send({error:'invalid_saved_search'},400);
  // Limit within a transaction so parallel requests cannot exceed quota.
  const item=await db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "ApplicantProfile" WHERE "id" = ${profile.id} FOR UPDATE`;
    const count=await tx.applicantSavedSearch.count({where:{applicantProfileId:profile.id}});
    if(count>=10)return null;
    return tx.applicantSavedSearch.create({
      data:{applicantProfileId:profile.id,name:parsed.data.name,profile:parsed.data.profile},
      select:{id:true,name:true,profile:true,active:true,updatedAt:true}
    });
  });
  if(!item)return send({error:'saved_search_limit'},409);
  return send({item,notificationsEnabled:false},201);
 }catch{return send({error:'server_error'},500);}
}
