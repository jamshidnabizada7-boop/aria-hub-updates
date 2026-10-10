import {db} from '@/lib/db';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {notificationAccount,applicantResponse} from '@/lib/applicants/notification-service';
import {openChannel,endpointHash} from '@/lib/applicants/channel-security';
import {pushConfigured,deliverPushToGateway,PushDeliveryError} from '@/lib/applicants/channel-providers';
import {allowDurable} from '@/lib/security/durable-rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
/** Explicit device-owner test. Never delivers to a client-supplied destination. */
export async function POST(req:Request){
 if(!applicantSameOrigin(req))return applicantResponse({error:'invalid_origin'},403);
 if(!pushConfigured())return applicantResponse({error:'push_unavailable'},503);
 try{
  const account=await notificationAccount(req);if(!account?.emailVerified)return applicantResponse({error:'unauthorized'},401);
  if(Number(req.headers.get('content-length')||0)>2500)return applicantResponse({error:'payload_too_large'},413);
  const data=await req.json().catch(()=>null);
  if(typeof data?.endpoint!=='string'||data.endpoint.length>2048)return applicantResponse({error:'invalid_subscription'},400);
  const [pref,subscription]=await Promise.all([
   db.applicantNotificationPreference.findUnique({where:{applicantProfileId:account.profile.id}}),
   db.applicantPushSubscription.findFirst({where:{applicantProfileId:account.profile.id,endpointHash:endpointHash(data.endpoint),disabledAt:null}})
  ]);
  if(!pref?.pushEnabled||!subscription)return applicantResponse({error:'push_consent_required'},403);
  if(!await allowDurable(db,'applicant-push-test',[account.profile.userId],3,3600000))return applicantResponse({error:'rate_limited'},429);
  const lang=account.profile.preferredLocale==='fa'?'fa':account.profile.preferredLocale==='ps'?'ps':'en';
  const body={en:'Notifications are working on this device.',fa:'اعلان‌ها در این دستگاه فعال هستند.',ps:'په دې وسیله خبرتیاوې کار کوي.'}[lang];
  try{
   await deliverPushToGateway(JSON.parse(openChannel(subscription.encryptedSubscription,account.profile.id,'push')),
    {title:'ARIA HUB',body,url:'https://www.myariahub.com/'+lang+'/portal/notifications'},'device-test-'+crypto.randomUUID());
  }catch(error){
   if(error instanceof PushDeliveryError&&error.code==='push_subscription_expired'){
    await db.applicantPushSubscription.updateMany({where:{id:subscription.id,applicantProfileId:account.profile.id},data:{disabledAt:new Date()}});
    return applicantResponse({error:'push_subscription_expired'},410);
   }
   return applicantResponse({error:'push_delivery_failed'},503);
  }
  return applicantResponse({accepted:true});
 }catch{return applicantResponse({error:'request_failed'},503);}
}
