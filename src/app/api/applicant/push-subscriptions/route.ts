import {db} from '@/lib/db';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {notificationAccount,applicantResponse} from '@/lib/applicants/notification-service';
import {safePushSubscription,sealChannel,endpointHash,enabledChannelCrypto} from '@/lib/applicants/channel-security';
import {allowDurable} from '@/lib/security/durable-rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
const enabled=()=>process.env.APPLICANT_PUSH_SUBSCRIPTIONS_ENABLED==='true'&&enabledChannelCrypto();
export async function GET(req:Request){
 const a=await notificationAccount(req);if(!a)return applicantResponse({error:'unauthorized'},401);
 const count=await db.applicantPushSubscription.count({where:{applicantProfileId:a.profile.id,disabledAt:null}});
 return applicantResponse({available:enabled()&&/^[A-Za-z0-9_-]{80,128}$/.test(process.env.APPLICANT_VAPID_PUBLIC_KEY||''),
  publicKey:enabled()?process.env.APPLICANT_VAPID_PUBLIC_KEY||null:null,
  activeSubscriptions:count});
}
export async function POST(req:Request){
 if(!applicantSameOrigin(req))return applicantResponse({error:'invalid_origin'},403);
 if(!enabled())return applicantResponse({error:'push_unavailable'},503);
 try{
  const a=await notificationAccount(req);if(!a?.emailVerified)return applicantResponse({error:'unauthorized'},401);
  if(Number(req.headers.get('content-length')||0)>4500)return applicantResponse({error:'payload_too_large'},413);
  if(!(await allowDurable(db,'applicant-push-subscribe',[a.profile.userId],12,86400000)))return applicantResponse({error:'rate_limited'},429);
  const consent=await db.applicantNotificationPreference.findUnique({where:{applicantProfileId:a.profile.id}});
  if(!consent?.pushEnabled)return applicantResponse({error:'push_consent_required'},403);
  const payload=await req.json().catch(()=>null);
  let sub:ReturnType<typeof safePushSubscription>;
  try{sub=safePushSubscription(payload);}catch{return applicantResponse({error:'invalid_subscription'},400);}
  const hash=endpointHash(sub.endpoint);
  const exists=await db.applicantPushSubscription.findUnique({where:{endpointHash:hash}});
  if(exists&&exists.applicantProfileId!==a.profile.id)return applicantResponse({error:'subscription_already_registered'},409);
  const encrypted=sealChannel(JSON.stringify(sub),a.profile.id,'push');
  if(exists)await db.applicantPushSubscription.update({where:{id:exists.id},data:{encryptedSubscription:encrypted,consentedAt:new Date(),disabledAt:null}});
  else {
   if(await db.applicantPushSubscription.count({where:{applicantProfileId:a.profile.id,disabledAt:null}})>=5)
    return applicantResponse({error:'subscription_limit'},409);
   await db.applicantPushSubscription.create({data:{applicantProfileId:a.profile.id,endpointHash:hash,encryptedSubscription:encrypted}});
  }
  return applicantResponse({success:true},201);
 }catch{return applicantResponse({error:'subscription_failed'},503);}
}
export async function DELETE(req:Request){
 if(!applicantSameOrigin(req))return applicantResponse({error:'invalid_origin'},403);
 try{
  const a=await notificationAccount(req);if(!a)return applicantResponse({error:'unauthorized'},401);
  const raw=await req.json().catch(()=>null);const uri=typeof raw?.endpoint==='string'?raw.endpoint:'';
  if(!uri||uri.length>2048)return applicantResponse({error:'invalid_subscription'},400);
  const changed=await db.applicantPushSubscription.updateMany({where:{applicantProfileId:a.profile.id,endpointHash:endpointHash(uri),disabledAt:null},data:{disabledAt:new Date()}});
  return applicantResponse({success:true,changed:changed.count});
 }catch{return applicantResponse({error:'unsubscription_failed'},503);}
}
