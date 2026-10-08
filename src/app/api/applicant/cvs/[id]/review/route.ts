import {db} from '@/lib/db';
import {applicantEnabled,applicantFromRequest} from '@/lib/applicant-auth';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {ExtractedCVSchema,CVReviewSchema,type CVField} from '@/lib/applicants/cv-extraction-proposals';
import {NextResponse} from 'next/server';
import {approveCVReview} from '@/lib/applicants/cv-review-service';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const answer=(d:object,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function owner(req:Request){
 if(!applicantEnabled()||process.env.CLOUD_CV_STORAGE_ENABLED!=='true'||process.env.CV_OCR_ENABLED!=='true')return null;
 const u=await applicantFromRequest(req);if(!u)return null;
 return db.applicantProfile.findUnique({where:{userId:u.id},select:{id:true}});
}
export async function GET(req:Request,{params}:Ctx){
 try{
  const user=await owner(req);if(!user)return answer({error:'unauthorized_or_disabled'},401);
  const {id}=await params;if(!/^c[a-z0-9]{10,40}$/.test(id))return answer({error:'not_found'},404);
  const document=await db.applicantDocument.findFirst({where:{id,applicantProfileId:user.id},
   select:{id:true,originalName:true,sha256:true,status:true,processingError:true,extraction:true,reviewedAt:true}});
  if(!document)return answer({error:'not_found'},404);
  const proposed=ExtractedCVSchema.safeParse(document.extraction);
  return answer({document:{id:document.id,originalName:document.originalName,status:document.status,
   processingError:document.processingError,sourceSha256:document.sha256,reviewedAt:document.reviewedAt,
   proposal:proposed.success?proposed.data:null}});
 }catch{return answer({error:'request_failed'},500);}
}
export async function POST(req:Request,{params}:Ctx){
 if(!applicantSameOrigin(req))return answer({error:'invalid_origin'},403);
 try{
  const user=await owner(req);if(!user)return answer({error:'unauthorized_or_disabled'},401);
  const {id}=await params;if(!/^c[a-z0-9]{10,40}$/.test(id))return answer({error:'not_found'},404);
  if(Number(req.headers.get('content-length')||0)>12000)return answer({error:'payload_too_large'},413);
  const parsed=CVReviewSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return answer({error:'invalid_review'},400);
  const review=parsed.data;
  const outcome=await approveCVReview(db,user.id,id,review);
  if(outcome==='saved')return answer({success:true,provenance:'USER_VERIFIED',applicationsSubmitted:false});
  return answer({error:outcome},outcome==='nothing_to_save'?409:409);
 }catch{return answer({error:'request_failed'},500);}
}
