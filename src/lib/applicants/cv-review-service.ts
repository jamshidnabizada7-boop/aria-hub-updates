import {Prisma,type PrismaClient} from '@prisma/client';
import {ExtractedCVSchema,type CVField,type CVReviewSchema} from './cv-extraction-proposals';
import type {z} from 'zod';
type Review=z.infer<typeof CVReviewSchema>;
/** Serialized review never accepts an unprocessed, unowned, deleted, stale
 * or hash-mismatched document. Previously verified facts are preserved. */
export async function approveCVReview(db:PrismaClient,profileId:string,id:string,review:Review){
 return db.$transaction(async tx=>{
  const owners=await tx.$queryRawUnsafe<Array<{id:string}>>(
   'SELECT "id" FROM "ApplicantProfile" WHERE "id"=$1 FOR UPDATE',profileId);
  if(!owners.length)return 'not_found';
  const rows=await tx.$queryRawUnsafe<Array<{
   id:string;sha256:string;status:string;reviewedAt:Date|null;extraction:unknown
  }>>('SELECT "id","sha256","status","reviewedAt","extraction" FROM "ApplicantDocument" WHERE "id"=$1 AND "applicantProfileId"=$2 FOR UPDATE',id,profileId);
  const doc=rows[0];
  if(!doc||doc.sha256!==review.sourceSha256||doc.status!=='review'||doc.reviewedAt)return 'stale_review';
  const parsed=ExtractedCVSchema.safeParse(doc.extraction);
  if(!parsed.success)return 'invalid_extraction';
  const existing=await tx.applicantProfile.findUnique({where:{id:profileId},select:{verifiedCareerFacts:true}});
  const previous=existing?.verifiedCareerFacts&&typeof existing.verifiedCareerFacts==='object'&&!Array.isArray(existing.verifiedCareerFacts)
   ?existing.verifiedCareerFacts as Record<string,unknown>:{};
  const next:Record<string,unknown>={...previous};
  let accepted=0;
  for(const field of [...new Set(review.acceptedFields)] as CVField[]){
   const value=(review.edits as Record<string,unknown>)[field]??(parsed.data.fields as Record<string,unknown>)[field];
   if(value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length))continue;
   const before=next[field];
   if(!review.replaceExisting&&before!==undefined&&before!==null&&before!==''&&(!Array.isArray(before)||before.length))continue;
   next[field]=value;accepted++;
  }
  if(!accepted)return 'nothing_to_save';
  await tx.applicantProfile.update({where:{id:profileId},data:{verifiedCareerFacts:next as unknown as Prisma.InputJsonObject}});
  await tx.applicantDocument.update({where:{id:doc.id},data:{reviewedAt:new Date()}});
  return 'saved';
 });
}
