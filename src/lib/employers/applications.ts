import 'server-only';
import type {PrismaClient,Prisma} from '@prisma/client';
import {requireMembership} from './membership';
export const APPLICATION_STAGES=['submitted','reviewing','shortlisted','interview','offered','hired','rejected'] as const;
export async function submitEmployerApplication(db:PrismaClient,userId:string,body:Record<string,unknown>){
 if(body.consent!==true)throw Error('Confirm sharing your selected details with this employer.');
 const coverLetter=String(body.coverLetter||'').trim();
 if(coverLetter.length<30||coverLetter.length>6000)throw Error('Write a cover letter of 30–6000 characters.');
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
  // Lock against closing the job while accepting the application.
  const jobId=String(body.opportunityId||'');
  await tx.$queryRaw`SELECT id FROM "Opportunity" WHERE id=${jobId} FOR UPDATE`;
  const job=await tx.opportunity.findFirst({where:{id:jobId,sourceName:'Employer',status:'published',acceptsNativeApplications:true,organizationId:{not:null},organizationRef:{active:true},OR:[{deadline:null},{deadline:{gte:new Date()}}]},select:{id:true,organizationId:true}});
  if(!job?.organizationId)throw Error('This job is not accepting applications on ARIA HUB.');
  const profile=await tx.applicantProfile.findUnique({where:{userId},include:{user:{select:{name:true,email:true,emailVerified:true,disabled:true}}}});
  if(!profile||!profile.user.emailVerified||profile.user.disabled||!profile.user.email)throw Error('A verified applicant account is required.');
  const name=String(body.name||profile.user.name||'').trim();if(name.length<2||name.length>160)throw Error('Enter your full name.');
  const documentId=body.documentId?String(body.documentId):null;
  if(documentId&&!await tx.applicantDocument.findFirst({where:{id:documentId,applicantProfileId:profile.id,status:{notIn:['deleting','storing']}},select:{id:true}}))throw Error('Choose a CV from your own library.');
  const exists=await tx.employerApplication.findUnique({where:{applicantProfileId_opportunityId:{applicantProfileId:profile.id,opportunityId:job.id}},select:{id:true}});
  if(exists)throw Error('You already submitted an application for this job.');
  const now=new Date();
  const row=await tx.employerApplication.create({data:{applicantProfileId:profile.id,organizationId:job.organizationId,opportunityId:job.id,documentId,name,email:profile.user.email,coverLetter,consentedAt:now,history:[{status:'submitted',at:now.toISOString()}]},select:{id:true}});
  // Deliberately do not copy notes/profile/CV facts or change the private tracker.
  return row;
 });
}
export async function changeApplicationStage(db:PrismaClient,userId:string,id:string,status:string){
 if(!APPLICATION_STAGES.includes(status as typeof APPLICATION_STAGES[number]))throw Error('Invalid application stage.');
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "EmployerApplication" WHERE id=${id} FOR UPDATE`;
  const row=await tx.employerApplication.findUnique({where:{id}});
  if(!row||row.withdrawnAt||!await requireMembership(tx as unknown as PrismaClient,userId,row.organizationId,'recruiter'))throw Error('Application unavailable.');
  const history=Array.isArray(row.history)?row.history:[];
  if(row.status===status)return;
  if(history.length>=100)throw Error('Stage history limit reached. Contact ARIA HUB.');
  await tx.employerApplication.update({where:{id},data:{status,history:[...history,{status,at:new Date().toISOString()}] as Prisma.InputJsonValue}});
  await tx.auditLog.create({data:{entity:'employer_application',entityId:id,action:'employer.application-stage',details:JSON.stringify({userId,status})}});
 });
}
