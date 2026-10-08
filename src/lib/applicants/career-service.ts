import { z } from 'zod';
import { applicantEnabled, applicantFromRequest } from '@/lib/applicant-auth';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const APPLICATION_STATUSES=['saved','preparing','applied','interview','offer','rejected','withdrawn'] as const;
export type ApplicationStatus=(typeof APPLICATION_STATUSES)[number];
export const TrackerCreate=z.object({opportunitySlug:z.string().trim().min(1).max(220).regex(/^[a-z0-9-]+$/)}).strict();
export const TrackerUpdate=z.object({
 status:z.enum(APPLICATION_STATUSES),
 notes:z.string().trim().max(2000).nullable().optional(),
 nextActionAt:z.string().datetime({offset:true}).nullable().optional()
}).strict();
export function careerEnabled():boolean {
 return applicantEnabled() && process.env.APPLICANT_CAREER_V5_ENABLED==='true';
}
export async function careerAccount(req:Request){
 if(!careerEnabled())return null;
 const u=await applicantFromRequest(req);
 if(!u||!u.emailVerified)return null;
 const profile=await db.applicantProfile.findUnique({where:{userId:u.id},select:{id:true,userId:true,headline:true,preferredLocale:true,verifiedCareerFacts:true}});
 return profile?{user:u,profile}:null;
}
export function careerReply(data:object,status=200){
 return NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
export function validTrackerId(value:string){return /^c[a-z0-9]{10,40}$/.test(value);}
export function nextStatusDates(status:ApplicationStatus,previous:{status:string;appliedAt:Date|null},now:Date):{appliedAt:Date|null}|{} {
 // Only a conscious status change to 'applied' or beyond claims an application was made.
 // Never infer submission from opening the link or generating a document.
 if(['applied','interview','offer','rejected'].includes(status))return {appliedAt:previous.appliedAt??now};
 if(status==='saved'||status==='preparing')return {appliedAt:previous.appliedAt};
 return {};
}
