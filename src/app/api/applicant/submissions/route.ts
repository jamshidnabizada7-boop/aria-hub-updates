import {NextResponse} from 'next/server';import {db} from '@/lib/db';
import {applicantEnabled,applicantFromRequest} from '@/lib/applicant-auth';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {submitEmployerApplication} from '@/lib/employers/applications';import {allowDurable} from '@/lib/security/durable-rate-limit';
export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
async function owner(req:Request){if(!applicantEnabled())return null;return applicantFromRequest(req);}
export async function GET(req:Request){
 const user=await owner(req);if(!user)return json({error:'Unauthorized'},401);
 const items=await db.employerApplication.findMany({where:{applicantProfile:{userId:user.id}},select:{id:true,status:true,history:true,createdAt:true,withdrawnAt:true,document:{select:{originalName:true}},opportunity:{select:{title:true,slug:true}},organization:{select:{name:true}}},orderBy:{createdAt:'desc'},take:100});
 return json({items});
}
export async function POST(req:Request){
 if(!applicantSameOrigin(req))return json({error:'Invalid origin'},403);
 const user=await owner(req);if(!user)return json({error:'Unauthorized'},401);
 if(Number(req.headers.get('content-length')||0)>16000)return json({error:'Request too large'},413);
 if(!await allowDurable(db,'native-apply',[user.id],20,3600000))return json({error:'Try again later'},429);
 try{return json({success:true,...await submitEmployerApplication(db,user.id,await req.json())});}
 catch(e){return json({error:e instanceof Error?e.message:'Application failed'},400);}
}
export async function PATCH(req:Request){
 if(!applicantSameOrigin(req))return json({error:'Invalid origin'},403);
 const user=await owner(req);if(!user)return json({error:'Unauthorized'},401);
 const body=await req.json().catch(()=>null);if(!body?.id)return json({error:'Invalid request'},400);
 // Withdrawing hides all shared contact/CV content from the employer immediately.
 const changed=await db.employerApplication.updateMany({where:{id:String(body.id),applicantProfile:{userId:user.id},withdrawnAt:null},data:{withdrawnAt:new Date(),status:'withdrawn',documentId:null,coverLetter:'',email:'',name:''}});
 return json({success:changed.count===1},changed.count?200:404);
}
