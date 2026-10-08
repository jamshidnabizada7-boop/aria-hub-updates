import 'server-only';
import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';

function key():Buffer{
 const raw=process.env.APPLICANT_CHANNEL_ENCRYPTION_KEY||'';
 if(!/^[a-f0-9]{64}$/i.test(raw))throw Error('applicant_channel_key_unavailable');
 return Buffer.from(raw,'hex');
}
/** Domain-separated authenticated encryption for endpoints and phone numbers. */
export function sealChannel(value:string,owner:string,channel:'push'|'whatsapp'):string{
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
 cipher.setAAD(Buffer.from('aria-applicant:'+owner+':'+channel));
 const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),data.toString('base64url')].join('.');
}
export function openChannel(sealed:string,owner:string,channel:'push'|'whatsapp'):string{
 const parts=sealed.split('.');if(parts.length!==4||parts[0]!=='v1')throw Error('invalid_secret');
 const decrypt=createDecipheriv('aes-256-gcm',key(),Buffer.from(parts[1],'base64url'));
 decrypt.setAAD(Buffer.from('aria-applicant:'+owner+':'+channel));
 decrypt.setAuthTag(Buffer.from(parts[2],'base64url'));
 return Buffer.concat([decrypt.update(Buffer.from(parts[3],'base64url')),decrypt.final()]).toString('utf8');
}
export const endpointHash=(endpoint:string)=>createHash('sha256').update(endpoint).digest('hex');
export const phoneDigits=z.string().regex(/^\+[1-9]\d{7,14}$/);
export const WhatsAppNumber=phoneDigits;
export const PushSubscriptionSchema=z.object({
 endpoint:z.string().url().max(2048),
 expirationTime:z.number().nullable().optional(),
 keys:z.object({p256dh:z.string().regex(/^[A-Za-z0-9_-]{80,128}$/),
 auth:z.string().regex(/^[A-Za-z0-9_-]{16,32}$/)}).strict(),
}).strict();
export function safePushSubscription(value:unknown){
 const parsed=PushSubscriptionSchema.safeParse(value);
 if(!parsed.success)throw Error('invalid_subscription');
 const uri=new URL(parsed.data.endpoint);
 if(uri.protocol!=='https:'||uri.port||uri.username||uri.password||
  !['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','push.services.mozilla.com'].includes(uri.hostname.toLowerCase()))
  throw Error('untrusted_push_endpoint');
 return parsed.data;
}
export function otpHash(owner:string,phone:string,code:string):string{
 return createHmac('sha256',key()).update('verify-whatsapp:'+owner+':'+phone+':'+code).digest('hex');
}
export function matchOtpHash(expected:string,owner:string,phone:string,code:string):boolean{
 if(!/^[a-f0-9]{64}$/.test(expected)||!/^\d{6}$/.test(code))return false;
 const actual=otpHash(owner,phone,code);
 return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(actual,'hex'));
}
export const enabledChannelCrypto=()=>/^[a-f0-9]{64}$/i.test(process.env.APPLICANT_CHANNEL_ENCRYPTION_KEY||'');
export function newOtp():string{return String(randomBytes(4).readUInt32BE(0)%1000000).padStart(6,'0');}
