import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { account, send, SavedSearchRequest } from '../route';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const Update=SavedSearchRequest.extend({active:z.boolean().optional()});
export async function PATCH(req:Request,{params}:Ctx){
 if(!applicantSameOrigin(req))return send({error:'invalid_origin'},403);
 try{
  const profile=await account(req);if(!profile)return send({error:'unauthorized_or_unavailable'},401);
  const {id}=await params;
  if(!/^c[a-z0-9]{10,40}$/.test(id))return send({error:'not_found'},404);
  if(Number(req.headers.get('content-length')||0)>10000)return send({error:'payload_too_large'},413);
  const parsed=Update.safeParse(await req.json().catch(()=>null));if(!parsed.success)return send({error:'invalid_saved_search'},400);
  const changed=await db.applicantSavedSearch.updateMany({where:{id,applicantProfileId:profile.id},data:{
    name:parsed.data.name,profile:parsed.data.profile,active:parsed.data.active??true
  }});
  if(!changed.count)return send({error:'not_found'},404);
  return send({success:true,notificationsEnabled:false});
 }catch{return send({error:'server_error'},500);}
}
export async function DELETE(req:Request,{params}:Ctx){
 if(!applicantSameOrigin(req))return send({error:'invalid_origin'},403);
 try{
  const profile=await account(req);if(!profile)return send({error:'unauthorized_or_unavailable'},401);
  const {id}=await params;
  if(!/^c[a-z0-9]{10,40}$/.test(id))return send({error:'not_found'},404);
  const removed=await db.applicantSavedSearch.deleteMany({where:{id,applicantProfileId:profile.id}});
  if(!removed.count)return send({error:'not_found'},404);
  return send({success:true});
 }catch{return send({error:'server_error'},500);}
}
