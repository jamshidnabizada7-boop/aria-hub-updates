import {NextResponse} from 'next/server';import {db} from '@/lib/db';import {applicantEnabled,applicantFromRequest} from '@/lib/applicant-auth';import {applicantSameOrigin} from '@/lib/applicant-origin';import {allowDurable} from '@/lib/security/durable-rate-limit';
export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){
 if(!applicantEnabled())return json({error:'Unavailable'},503);
 const user=await applicantFromRequest(req);if(!user)return json({error:'Unauthorized'},401);
 const items=await db.organizationFollow.findMany({where:{applicantProfile:{userId:user.id}},select:{organization:{select:{id:true,slug:true,name:true}}},take:500});
 return json({items:items.map(x=>x.organization)});
}
export async function POST(req:Request){
 if(!applicantSameOrigin(req))return json({error:'Invalid origin'},403);
 if(!applicantEnabled())return json({error:'Unavailable'},503);
 const user=await applicantFromRequest(req);if(!user)return json({error:'Unauthorized'},401);
 if(!await allowDurable(db,'organization-follow',[user.id],60,60000))return json({error:'Try again later'},429);
 const body=await req.json().catch(()=>null);if(!body?.organizationId||typeof body.follow!=='boolean')return json({error:'Invalid request'},400);
 const profile=await db.applicantProfile.findUniqueOrThrow({where:{userId:user.id},select:{id:true}});
 const org=await db.organization.findFirst({where:{id:String(body.organizationId),active:true},select:{id:true}});if(!org)return json({error:'Not found'},404);
 const where={applicantProfileId:profile.id,organizationId:org.id};
 if(body.follow)await db.organizationFollow.upsert({where:{applicantProfileId_organizationId:where},create:where,update:{}});
 else await db.organizationFollow.deleteMany({where});
 return json({success:true,following:body.follow});
}
