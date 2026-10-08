import {z} from 'zod';
import {db} from '@/lib/db';
import {applicantSameOrigin} from '@/lib/applicant-origin';
import {notificationAccount,applicantResponse} from '@/lib/applicants/notification-service';
import {WhatsAppNumber,enabledChannelCrypto,sealChannel,openChannel,otpHash,matchOtpHash,newOtp} from '@/lib/applicants/channel-security';
import {whatsappConfigured,sendWhatsAppTemplate} from '@/lib/applicants/channel-providers';
import {allowDurable} from '@/lib/security/durable-rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
const available=()=>process.env.APPLICANT_WHATSAPP_VERIFICATION_ENABLED==='true'&&enabledChannelCrypto()&&whatsappConfigured();
const Request=z.discriminatedUnion('action',[
 z.object({action:z.literal('request'),phone:WhatsAppNumber,consent:z.literal(true)}).strict(),
 z.object({action:z.literal('confirm'),code:z.string().regex(/^\d{6}$/)}).strict()
]);
export async function GET(req:Request){
 const a=await notificationAccount(req);if(!a)return applicantResponse({error:'unauthorized'},401);
 const contact=await db.applicantWhatsAppContact.findUnique({where:{applicantProfileId:a.profile.id},
  select:{verifiedAt:true,consentedAt:true}});
 return applicantResponse({available:available(),verified:!!contact?.verifiedAt&&!!contact?.consentedAt});
}
export async function POST(req:Request){
 if(!applicantSameOrigin(req))return applicantResponse({error:'invalid_origin'},403);
 if(!available())return applicantResponse({error:'whatsapp_verification_unavailable'},503);
 try{
  const a=await notificationAccount(req);if(!a?.emailVerified)return applicantResponse({error:'unauthorized'},401);
  if(Number(req.headers.get('content-length')||0)>2048)return applicantResponse({error:'payload_too_large'},413);
  if(!(await allowDurable(db,'applicant-whatsapp-verify',[a.profile.userId],6,86400000)))
   return applicantResponse({error:'rate_limited'},429);
  const parsed=Request.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return applicantResponse({error:'invalid_request'},400);
  const data=parsed.data;
  if(data.action==='request'){
   const code=newOtp();
   const encrypted=sealChannel(data.phone,a.profile.id,'whatsapp');
   // No fallback to a free-form WhatsApp message. An approved template is
   // required and the recipient must have explicitly requested verification.
   await sendWhatsAppTemplate(data.phone,process.env.WHATSAPP_VERIFY_TEMPLATE!,'en',[code]);
   await db.$transaction(async tx=>{
    await tx.applicantWhatsAppContact.upsert({
     where:{applicantProfileId:a.profile.id},
     create:{applicantProfileId:a.profile.id,phoneHash:otpHash(a.profile.id,data.phone,'phone'),
      encryptedNumber:encrypted,verifyHash:otpHash(a.profile.id,data.phone,code),
      verifyExpiresAt:new Date(Date.now()+10*60000),verifyAttempts:0},
     update:{phoneHash:otpHash(a.profile.id,data.phone,'phone'),
      encryptedNumber:encrypted,verifyHash:otpHash(a.profile.id,data.phone,code),
      verifyExpiresAt:new Date(Date.now()+10*60000),verifyAttempts:0,
      verifiedAt:null,consentedAt:null}
    });
    await tx.applicantNotificationPreference.upsert({
     where:{applicantProfileId:a.profile.id},
     create:{applicantProfileId:a.profile.id,whatsappEnabled:false},
     update:{whatsappEnabled:false}
    });
   });
   return applicantResponse({verificationSent:true});
  }
  const contact=await db.applicantWhatsAppContact.findUnique({where:{applicantProfileId:a.profile.id}});
  if(!contact||!contact.verifyHash||!contact.verifyExpiresAt||contact.verifyExpiresAt<=new Date()||contact.verifyAttempts>=5)
   return applicantResponse({error:'verification_expired'},403);
  const phone=openChannel(contact.encryptedNumber,a.profile.id,'whatsapp');
  if(!matchOtpHash(contact.verifyHash,a.profile.id,phone,data.code)){
   await db.applicantWhatsAppContact.updateMany({where:{id:contact.id,verifyHash:contact.verifyHash,verifyAttempts:{lt:5}},data:{verifyAttempts:{increment:1}}});
   return applicantResponse({error:'invalid_verification_code'},403);
  }
  const success=await db.$transaction(async tx=>{
   const updated=await tx.applicantWhatsAppContact.updateMany({
    where:{id:contact.id,applicantProfileId:a.profile.id,verifyHash:contact.verifyHash,verifyAttempts:{lt:5},
     verifyExpiresAt:{gt:new Date()},verifiedAt:null},
    data:{verifiedAt:new Date(),consentedAt:new Date(),verifyHash:null,verifyExpiresAt:null}
   });
   if(!updated.count)return false;
   await tx.applicantNotificationPreference.upsert({where:{applicantProfileId:a.profile.id},
    create:{applicantProfileId:a.profile.id,whatsappEnabled:true},
    update:{whatsappEnabled:true}});
   return true;
  });
  return success?applicantResponse({verified:true}):applicantResponse({error:'verification_expired'},409);
 }catch{return applicantResponse({error:'verification_unavailable'},503);}
}
export async function DELETE(req:Request){
 if(!applicantSameOrigin(req))return applicantResponse({error:'invalid_origin'},403);
 try{
  const a=await notificationAccount(req);if(!a)return applicantResponse({error:'unauthorized'},401);
  await db.$transaction([
   db.applicantWhatsAppContact.deleteMany({where:{applicantProfileId:a.profile.id}}),
   db.applicantNotificationPreference.updateMany({where:{applicantProfileId:a.profile.id},data:{whatsappEnabled:false}}),
   db.applicantChannelDelivery.updateMany({where:{channel:'whatsapp',status:{in:['pending','processing']},
    notification:{applicantProfileId:a.profile.id}},data:{status:'suppressed',claimedAt:null,errorCode:'consent_disabled'}})
  ]);
  return applicantResponse({success:true});
 }catch{return applicantResponse({error:'whatsapp_optout_failed'},503);}
}
