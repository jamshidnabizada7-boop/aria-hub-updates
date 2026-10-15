import {NextResponse} from 'next/server';import {db} from '@/lib/db';import {employerFromRequest} from '@/lib/employer-auth';
import {requireMembership} from '@/lib/employers/membership';import {changeApplicationStage} from '@/lib/employers/applications';import {applicantSameOrigin} from '@/lib/applicant-origin';
export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){
 const user=await employerFromRequest(req),query=new URL(req.url).searchParams,id=query.get('organizationId')||'';
 // Viewers can see vacancy counts, never applicant contact details.
 if(!user||!await requireMembership(db,user.id,id,'recruiter'))return json({error:'Recruiter access required'},403);
 const cursor=query.get('cursor');
 const items=await db.employerApplication.findMany({where:{organizationId:id,withdrawnAt:null,...(query.get('jobId')?{opportunityId:query.get('jobId')!}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:31,...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,name:true,email:true,coverLetter:true,status:true,createdAt:true,history:true,opportunity:{select:{title:true,slug:true}},document:{select:{id:true,originalName:true}}}});
 return json({items:items.slice(0,30),nextCursor:items.length>30?items[29].id:null});
}
export async function PATCH(req:Request){
 if(!applicantSameOrigin(req))return json({error:'Invalid origin'},403);
 const user=await employerFromRequest(req);if(!user)return json({error:'Unauthorized'},401);
 try{const body=await req.json();await changeApplicationStage(db,user.id,String(body.id||''),String(body.status||''));return json({success:true});}
 catch(e){return json({error:e instanceof Error?e.message:'Request failed'},400);}
}
