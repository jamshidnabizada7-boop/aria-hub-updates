/**
 * Dedicated applicant channel outbox. NO --send means read-only dry run.
 * No scheduling, provider calls or production activation in candidate CI.
 * Push uses direct RFC8291/VAPID delivery or an authenticated gateway;
 * WhatsApp requires an approved Meta template and verified recipient consent.
 */
import {PrismaClient} from '@prisma/client';
import {openChannel} from '../src/lib/applicants/channel-security';
import {sendWhatsAppTemplate,sendWhatsAppServiceAlert,deliverPushToGateway,pushConfigured,whatsappConfigured} from '../src/lib/applicants/channel-providers';
import {whatsappFreeServiceConfigured,channelFailureStatus} from '../src/lib/applicants/whatsapp-policy';
import {safeLocale} from '../src/lib/applicants/notification-service';
const db=new PrismaClient(),SEND=process.argv.includes('--send');
const enabled=()=>process.env.APPLICANT_AUTH_ENABLED==='true'&&
 process.env.APPLICANT_NOTIFICATIONS_ENABLED==='true'&&
 process.env.APPLICANT_CHANNEL_WORKER_ENABLED==='true';
function publicLink(slug:string,lang:'fa'|'ps'|'en'){
 const base=new URL(process.env.PUBLIC_SITE_URL||'https://www.myariahub.com');
 if(base.protocol!=='https:'||!['www.myariahub.com','myariahub.com'].includes(base.hostname))throw Error('unsafe_link_base');
 return new URL('/'+lang+'/opportunities/'+encodeURIComponent(slug),base).toString();
}
async function main(){
 if(SEND&&!enabled())throw Error('applicant_channels_disabled');
 if(SEND&&!pushConfigured()&&!whatsappConfigured())throw Error('no_channel_provider_ready');
 const stale=new Date(Date.now()-15*60000);
 if(SEND){
  await db.applicantChannelDelivery.updateMany({where:{status:'processing',channel:'push',claimedAt:{lt:stale}},
    data:{status:'pending',claimedAt:null}});
  await db.applicantChannelDelivery.updateMany({where:{status:'processing',channel:'whatsapp',claimedAt:{lt:stale}},
    data:{status:'review',errorCode:'whatsapp_delivery_unknown'}});
 }
 const rows=await db.applicantChannelDelivery.findMany({
  where:{status:'pending',nextAttemptAt:{lte:new Date()}},orderBy:[{createdAt:'asc'},{id:'asc'}],take:60,
  include:{notification:{include:{
   applicantProfile:{include:{user:{select:{disabled:true,emailVerified:true}},notificationPreference:true}},
   opportunity:{select:{slug:true,title:true,deadline:true,status:true}}
  }}}
 });
 let sent=0,suppressed=0,failed=0;
 for(const row of rows){
  if(!SEND)continue;
  const claimed=await db.applicantChannelDelivery.updateMany({where:{id:row.id,status:'pending'},
    data:{status:'processing',claimedAt:new Date()}});
  if(claimed.count!==1)continue;
  const note=row.notification,account=note.applicantProfile,pref=account.notificationPreference;
  let providerMessageId:string|null=null;
  try{
   const available=note.opportunity.status==='published'&&(!note.opportunity.deadline||note.opportunity.deadline>new Date());
   if(!available||account.user.disabled||!account.user.emailVerified||!pref)
    throw Error('delivery_not_permitted');
   const lang=safeLocale(account.preferredLocale);
   const link=publicLink(note.opportunity.slug,lang);
   const label=note.opportunity.title.slice(0,170);
   if(row.channel==='push'){
    if(!pref.pushEnabled||!pushConfigured())throw Error('push_consent_or_provider_disabled');
    const sub=await db.applicantPushSubscription.findFirst({where:{id:row.targetId,
     applicantProfileId:note.applicantProfileId,disabledAt:null}});
    if(!sub)throw Error('push_subscription_revoked');
    const parsed=JSON.parse(openChannel(sub.encryptedSubscription,note.applicantProfileId,'push'));
    await deliverPushToGateway(parsed,{title:'ARIA HUB',body:label,url:link},row.id);
   }else if(row.channel==='whatsapp'){
    if(!pref.whatsappEnabled||!whatsappConfigured())throw Error('whatsapp_consent_or_provider_disabled');
    const sub=await db.applicantWhatsAppContact.findFirst({where:{id:row.targetId,
     applicantProfileId:note.applicantProfileId,verifiedAt:{not:null},consentedAt:{not:null}}});
    if(!sub)throw Error('whatsapp_contact_revoked');
    const phone=openChannel(sub.encryptedNumber,note.applicantProfileId,'whatsapp');
    providerMessageId=whatsappFreeServiceConfigured()
     ?await sendWhatsAppServiceAlert(sub.id,note.applicantProfileId,phone,lang,label,link)
     :await sendWhatsAppTemplate(phone,process.env.WHATSAPP_MATCH_TEMPLATE!,lang,[label,link]);
   }else throw Error('invalid_channel');
   await db.applicantChannelDelivery.updateMany({where:{id:row.id,status:'processing'},
    data:{status:'sent',sentAt:new Date(),claimedAt:null,errorCode:null,providerMessageId}});
   sent++;
  }catch(e){
   const code=providerMessageId&&row.channel==='whatsapp'?'whatsapp_delivery_unknown':e instanceof Error?e.message:'delivery_failure';
   if(code==='push_subscription_expired')await db.applicantPushSubscription.updateMany({
    where:{id:row.targetId,applicantProfileId:note.applicantProfileId},data:{disabledAt:new Date()}});
   const attempts=row.attempts+1;
   const status=channelFailureStatus(row.channel,code,attempts);
   const windowClosed=code==='whatsapp_free_window_closed';
   await db.applicantChannelDelivery.updateMany({where:{id:row.id,status:'processing'},
    data:{status:windowClosed?'pending':status,
     attempts:windowClosed?row.attempts:attempts,claimedAt:null,errorCode:code.slice(0,120),providerMessageId,
     nextAttemptAt:new Date(Date.now()+(windowClosed?3600000:Math.min(12*3600000,Math.pow(2,attempts)*5*60000)))}});
   if(status==='suppressed')suppressed++;else failed++;
  }
 }
 console.log(JSON.stringify({mode:SEND?'send':'dry_run',pending:rows.length,sent,suppressed,failed,
  configured:{push:pushConfigured(),whatsapp:whatsappConfigured()}}));
}
main().catch(e=>{console.error('[applicant-channels] failure',e instanceof Error?e.name:'unknown');process.exitCode=1;}).finally(()=>db.$disconnect());
