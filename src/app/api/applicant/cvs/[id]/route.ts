import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applicantFromRequest, applicantEnabled } from '@/lib/applicant-auth';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { fetchPrivateCV, removePrivateCV } from '@/lib/applicants/cv-private-storage';
import { claimCVDeletion, CVLifecycleError } from '@/lib/applicants/cv-document-lifecycle';
import { createHash } from 'node:crypto';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(d:object,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'private, no-store'}});
type Ctx={params:Promise<{id:string}>};
async function documentForUser(req:Request,id:string){
 if(!applicantEnabled()||process.env.CLOUD_CV_STORAGE_ENABLED!=='true')return null;
 const user=await applicantFromRequest(req);if(!user)return null;
 return db.applicantDocument.findFirst({
  where:{id,applicantProfile:{userId:user.id},status:{notIn:['deleting','storing']}},
  select:{id:true,storageKey:true,originalName:true,mimeType:true,status:true,sha256:true}
 });
}
export async function GET(req:Request,{params}:Ctx){
 const {id}=await params;
 try{
  const record=await documentForUser(req,id);if(!record)return json({error:'not_found'},404);
  const bytes=await fetchPrivateCV(record.storageKey);
  if(createHash('sha256').update(bytes).digest('hex')!==record.sha256)return json({error:'source_hash_mismatch'},503);
  const safeName=record.originalName.replace(/[\r\n]/g,'').slice(0,180);
  return new Response(new Blob([new Uint8Array(bytes)]),{
    headers:{
      'Content-Type':'application/octet-stream',
      'Content-Disposition':"attachment; filename=\"aria-cv\"; filename*=UTF-8''"+encodeURIComponent(safeName),
      'Cache-Control':'private, no-store',
      'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; sandbox",
      'Referrer-Policy':'no-referrer',
    }
  });
 }catch{return json({error:'document_unavailable'},503);}
}
export async function DELETE(req:Request,{params}:Ctx){
 if(!applicantSameOrigin(req))return json({error:'invalid_origin'},403);
 const {id}=await params;
 try{
  if(!applicantEnabled()||process.env.CLOUD_CV_STORAGE_ENABLED!=='true')return json({error:'not_found'},404);
  const user=await applicantFromRequest(req);if(!user)return json({error:'not_found'},404);
  const record=await claimCVDeletion(db,user.id,id);if(!record)return json({error:'not_found'},404);
  await removePrivateCV(record.storageKey);
  const deleted=await db.applicantDocument.deleteMany({where:{id:record.id,
    applicantProfileId:record.applicantProfileId,status:'deleting',storageKey:record.storageKey}});
  return json({success:deleted.count===1});
 }catch(e){
  if(e instanceof CVLifecycleError)return json({error:e.code},409);
  return json({error:'delete_failed'},503);
}
}
