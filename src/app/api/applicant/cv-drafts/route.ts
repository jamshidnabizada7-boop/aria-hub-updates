import {db} from '@/lib/db';
import {applicantEnabled,applicantFromRequest} from '@/lib/applicant-auth';
import {cloudCVEnabled} from '@/lib/applicants/cv-cloud-crypto';
import {NextResponse} from 'next/server';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const cvResponse=(v:object,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function cloudOwner(req:Request){
 if(!applicantEnabled()||!cloudCVEnabled())return null;
 const u=await applicantFromRequest(req);if(!u||!u.emailVerified)return null;
 return db.applicantProfile.findUnique({where:{userId:u.id},select:{id:true}});
}
export async function GET(req:Request){
 try{
  const owner=await cloudOwner(req);if(!owner)return cvResponse({error:'unavailable_or_unauthorized'},401);
  const items=await db.applicantCVDraft.findMany({
   where:{applicantProfileId:owner.id},orderBy:{updatedAt:'desc'},take:20,
   select:{draftId:true,revision:true,updatedAt:true,createdAt:true}
  });
  return cvResponse({items});
 }catch{return cvResponse({error:'cloud_drafts_unavailable'},503);}
}
