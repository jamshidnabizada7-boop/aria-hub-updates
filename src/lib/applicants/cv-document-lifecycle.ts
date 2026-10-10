import type { PrismaClient } from '@prisma/client';

export class CVLifecycleError extends Error {
 constructor(public code:'already_uploaded'|'document_limit_reached'|'document_busy',public documentId?:string){super(code);}
}
/** Always lock the parent profile before inspecting document count and hash. */
export async function reserveCVUpload(db:PrismaClient,profileId:string,data:{
 originalName:string;mimeType:string;byteSize:number;sha256:string;storageKey:string
}){
 return db.$transaction(async tx=>{
  if(process.env.CV_PRIVATE_STORAGE_PROVIDER==='oracle'){
   // Serialize the global quota across owners before taking the profile lock.
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(63871944)`;
   const used=await tx.applicantDocument.aggregate({_sum:{byteSize:true}});
   const quota=Number(process.env.CV_PRIVATE_STORAGE_MAX_BYTES||1073741824);
   if(!Number.isSafeInteger(quota)||quota<8*1024*1024||(used._sum.byteSize||0)+data.byteSize>quota)throw Error('cv_storage_capacity_unavailable');
  }
  const owners=await tx.$queryRawUnsafe<Array<{id:string}>>(
   'SELECT "id" FROM "ApplicantProfile" WHERE "id"=$1 FOR UPDATE',profileId);
  if(!owners.length)throw new Error('profile_not_found');
  const owner=await tx.applicantProfile.findUnique({where:{id:profileId},select:{user:{select:{disabled:true}}}});
  if(!owner||owner.user.disabled)throw new Error('profile_unavailable');
  const duplicate=await tx.applicantDocument.findFirst({where:{applicantProfileId:profileId,sha256:data.sha256},select:{id:true}});
  if(duplicate)throw new CVLifecycleError('already_uploaded',duplicate.id);
  if(await tx.applicantDocument.count({where:{applicantProfileId:profileId}})>=10)
   throw new CVLifecycleError('document_limit_reached');
  return tx.applicantDocument.create({data:{...data,applicantProfileId:profileId,status:'storing'},
   select:{id:true,applicantProfileId:true,storageKey:true,status:true}});
 });
}
/** Serialize deletion with review, using profile -> document lock order.
 * A failed private-storage deletion remains 'deleting' and can be retried. */
export async function claimCVDeletion(db:PrismaClient,userId:string,id:string){
 return db.$transaction(async tx=>{
  const profile=await tx.applicantProfile.findUnique({where:{userId},select:{id:true}});
  if(!profile)return null;
  await tx.$queryRawUnsafe('SELECT "id" FROM "ApplicantProfile" WHERE "id"=$1 FOR UPDATE',profile.id);
  const rows=await tx.$queryRawUnsafe<Array<{id:string;storageKey:string;status:string;updatedAt:Date}>>(
    'SELECT "id","storageKey","status","updatedAt" FROM "ApplicantDocument" WHERE "id"=$1 AND "applicantProfileId"=$2 FOR UPDATE',id,profile.id);
  const doc=rows[0];if(!doc)return null;
  // A crashed uploader can leave a reservation. Fresh uploads are protected;
  // the owner can clean up a stale reservation after the upload timeout.
  if(doc.status==='storing'&&Date.now()-doc.updatedAt.getTime()<10*60_000)
   throw new CVLifecycleError('document_busy');
  if(doc.status!=='deleting')await tx.applicantDocument.update({where:{id:doc.id},data:{status:'deleting',processingClaimedAt:null}});
  return {id:doc.id,storageKey:doc.storageKey,applicantProfileId:profile.id};
 });
}
