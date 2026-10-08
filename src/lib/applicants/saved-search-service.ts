import { NextResponse } from 'next/server';
import { z } from 'zod';
import {db} from '@/lib/db';
import {applicantEnabled,applicantFromRequest} from '@/lib/applicant-auth';
import {MatcherProfileSchema} from '@/lib/opportunity-matcher';
export const SavedSearchRequest=z.object({name:z.string().trim().min(2).max(80),profile:MatcherProfileSchema}).strict();
export function sendSavedSearch(d:object,status=200){return NextResponse.json(d,{status,headers:{'Cache-Control':'private, no-store'}});}
export async function savedSearchAccount(req:Request){
 if(!applicantEnabled()||process.env.APPLICANT_MATCHER_V3_ENABLED!=='true')return null;
 const user=await applicantFromRequest(req);if(!user)return null;
 return db.applicantProfile.findUnique({where:{userId:user.id},select:{id:true,userId:true}});
}
