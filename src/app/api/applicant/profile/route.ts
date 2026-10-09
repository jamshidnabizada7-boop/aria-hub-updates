import { applicantSameOrigin } from '@/lib/applicant-origin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applicantFromRequest, requireApplicantEnabled } from '@/lib/applicant-auth';
import { z } from 'zod';
export const dynamic='force-dynamic';
const Profile=z.object({ name:z.string().trim().min(1).max(120), headline:z.string().trim().max(160), residence:z.string().trim().max(120), preferredLocale:z.enum(['en','fa','ps']) }).strict();
const send=(d:object,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){
 try{requireApplicantEnabled();const user=await applicantFromRequest(req);if(!user)return send({error:'unauthorized'},401);const p=await db.applicantProfile.findUnique({where:{userId:user.id}});return send({name:user.name||'',email:user.email,headline:p?.headline||'',residence:p?.residence||'',preferredLocale:p?.preferredLocale||'fa'});}catch{return send({error:'unavailable'},503);}
}
export async function PUT(req:Request){
 try{requireApplicantEnabled();if(!applicantSameOrigin(req))return send({error:'invalid_origin'},403);const user=await applicantFromRequest(req);if(!user)return send({error:'unauthorized'},401);
 if(Number(req.headers.get('content-length')||0)>4096)return send({error:'too_large'},413);
 const parsed=Profile.safeParse(await req.json().catch(()=>null));if(!parsed.success)return send({error:'invalid_profile'},400);
 const {name,headline,residence,preferredLocale}=parsed.data;
 await db.$transaction([db.user.update({where:{id:user.id},data:{name}}),db.applicantProfile.update({where:{userId:user.id},data:{headline,residence,preferredLocale}})]);
 return send({success:true});
 }catch{return send({error:'request_failed'},500);}
}