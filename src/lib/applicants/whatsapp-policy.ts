import 'server-only';
/** Zero spend is the default. An explicit budget authorization is required
 * before any template transport is enabled. Free service replies never use
 * templates, and require a recent, signed incoming message from the recipient.
 */
export const whatsappTemplateSendsAllowed=()=>process.env.WHATSAPP_ZERO_SPEND==='false'
 && process.env.WHATSAPP_BILLABLE_SENDS_ENABLED==='true';
export const whatsappSenderConfigured=()=>/^[0-9]{7,25}$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID||'')
 && !!process.env.WHATSAPP_META_ACCESS_TOKEN;
export const whatsappInboundConfigured=()=>process.env.APPLICANT_WHATSAPP_INBOUND_ENABLED==='true'
 && whatsappSenderConfigured() && /^[0-9]{7,25}$/.test(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID||'')
 && /^[1-9]\d{7,14}$/.test(process.env.WHATSAPP_BUSINESS_NUMBER||'')
 && (process.env.WHATSAPP_WEBHOOK_APP_SECRET||'').length>=24
 && (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN||'').length>=32;
export const whatsappFreeServiceConfigured=()=>process.env.APPLICANT_WHATSAPP_DELIVERY_ENABLED==='true'
 && whatsappInboundConfigured();
/** Leave a five-minute margin for clock skew/network delay at the boundary. */
export function freeWhatsAppWindow(lastInbound:Date|null,now=new Date()):boolean{
 if(!lastInbound)return false;
 const age=now.getTime()-lastInbound.getTime();
 return age>=0 && age<23*3600000+55*60000;
}
/** A lost response may hide an accepted send. Never replay automatically. */
export function channelFailureStatus(channel:string,code:string,attempts:number){
 if(channel==='whatsapp'&&code==='whatsapp_delivery_unknown')return 'review';
 if(/consent|revoked|not_permitted|invalid_channel|unapproved|unsafe_link|subscription_expired|spend_not_authorized/.test(code)||attempts>=5)return 'suppressed';
 return 'pending';
}
