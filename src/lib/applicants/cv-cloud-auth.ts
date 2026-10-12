import {db} from '@/lib/db';
import {applicantEnabled,applicantFromRequest} from '@/lib/applicant-auth';
import {cloudCVEnabled} from './cv-cloud-crypto';
import {NextResponse} from 'next/server';

export const cvResponse=(v:object,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function cloudOwner(req:Request){
 if(!applicantEnabled()||!cloudCVEnabled())return null;
 const u=await applicantFromRequest(req);if(!u||!u.emailVerified)return null;
 return db.applicantProfile.findUnique({where:{userId:u.id},select:{id:true}});
}
