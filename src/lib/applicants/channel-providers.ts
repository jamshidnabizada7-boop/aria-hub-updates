import 'server-only';
import webpush from 'web-push';
import {createHash} from 'node:crypto';
import {safePushSubscription} from './channel-security';
/** Network calls happen ONLY from the dedicated opt-in channel worker (or
 * a user-requested verification). Never invoke from import/translation/social.
 */
export const whatsappConfigured=()=>process.env.APPLICANT_WHATSAPP_DELIVERY_ENABLED==='true'
 && /^[0-9]{7,25}$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID||'')
 && !!process.env.WHATSAPP_META_ACCESS_TOKEN
 && /^[a-z0-9_]{3,80}$/i.test(process.env.WHATSAPP_MATCH_TEMPLATE||'')
 && /^[a-z0-9_]{3,80}$/i.test(process.env.WHATSAPP_VERIFY_TEMPLATE||'');
export const pushConfigured=()=>process.env.APPLICANT_PUSH_DELIVERY_ENABLED==='true'
 && (process.env.APPLICANT_PUSH_TRANSPORT==='direct'
  ? /^[A-Za-z0-9_-]{87}$/.test(process.env.APPLICANT_VAPID_PUBLIC_KEY||'')
    && /^[A-Za-z0-9_-]{43}$/.test(process.env.APPLICANT_VAPID_PRIVATE_KEY||'')
  : /^https:\/\//.test(process.env.APPLICANT_PUSH_GATEWAY_URL||'')
    && !!process.env.APPLICANT_PUSH_GATEWAY_TOKEN);

export class PushDeliveryError extends Error{
 constructor(public code:'push_subscription_expired'|'push_provider_rejected'){super(code);}
}
export function directPushOptions(idempotencyKey:string):webpush.RequestOptions{
 return {vapidDetails:{subject:'mailto:info@myariahub.com',
  publicKey:process.env.APPLICANT_VAPID_PUBLIC_KEY!,privateKey:process.env.APPLICANT_VAPID_PRIVATE_KEY!},
  TTL:3600,urgency:'normal',timeout:12000,
  topic:createHash('sha256').update(idempotencyKey).digest('base64url').slice(0,32)};
}

export async function sendWhatsAppTemplate(phone:string,template:string,locale:'en'|'fa'|'ps',variables:string[]){
 if(!whatsappConfigured())throw Error('whatsapp_provider_disabled');
 const lang={en:process.env.WHATSAPP_TEMPLATE_LANG_EN||'en_US',
   fa:process.env.WHATSAPP_TEMPLATE_LANG_FA||'fa',
   ps:process.env.WHATSAPP_TEMPLATE_LANG_PS||'ps'}[locale];
 // Template names/languages must be explicitly approved and configured.
 if(!/^[a-z0-9_]{3,80}$/i.test(template)||!/^[-A-Za-z_]{2,12}$/.test(lang))
   throw Error('unapproved_whatsapp_template');
 const endpoint='https://graph.facebook.com/v23.0/'+process.env.WHATSAPP_PHONE_NUMBER_ID+'/messages';
 const res=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+process.env.WHATSAPP_META_ACCESS_TOKEN,
   'Content-Type':'application/json'},body:JSON.stringify({
    messaging_product:'whatsapp',to:phone.slice(1),type:'template',
    template:{name:template,language:{code:lang},
     ...(variables.length?{components:[{type:'body',parameters:variables.map(text=>({type:'text',text:text.slice(0,220)}))}]}:{})}
   }),signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!res.ok)throw Error('whatsapp_provider_rejected');
 return true;
}
/** The configured gateway owns VAPID/ECE signing and TLS delivery. ARIA HUB
 * never fetches an applicant-provided URL directly (SSRF guard). The gateway
 * must honor the stable idempotency key and authenticate this server token.
 */
export async function deliverPushToGateway(subscription:unknown,payload:{title:string;body:string;url:string},idempotencyKey:string){
 if(!pushConfigured())throw Error('push_provider_disabled');
 const safe=safePushSubscription(subscription);
 if(process.env.APPLICANT_PUSH_TRANSPORT==='direct'){
  try{
   await webpush.sendNotification(safe,JSON.stringify(payload),directPushOptions(idempotencyKey));
   return true;
  }catch(error){
   const status=(error as {statusCode?:number}).statusCode;
   throw new PushDeliveryError(status===404||status===410?'push_subscription_expired':'push_provider_rejected');
  }
 }
 const url=new URL(process.env.APPLICANT_PUSH_GATEWAY_URL!);
 if(url.protocol!=='https:'||url.username||url.password||!url.hostname||url.hostname==='localhost')
   throw Error('push_gateway_invalid');
 const res=await fetch(url.toString(),{method:'POST',headers:{
  'Content-Type':'application/json','Authorization':'Bearer '+process.env.APPLICANT_PUSH_GATEWAY_TOKEN,
  'Idempotency-Key':idempotencyKey},
  body:JSON.stringify({subscription:safe,payload}),cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error('push_provider_rejected');
 return true;
}
