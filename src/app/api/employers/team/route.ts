import {NextResponse} from 'next/server';
import {db} from '@/lib/db';import {employerFromRequest} from '@/lib/employer-auth';
import {requireMembership} from '@/lib/employers/membership';import {applicantSameOrigin} from '@/lib/applicant-origin';
export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){
 const user=await employerFromRequest(req),id=new URL(req.url).searchParams.get('organizationId')||'';
 if(!user||!await requireMembership(db,user.id,id,'owner'))return json({error:'Owner access required'},403);
 const members=await db.organizationMember.findMany({where:{organizationId:id},select:{id:true,role:true,status:true,claimEmail:true,user:{select:{name:true,email:true}}},orderBy:{createdAt:'asc'}});
 return json({members});
}
export async function PATCH(req:Request){
 if(!applicantSameOrigin(req))return json({error:'Invalid origin'},403);
 const user=await employerFromRequest(req);if(!user)return json({error:'Unauthorized'},401);
 try{const body=await req.json(),id=String(body.organizationId||'');
  if(!await requireMembership(db,user.id,id,'owner'))return json({error:'Owner access required'},403);
  if(!['recruiter','viewer','suspend'].includes(body.role))return json({error:'Invalid role'},400);
  await db.$transaction(async tx=>{
   const member=await tx.organizationMember.findFirst({where:{id:String(body.id),organizationId:id}});
   if(!member||member.userId===user.id||member.role==='owner'&&member.status==='active')throw Error('Existing owners can only be changed by ARIA HUB.');
   await tx.organizationMember.update({where:{id:member.id},data:{role:body.role==='suspend'?member.role:body.role,status:body.role==='suspend'?'suspended':'active',reviewedAt:new Date(),reviewedBy:user.email}});
   await tx.auditLog.create({data:{entity:'organization_member',entityId:member.id,action:'employer.team-update',details:JSON.stringify({by:user.id,organizationId:id,role:body.role})}});
  });return json({success:true});
 }catch(e){return json({error:e instanceof Error?e.message:'Request failed'},400);}
}
