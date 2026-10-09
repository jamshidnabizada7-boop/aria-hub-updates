import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { applicantFromRequest, applicantEnabled } from '@/lib/applicant-auth';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { validateCVUpload, MAX_CV_BYTES, CVFileError } from '@/lib/applicants/cv-upload-validation';
import { scanCV } from '@/lib/applicants/cv-scan';
import { storePrivateCV, removePrivateCV } from '@/lib/applicants/cv-private-storage';
import { reserveCVUpload, CVLifecycleError } from '@/lib/applicants/cv-document-lifecycle';
import { allowDurable } from '@/lib/security/durable-rate-limit';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function owner(req:Request){
 if(!applicantEnabled()||process.env.CLOUD_CV_STORAGE_ENABLED!=='true')return null;
 const user=await applicantFromRequest(req);if(!user)return null;
 return db.applicantProfile.findUnique({where:{userId:user.id},select:{id:true,userId:true}});
}
export async function GET(req:Request){
 try{
  const profile=await owner(req);
  if(!profile)return response({error:'unavailable_or_unauthorized'},401);
  const items=await db.applicantDocument.findMany({
    where:{applicantProfileId:profile.id},orderBy:{createdAt:'desc'},
    take:25,select:{id:true,originalName:true,mimeType:true,byteSize:true,status:true,createdAt:true,reviewedAt:true,processingError:true}
  });
  return response({items});
 }catch{return response({error:'request_failed'},500);}
}
export async function POST(req:Request){
 if(!applicantSameOrigin(req))return response({error:'invalid_origin'},403);
 if(!applicantEnabled()||process.env.CLOUD_CV_STORAGE_ENABLED!=='true')return response({error:'feature_disabled'},503);
 // Require a declared multipart body size to avoid unbounded memory usage.
 const length=Number(req.headers.get('content-length'));
 if(!Number.isSafeInteger(length)||length<=0)return response({error:'content_length_required'},411);
 if(length>MAX_CV_BYTES+131072)return response({error:'upload_too_large'},413);
 try{
  const profile=await owner(req);if(!profile)return response({error:'unauthorized'},401);
  if(!(await allowDurable(db,'applicant-cv-upload',[profile.userId],10,86400000)))return response({error:'rate_limited'},429);
  const body=await req.formData();const file=body.get('file');
  if(!(file instanceof File))return response({error:'file_required'},400);
  if(file.size===0||file.size>MAX_CV_BYTES)return response({error:'invalid_file_size'},413);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const safe=validateCVUpload(file.name,bytes);
  const digest=createHash('sha256').update(bytes).digest('hex');
  if(!(await scanCV(bytes)))return response({error:'scanner_unavailable_or_file_rejected'},503);
  const key=profile.userId+'/'+randomBytes(20).toString('hex')+'.'+safe.extension;
  const reservation=await reserveCVUpload(db,profile.id,{
    originalName:file.name.slice(0,180),mimeType:safe.mime,byteSize:bytes.length,sha256:digest,storageKey:key
  });
  try{
   await storePrivateCV(key,bytes,safe.mime);
   const ready=await db.applicantDocument.updateMany({
    where:{id:reservation.id,applicantProfileId:profile.id,status:'storing'},data:{status:'uploaded'}
   });
   if(ready.count!==1)throw new Error('upload_reservation_lost');
  }catch(error){
   // Do not delete a DB reference when remote cleanup fails. An authenticated
   // DELETE can retry the retained reservation after a failed upload.
   try{
    await removePrivateCV(key);
    await db.applicantDocument.deleteMany({where:{id:reservation.id,applicantProfileId:profile.id,status:'storing'}});
   }catch{}
   throw error;
  }
  const row=await db.applicantDocument.findUniqueOrThrow({where:{id:reservation.id},
   select:{id:true,originalName:true,mimeType:true,byteSize:true,status:true,createdAt:true}});
  return response({item:row},201);
 }catch(err){
  if(err instanceof CVLifecycleError)return response({error:err.code,documentId:err.documentId},409);
  if(err instanceof CVFileError)return response({error:err.code},400);
  return response({error:'cv_upload_failed'},503);
 }
}
