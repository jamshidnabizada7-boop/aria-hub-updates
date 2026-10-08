import { z } from 'zod';
import {Prisma} from '@prisma/client';
import { db } from '@/lib/db';
import { applicantEnabled, applicantFromRequest } from '@/lib/applicant-auth';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import {sendSavedSearch as send} from '@/lib/applicants/saved-search-service';
import { JOB_ROLE_IDS, type JobRole } from '@/lib/job-role-taxonomy';
import { EDUCATION_LEVELS, FIELD_AREAS } from '@/lib/opportunity-matcher';
export const runtime='nodejs';export const dynamic='force-dynamic';
// Only user-reviewed facts; no PDF/image inference or automatic overwrite.
const CareerFacts=z.object({
  education:z.enum(EDUCATION_LEVELS).optional(),
  fieldArea:z.enum(FIELD_AREAS).optional(),
  experienceYears:z.number().int().min(0).max(50).optional(),
  preferredRoles:z.array(z.enum(JOB_ROLE_IDS as [JobRole,...JobRole[]])).max(12).optional(),
  skills:z.array(z.string().trim().min(2).max(60)).max(25).optional(),
  fullName:z.string().trim().min(2).max(120).optional(),
  headline:z.string().trim().max(160).optional(),
  languages:z.array(z.string().trim().min(2).max(60)).max(15).optional(),
  educationHistory:z.array(z.string().trim().min(3).max(240)).max(8).optional(),
  workHistory:z.array(z.string().trim().min(3).max(240)).max(10).optional(),
  certifications:z.array(z.string().trim().min(3).max(200)).max(8).optional(),
}).strict();
async function owner(req:Request){
 if(!applicantEnabled()||process.env.APPLICANT_MATCHER_V3_ENABLED!=='true')return null;
 const user=await applicantFromRequest(req);if(!user)return null;
 return db.applicantProfile.findUnique({where:{userId:user.id}});
}
export async function GET(req:Request){
 try{
  const p=await owner(req);if(!p)return send({error:'unauthorized_or_unavailable'},401);
  return send({facts:CareerFacts.safeParse(p.verifiedCareerFacts).success ? p.verifiedCareerFacts : null,source:'user_reviewed'});
 }catch{return send({error:'server_error'},500);}
}
export async function PUT(req:Request){
 if(!applicantSameOrigin(req))return send({error:'invalid_origin'},403);
 try{
  const p=await owner(req);if(!p)return send({error:'unauthorized_or_unavailable'},401);
  if(Number(req.headers.get('content-length')||0)>6000)return send({error:'payload_too_large'},413);
  const parsed=CareerFacts.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return send({error:'invalid_facts'},400);
  await db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "ApplicantProfile" WHERE "id"=${p.id} FOR UPDATE`;
    const previous=await tx.applicantProfile.findUnique({where:{id:p.id},select:{verifiedCareerFacts:true}});
    const existing=previous?.verifiedCareerFacts&&typeof previous.verifiedCareerFacts==='object'&&!Array.isArray(previous.verifiedCareerFacts)
      ? previous.verifiedCareerFacts as Record<string,unknown> : {};
    // A Matcher edit must not erase CV-reviewed languages/work history/etc.
    const merged={...existing,...parsed.data};
    await tx.applicantProfile.update({where:{id:p.id},data:{verifiedCareerFacts:merged as unknown as Prisma.InputJsonObject}});
  });
  return send({success:true,source:'user_reviewed'});
 }catch{return send({error:'server_error'},500);}
}
