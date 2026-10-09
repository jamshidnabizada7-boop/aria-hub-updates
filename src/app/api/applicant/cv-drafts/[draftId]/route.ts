import {db} from '@/lib/db';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {CloudDraftId,CloudDraftWrite,checkedCloudDraft,encryptCVDraft,decryptCVDraft} from '@/lib/applicants/cv-cloud-crypto';
import {cloudOwner,cvResponse} from '../route';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{draftId:string}>};
async function context(req:Request,params:Ctx['params']){
 const {draftId}=await params;
 if(!CloudDraftId.safeParse(draftId).success)return null;
 const owner=await cloudOwner(req);if(!owner)return null;
 return {id:draftId,owner:owner.id};
}
export async function GET(req:Request,{params}:Ctx){
 try{
  const ctx=await context(req,params);if(!ctx)return cvResponse({error:'not_found'},404);
  const row=await db.applicantCVDraft.findUnique({
   where:{applicantProfileId_draftId:{applicantProfileId:ctx.owner,draftId:ctx.id}},
   select:{encryptedContent:true,revision:true,updatedAt:true}
  });
  if(!row)return cvResponse({error:'not_found'},404);
  const draft=decryptCVDraft(row.encryptedContent,ctx.owner,ctx.id);
  return cvResponse({draft,revision:row.revision,updatedAt:row.updatedAt});
 }catch{return cvResponse({error:'cloud_draft_unavailable'},503);}
}
export async function PUT(req:Request,{params}:Ctx){
 if(!applicantSameOrigin(req))return cvResponse({error:'invalid_origin'},403);
 const length=Number(req.headers.get('content-length'));
 if(!Number.isSafeInteger(length)||length<=0||length>180*1024)return cvResponse({error:'payload_too_large'},413);
 try{
  const ctx=await context(req,params);if(!ctx)return cvResponse({error:'not_found'},404);
  const body=CloudDraftWrite.safeParse(await req.json().catch(()=>null));
  if(!body.success)return cvResponse({error:'invalid_draft'},400);
  const draft=checkedCloudDraft(body.data.draft,ctx.id);
  const ciphertext=encryptCVDraft(draft,ctx.owner,ctx.id);
  const expected=body.data.expectedRevision;
  if(expected===0){
   const result=await db.$transaction(async tx=>{
    await tx.$queryRawUnsafe('SELECT "id" FROM "ApplicantProfile" WHERE "id"=$1 FOR UPDATE',ctx.owner);
    if(await tx.applicantCVDraft.count({where:{applicantProfileId:ctx.owner}})>=12)return 'limit';
    const inserted=await tx.applicantCVDraft.createMany({data:[{
      applicantProfileId:ctx.owner,draftId:ctx.id,encryptedContent:ciphertext
    }],skipDuplicates:true});
    return inserted.count===1?'created':'conflict';
   });
   if(result==='limit')return cvResponse({error:'cloud_draft_limit'},409);
   if(result==='conflict')return cvResponse({error:'revision_conflict'},409);
   return cvResponse({success:true,revision:1});
  }
  const saved=await db.applicantCVDraft.updateMany({
   where:{applicantProfileId:ctx.owner,draftId:ctx.id,revision:expected},
   data:{encryptedContent:ciphertext,revision:{increment:1}}
  });
  if(!saved.count)return cvResponse({error:'revision_conflict'},409);
  return cvResponse({success:true,revision:expected+1});
 }catch(e){
  if(e instanceof Error&&['invalid_draft','draft_too_large'].includes(e.message))return cvResponse({error:e.message},400);
  return cvResponse({error:'cloud_draft_unavailable'},503);
 }
}
export async function DELETE(req:Request,{params}:Ctx){
 if(!applicantSameOrigin(req))return cvResponse({error:'invalid_origin'},403);
 try{
  const ctx=await context(req,params);if(!ctx)return cvResponse({error:'not_found'},404);
  const payload=await req.json().catch(()=>null);
  const expected=payload?.expectedRevision;
  if(!Number.isInteger(expected)||expected<1)return cvResponse({error:'invalid_revision'},400);
  const deleted=await db.applicantCVDraft.deleteMany({
   where:{applicantProfileId:ctx.owner,draftId:ctx.id,revision:expected}
  });
  if(!deleted.count)return cvResponse({error:'revision_conflict'},409);
  return cvResponse({success:true});
 }catch{return cvResponse({error:'cloud_draft_unavailable'},503);}
}
