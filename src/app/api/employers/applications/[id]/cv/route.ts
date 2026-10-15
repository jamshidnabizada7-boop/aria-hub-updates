import {db} from '@/lib/db';import {employerFromRequest} from '@/lib/employer-auth';import {requireMembership} from '@/lib/employers/membership';
import {fetchPrivateCV} from '@/lib/applicants/cv-private-storage';import {createHash} from 'node:crypto';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 const denied=()=>new Response('Document unavailable',{status:404,headers});
 try{
  const user=await employerFromRequest(req);if(!user)return denied();
  const {id}=await params;
  const row=await db.employerApplication.findUnique({where:{id},include:{document:true,applicantProfile:{select:{user:{select:{disabled:true}}}}}});
  if(!row||row.applicantProfile.user.disabled||row.withdrawnAt||!row.document||['deleting','storing'].includes(row.document.status)||row.document.applicantProfileId!==row.applicantProfileId||!await requireMembership(db,user.id,row.organizationId,'recruiter'))return denied();
  const bytes=await fetchPrivateCV(row.document.storageKey);
  if(createHash('sha256').update(bytes).digest('hex')!==row.document.sha256)return denied();
  // Recheck consent after the storage read so a concurrent withdrawal/deletion revokes this request.
  const still=await db.employerApplication.findFirst({where:{id,withdrawnAt:null,documentId:row.documentId,document:{status:{notIn:['deleting','storing']}}},select:{id:true}});
  if(!still||!await requireMembership(db,user.id,row.organizationId,'recruiter'))return denied();
  return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename=\"application-cv\"; filename*=UTF-8''"+encodeURIComponent(row.document.originalName.replace(/[\r\n]/g,'').slice(0,180)),'Content-Security-Policy':"default-src 'none'; sandbox"}});
 }catch{return denied();}
}
