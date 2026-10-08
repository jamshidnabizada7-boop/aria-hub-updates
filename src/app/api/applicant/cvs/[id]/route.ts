import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applicantFromRequest, applicantEnabled } from '@/lib/applicant-auth';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { fetchPrivateCV, removePrivateCV } from '@/lib/applicants/cv-private-storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(d:object,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'private, no-store'}});
type Ctx={params:Promise<{id:string}>};
async function documentForUser(req:Request,id:string){
 if(!applicantEnabled()||process.env.CLOUD_CV_STORAGE_ENABLED!=='true')return null;
 const user=await applicantFromRequest(req);if(!user)return null;
 return db.applicantDocument.findFirst({
  where:{id,applicantProfile:{userId:user.id}},
  select:{id:true,storageKey:true,originalName:true,mimeType:true,status:true}
 });
}
export async function GET(req:Request,{params}:Ctx){
 const {id}=await params;
 try{
  const record=await documentForUser(req,id);if(!record)return json({error:'not_found'},404);
  const bytes=await fetchPrivateCV(record.storageKey);
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
  const record=await documentForUser(req,id);if(!record)return json({error:'not_found'},404);
  await removePrivateCV(record.storageKey);
  await db.applicantDocument.deleteMany({where:{id:record.id,storageKey:record.storageKey}});
  return json({success:true});
 }catch{return json({error:'delete_failed'},503);}
}
