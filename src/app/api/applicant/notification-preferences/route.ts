import {db} from '@/lib/db';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {NotificationPrefsSchema,applicantResponse,notificationAccount,defaultNotificationPrefs} from '@/lib/applicants/notification-service';
import {allowDurable} from '@/lib/security/durable-rate-limit';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(req:Request){
 try{
  const owner=await notificationAccount(req);if(!owner)return applicantResponse({error:'unauthorized_or_unavailable'},401);
  const row=await db.applicantNotificationPreference.findUnique({where:{applicantProfileId:owner.profile.id}});
  return applicantResponse({preferences:row?{inAppEnabled:row.inAppEnabled,emailEnabled:row.emailEnabled,pushEnabled:row.pushEnabled,whatsappEnabled:row.whatsappEnabled,emailFrequency:row.emailFrequency}:defaultNotificationPrefs,emailVerified:owner.emailVerified});
 }catch{return applicantResponse({error:'request_failed'},500);}
}
export async function PUT(req:Request){
 if(!applicantSameOrigin(req))return applicantResponse({error:'invalid_origin'},403);
 try{
  const owner=await notificationAccount(req);if(!owner)return applicantResponse({error:'unauthorized_or_unavailable'},401);
  if(Number(req.headers.get('content-length')||0)>2048)return applicantResponse({error:'payload_too_large'},413);
  if(!(await allowDurable(db,'applicant-notification-pref',[owner.profile.userId],20,3600000)))return applicantResponse({error:'rate_limited'},429);
  const parsed=NotificationPrefsSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return applicantResponse({error:'invalid_preferences'},400);
  if(parsed.data.emailEnabled&&!owner.emailVerified)return applicantResponse({error:'verify_email_first'},403);
  if(parsed.data.whatsappEnabled){
   const contact=await db.applicantWhatsAppContact.findUnique({where:{applicantProfileId:owner.profile.id},
    select:{verifiedAt:true,consentedAt:true}});
   if(!contact?.verifiedAt||!contact.consentedAt)return applicantResponse({error:'whatsapp_verification_required'},403);
  }
  await db.$transaction(async tx=>{
   const data=parsed.data;
   await tx.applicantNotificationPreference.upsert({
    where:{applicantProfileId:owner.profile.id},
    create:{applicantProfileId:owner.profile.id,...data},
    update:data
   });
   if(!data.pushEnabled){
    await tx.applicantPushSubscription.updateMany({where:{applicantProfileId:owner.profile.id,disabledAt:null},
     data:{disabledAt:new Date()}});
    await tx.applicantChannelDelivery.updateMany({where:{channel:'push',status:{in:['pending','processing']},
     notification:{applicantProfileId:owner.profile.id}},data:{status:'suppressed',errorCode:'consent_disabled',claimedAt:null}});
   }
   if(!data.whatsappEnabled){
    await tx.applicantChannelDelivery.updateMany({where:{channel:'whatsapp',status:{in:['pending','processing']},
     notification:{applicantProfileId:owner.profile.id}},data:{status:'suppressed',errorCode:'consent_disabled',claimedAt:null}});
   }
   if(!data.emailEnabled){
    await tx.applicantEmailDelivery.updateMany({
     where:{status:{in:['pending','processing']},notification:{applicantProfileId:owner.profile.id}},
     data:{status:'suppressed',claimedAt:null,errorCode:'consent_disabled'}
    });
   }
  });
  return applicantResponse({preferences:parsed.data,emailVerified:owner.emailVerified});
 }catch{return applicantResponse({error:'request_failed'},500);}
}
