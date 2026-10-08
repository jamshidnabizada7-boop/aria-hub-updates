import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { applicantFromRequest, applicantEnabled } from '@/lib/applicant-auth';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { validateCVUpload, MAX_CV_BYTES, CVFileError } from '@/lib/applicants/cv-upload-validation';
import { scanCV } from '@/lib/applicants/cv-scan';
import { storePrivateCV, removePrivateCV } from '@/lib/applicants/cv-private-storage';
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
    take:25,select:{id:true,originalName:true,mimeType:true,byteSize:true,status:true,createdAt:true}
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
 let uploadedKey:string|null=null;
 try{
  const profile=await owner(req);if(!profile)return response({error:'unauthorized'},401);
  if(!(await allowDurable(db,'applicant-cv-upload',[profile.userId],10,86400000)))return response({error:'rate_limited'},429);
  const existing=await db.applicantDocument.count({where:{applicantProfileId:profile.id}});
  if(existing>=10)return response({error:'document_limit_reached'},409);
  const body=await req.formData();const file=body.get('file');
  if(!(file instanceof File))return response({error:'file_required'},400);
  if(file.size===0||file.size>MAX_CV_BYTES)return response({error:'invalid_file_size'},413);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const safe=validateCVUpload(file.name,bytes);
  const digest=createHash('sha256').update(bytes).digest('hex');
  const duplicate=await db.applicantDocument.findFirst({where:{applicantProfileId:profile.id,sha256:digest},select:{id:true}});
  if(duplicate)return response({error:'already_uploaded',documentId:duplicate.id},409);
  if(!(await scanCV(bytes)))return response({error:'scanner_unavailable_or_file_rejected'},503);
  const key=profile.userId+'/'+randomBytes(20).toString('hex')+'.'+safe.extension;
  uploadedKey=key;
  await storePrivateCV(key,bytes,safe.mime);
  const row=await db.applicantDocument.create({data:{
    applicantProfileId:profile.id, originalName:file.name.slice(0,180),
    mimeType:safe.mime,byteSize:bytes.length,sha256:digest,storageKey:key,status:'uploaded'
  },select:{id:true,originalName:true,mimeType:true,byteSize:true,status:true,createdAt:true}});
  return response({item:row},201);
 }catch(err){
  if(uploadedKey){try{await removePrivateCV(uploadedKey);}catch{}}
  if(err instanceof CVFileError)return response({error:err.code},400);
  return response({error:'cv_upload_failed'},503);
 }
}
