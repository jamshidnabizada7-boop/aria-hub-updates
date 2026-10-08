import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {employerFromRequest} from '@/lib/employer-auth';
import {requireMembership} from '@/lib/employers/membership';
export const runtime='nodejs';export const dynamic='force-dynamic';
const respond=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(req:Request){
 try{
  const employer=await employerFromRequest(req);if(!employer)return respond({error:'unauthorized'},401);
  const org=new URL(req.url).searchParams.get('organizationId');
  if(!org||org.length>100||!/^[a-z0-9_-]+$/i.test(org))return respond({error:'invalid_organization'},400);
  if(!(await requireMembership(db,employer.id,org,'viewer')))return respond({error:'forbidden'},403);
  const now=new Date(),soon=new Date(now.getTime()+7*86400000);
  const where={organizationId:org,sourceName:'Employer'} as const;
  const [totals,expiringSoon]=await Promise.all([
   db.opportunity.groupBy({by:['status'],where,_count:{_all:true}}),
   db.opportunity.count({where:{...where,status:'published',deadline:{gte:now,lte:soon}}})
  ]);
  const by=Object.fromEntries(totals.map(r=>[r.status,r._count._all]));
  return respond({total:totals.reduce((sum,row)=>sum+row._count._all,0),
   published:by.published||0,pending:by.draft||0,closed:(by.expired||0)+(by.archived||0),
   expiringSoon,scope:'authorized_organization',doesNotRepresentApplicantSubmissions:true});
 }catch{return respond({error:'analytics_unavailable'},503);}
}
