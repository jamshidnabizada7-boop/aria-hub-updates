import 'server-only';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {db} from '@/lib/db';
import {openChannel,WhatsAppNumber} from './channel-security';

export const newInboundChallenge=()=>randomBytes(24).toString('hex');
export const inboundChallengeHash=(value:string)=>'inbound:'+createHash('sha256').update(value).digest('hex');
export function whatsappLookupHash(phone:string){
 const key=process.env.APPLICANT_CHANNEL_ENCRYPTION_KEY||'';
 if(!/^[a-f0-9]{64}$/i.test(key))throw Error('applicant_channel_key_unavailable');
 return createHmac('sha256',Buffer.from(key,'hex')).update('whatsapp-phone-lookup:'+phone).digest('hex');
}
export function validWhatsAppSignature(raw:Uint8Array,signature:string|null,secret:string){
 if(!secret||!/^sha256=[a-f0-9]{64}$/.test(signature||''))return false;
 const expected=createHmac('sha256',secret).update(raw).digest();
 return timingSafeEqual(expected,Buffer.from(signature!.slice(7),'hex'));
}
type InboundMessage={from:string;id:string;timestamp:string;type:string;text?:{body:string}};
/** Payload allowlist: no chat history, contact names or message bodies are
 * logged or stored. Unlinked contacts and unrelated business accounts ignored.
 */
export function eligibleInboundMessages(value:unknown,now=new Date()):InboundMessage[]{
 const payload=value as {object?:string;entry?:Array<{id?:string;changes?:Array<{field?:string;value?:{metadata?:{phone_number_id?:string};messages?:InboundMessage[]}}>}>};
 if(payload?.object!=='whatsapp_business_account'||!Array.isArray(payload.entry))return [];
 const result:InboundMessage[]=[];
 for(const entry of payload.entry.slice(0,20)){
  if(entry.id!==process.env.WHATSAPP_BUSINESS_ACCOUNT_ID)continue;
  for(const change of (Array.isArray(entry.changes)?entry.changes:[]).slice(0,20)){
   if(change.field!=='messages'||change.value?.metadata?.phone_number_id!==process.env.WHATSAPP_PHONE_NUMBER_ID)continue;
   for(const m of (Array.isArray(change.value?.messages)?change.value.messages:[]).slice(0,100)){
    if(!m||!WhatsAppNumber.safeParse('+'+m.from).success||typeof m.id!=='string'||!m.id.startsWith('wamid.')||m.id.length>512||!/^\d{10,12}$/.test(String(m.timestamp)))continue;
    const stamp=Number(m.timestamp)*1000;
    // Old, replayed events cannot open a new free window. No future events.
    if(!Number.isFinite(stamp)||stamp>now.getTime()||now.getTime()-stamp>=23*3600000+55*60000)continue;
    result.push(m);
   }
  }
 }
 return result;
}
export async function processWhatsAppInbound(payload:unknown){
 for(const message of eligibleInboundMessages(payload)){
  const phone='+'+message.from,phoneLookupHash=whatsappLookupHash(phone);
  const contact=await db.applicantWhatsAppContact.findUnique({where:{phoneLookupHash},include:{applicantProfile:{include:{user:{select:{emailVerified:true,disabled:true}}}}}});
  if(!contact||contact.applicantProfile.user.disabled||!contact.applicantProfile.user.emailVerified)continue;
  const stamp=new Date(Number(message.timestamp)*1000);
  const text=message.type==='text'&&typeof message.text?.body==='string'?message.text.body.trim():'';
  if(/^(STOP|UNSUBSCRIBE|لغو|بند)$/iu.test(text)&&stamp.getTime()>=(contact.consentedAt||contact.updatedAt).getTime()-1000){
   await db.$transaction([
    db.applicantWhatsAppContact.updateMany({where:{id:contact.id},data:{consentedAt:null,verifyHash:null,verifyExpiresAt:null,lastInboundAt:null}}),
    db.applicantNotificationPreference.updateMany({where:{applicantProfileId:contact.applicantProfileId},data:{whatsappEnabled:false}}),
    db.applicantChannelDelivery.updateMany({where:{channel:'whatsapp',status:'pending',targetId:contact.id},data:{status:'suppressed',errorCode:'consent_disabled'}})
   ]);continue;
  }
  const challenge=/^ARIA VERIFY ([a-f0-9]{48})$/.exec(text)?.[1];
  if(challenge&&contact.verifyHash===inboundChallengeHash(challenge)&&contact.verifyExpiresAt&&contact.verifyExpiresAt>new Date()&&stamp.getTime()>=contact.updatedAt.getTime()-1000){
   if(openChannel(contact.encryptedNumber,contact.applicantProfileId,'whatsapp')!==phone)continue;
   await db.$transaction(async tx=>{
    const result=await tx.applicantWhatsAppContact.updateMany({where:{id:contact.id,verifyHash:contact.verifyHash,verifyExpiresAt:{gt:new Date()},verifiedAt:null},
      data:{verifiedAt:new Date(),consentedAt:new Date(),verifyHash:null,verifyExpiresAt:null,lastInboundAt:stamp}});
    if(result.count)await tx.applicantNotificationPreference.upsert({where:{applicantProfileId:contact.applicantProfileId},create:{applicantProfileId:contact.applicantProfileId,whatsappEnabled:true},update:{whatsappEnabled:true}});
   });
  }else if(contact.verifiedAt&&contact.consentedAt){
   await db.applicantWhatsAppContact.updateMany({where:{id:contact.id,consentedAt:{not:null},OR:[{lastInboundAt:null},{lastInboundAt:{lt:stamp}}]},data:{lastInboundAt:stamp}});
  }
 }
}
