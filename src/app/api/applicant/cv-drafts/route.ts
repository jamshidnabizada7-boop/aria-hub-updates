import {db} from '@/lib/db';
import {cloudOwner,cvResponse} from '@/lib/applicants/cv-cloud-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
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
