import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {employerFromRequest} from '@/lib/employer-auth';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {requireMembership} from '@/lib/employers/membership';
import {registerOrganization,editOrganization} from '@/lib/employers/organization-workspace';
import {allowDurable} from '@/lib/security/durable-rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){
 const user=await employerFromRequest(req);if(!user)return json({error:'Unauthorized'},401);
 const id=new URL(req.url).searchParams.get('id');
 if(!id){const requests=await db.organizationMember.findMany({where:{userId:user.id,status:{not:'active'}},select:{id:true,status:true,createdAt:true,organization:{select:{name:true,slug:true}}},orderBy:{createdAt:'desc'}});return json({requests});}
 if(!await requireMembership(db,user.id,id,'viewer'))return json({error:'Not found'},404);
 const organization=await db.organization.findUnique({where:{id},select:{id:true,name:true,slug:true,industry:true,country:true,description:true,website:true,careersUrl:true,logoUrl:true,verified:true}});
 return json({organization});
}
async function mutate(req:Request,edit:boolean){
 if(!applicantSameOrigin(req))return json({error:'Invalid origin'},403);
 const user=await employerFromRequest(req);if(!user)return json({error:'Unauthorized'},401);
 if(Number(req.headers.get('content-length')||0)>800000)return json({error:'Logo too large'},413);
 if(!await allowDurable(db,'employer-organization',[user.id],10,3600000))return json({error:'Please try again later.'},429);
 try{const body=await req.json();if(edit){await editOrganization(db,user.id,String(body.id||''),body);return json({success:true});}
  return json({success:true,...await registerOrganization(db,user.id,body)});
 }catch(e){return json({error:e instanceof Error?e.message:'Could not save organization.'},400);}
}
export const POST=(req:Request)=>mutate(req,false);
export const PATCH=(req:Request)=>mutate(req,true);
