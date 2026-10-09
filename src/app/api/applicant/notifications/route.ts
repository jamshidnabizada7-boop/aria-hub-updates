import {db} from '@/lib/db';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {applicantResponse,notificationAccount,validId} from '@/lib/applicants/notification-service';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{
  const owner=await notificationAccount(req);if(!owner)return applicantResponse({error:'unauthorized_or_unavailable'},401);
  const params=new URL(req.url).searchParams;
  const cursor=params.get('cursor')||undefined;
  if(cursor&&!validId(cursor))return applicantResponse({error:'invalid_cursor'},400);
  const take=20;
  const [items,unread]=await Promise.all([
   db.applicantNotification.findMany({
    where:{applicantProfileId:owner.profile.id,archivedAt:null},orderBy:[{createdAt:'desc'},{id:'desc'}],take:take+1,
    ...(cursor?{cursor:{id:cursor},skip:1}:{}),
    select:{id:true,createdAt:true,readAt:true,evidence:true,
      savedSearch:{select:{id:true,name:true}},
      opportunity:{select:{id:true,slug:true,title:true,titleI18n:true,organization:true,deadline:true,status:true}}
    }
   }),
   db.applicantNotification.count({where:{applicantProfileId:owner.profile.id,readAt:null,archivedAt:null}})
  ]);
  const nextCursor=items.length>take?items[take-1]?.id:null;
  return applicantResponse({items:items.slice(0,take).map(n=>({
   id:n.id,createdAt:n.createdAt,readAt:n.readAt,evidence:n.evidence,
   searchName:n.savedSearch.name,slug:n.opportunity.slug,
   title:n.opportunity.title,titleI18n:n.opportunity.titleI18n,
   organization:n.opportunity.organization,deadline:n.opportunity.deadline,
   available:n.opportunity.status==='published'&&(!n.opportunity.deadline||n.opportunity.deadline>new Date())
  })),unread,nextCursor});
 }catch{return applicantResponse({error:'request_failed'},500);}
}
export async function PATCH(req:Request){
 if(!applicantSameOrigin(req))return applicantResponse({error:'invalid_origin'},403);
 try{
  const owner=await notificationAccount(req);if(!owner)return applicantResponse({error:'unauthorized_or_unavailable'},401);
  if(Number(req.headers.get('content-length')||0)>2048)return applicantResponse({error:'payload_too_large'},413);
  const data=await req.json().catch(()=>null);
  if(!data||typeof data!=='object')return applicantResponse({error:'invalid_request'},400);
  if(data.all===true){
   await db.applicantNotification.updateMany({where:{applicantProfileId:owner.profile.id,readAt:null},data:{readAt:new Date()}});
  }else if(validId(String(data.id||''))){
   const changed=await db.applicantNotification.updateMany({where:{id:String(data.id),applicantProfileId:owner.profile.id},data:data.archive===true?{archivedAt:new Date(),readAt:new Date()}:{readAt:data.unread===true?null:new Date()}});
   if(!changed.count)return applicantResponse({error:'not_found'},404);
  }else return applicantResponse({error:'invalid_request'},400);
  return applicantResponse({success:true});
 }catch{return applicantResponse({error:'request_failed'},500);}
}
