import {afterAll,expect,test} from 'bun:test';
import {createHmac} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {newApplicantSession,APPLICANT_COOKIE} from '../src/lib/applicant-auth';
import {freeWhatsAppWindow,channelFailureStatus} from '../src/lib/applicants/whatsapp-policy';
import {sendWhatsAppTemplate,sendWhatsAppServiceAlert} from '../src/lib/applicants/channel-providers';
import {validWhatsAppSignature,eligibleInboundMessages} from '../src/lib/applicants/whatsapp-inbound';
import {GET as webhookGet,POST as webhookPost} from '../src/app/api/webhooks/whatsapp/route';
import {POST as requestVerification,GET as contactGet,DELETE as optout} from '../src/app/api/applicant/whatsapp-contact/route';
const db=new PrismaClient(),owners:string[]=[];
const originalFetch=globalThis.fetch,originalEnv={...process.env};
Object.assign(process.env,{APPLICANT_AUTH_ENABLED:'true',APPLICANT_MATCHER_V3_ENABLED:'true',APPLICANT_NOTIFICATIONS_ENABLED:'true',
 APPLICANT_CHANNEL_ENCRYPTION_KEY:'c'.repeat(64),APPLICANT_WHATSAPP_INBOUND_ENABLED:'true',
 APPLICANT_WHATSAPP_VERIFICATION_ENABLED:'true',APPLICANT_WHATSAPP_DELIVERY_ENABLED:'true',
 WHATSAPP_BUSINESS_NUMBER:'93700876806',WHATSAPP_PHONE_NUMBER_ID:'123456789012',WHATSAPP_BUSINESS_ACCOUNT_ID:'123456789013',
 WHATSAPP_META_ACCESS_TOKEN:'fake-test-only',WHATSAPP_WEBHOOK_APP_SECRET:'d'.repeat(32),WHATSAPP_WEBHOOK_VERIFY_TOKEN:'e'.repeat(48),
 WHATSAPP_ZERO_SPEND:'true',WHATSAPP_BILLABLE_SENDS_ENABLED:'false'});
afterAll(async()=>{globalThis.fetch=originalFetch;if(owners.length)await db.user.deleteMany({where:{id:{in:owners}}});await db.$disconnect();for(const key of Object.keys(process.env)){if(!(key in originalEnv))delete process.env[key];}Object.assign(process.env,originalEnv);});
function accountReq(token:string,method='GET',body?:object){return new Request('http://localhost:3000/api/applicant/whatsapp-contact',{
 method,headers:{host:'localhost:3000',origin:'http://localhost:3000',cookie:APPLICANT_COOKIE+'='+token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});}
function payload(from:string,text:string,stamp=String(Math.floor(Date.now()/1000)),waba=process.env.WHATSAPP_BUSINESS_ACCOUNT_ID){return {object:'whatsapp_business_account',entry:[{id:waba,changes:[{field:'messages',value:{metadata:{phone_number_id:process.env.WHATSAPP_PHONE_NUMBER_ID},messages:[{id:'wamid.test-'+crypto.randomUUID(),from,timestamp:stamp,type:'text',text:{body:text}}]}}]}]};}
async function inbound(value:unknown,badSignature=false){const raw=JSON.stringify(value),sig='sha256='+createHmac('sha256',process.env.WHATSAPP_WEBHOOK_APP_SECRET!).update(raw).digest('hex');return webhookPost(new Request('https://www.myariahub.com/api/webhooks/whatsapp',{method:'POST',headers:{'x-hub-signature-256':badSignature?'sha256='+'0'.repeat(64):sig},body:raw}));}
test('zero spend blocks templates before any network call; free-window boundaries fail closed',async()=>{
 let calls=0;globalThis.fetch=Object.assign(async()=>{calls++;throw Error('must not send');},{preconnect:originalFetch.preconnect});
 await expect(sendWhatsAppTemplate('+93700123456','aria_match','en',['role','link'])).rejects.toThrow('whatsapp_spend_not_authorized');expect(calls).toBe(0);
 const now=new Date();expect(freeWhatsAppWindow(null,now)).toBe(false);expect(freeWhatsAppWindow(new Date(now.getTime()+1000),now)).toBe(false);
 expect(freeWhatsAppWindow(new Date(now.getTime()-23*3600000),now)).toBe(true);expect(freeWhatsAppWindow(new Date(now.getTime()-24*3600000),now)).toBe(false);
 expect(channelFailureStatus('whatsapp','whatsapp_delivery_unknown',1)).toBe('review');
});
test('webhook challenge and exact raw-body signature prevent forgery; wrong account/replayed messages ignored',async()=>{
 const root='https://www.myariahub.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=123';
 expect((await webhookGet(new Request(root+'&hub.verify_token=wrong'))).status).toBe(403);
 expect(await (await webhookGet(new Request(root+'&hub.verify_token='+process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN))).text()).toBe('123');
 const raw=Buffer.from('test');expect(validWhatsAppSignature(raw,null,'secret')).toBe(false);
 expect((await inbound(payload('93700123456','hello'),true)).status).toBe(403);
 expect(eligibleInboundMessages(payload('93700123456','hello',String(Math.floor(Date.now()/1000)-86400)))).toHaveLength(0);
 expect(eligibleInboundMessages(payload('93700123456','hello',undefined,'wrong'))).toHaveLength(0);
});
test('real inbound proof verifies only the declared owner/number; expired windows and opt-out never send; ambiguous sends stay reviewable',async()=>{
 const user=await db.user.create({data:{email:'free-wa-'+crypto.randomUUID()+'@test.invalid',emailVerified:new Date(),applicantProfile:{create:{}}},include:{applicantProfile:true}});owners.push(user.id);
 const token=await newApplicantSession(user.id),phone='+93700123456';
 const request=await requestVerification(accountReq(token,'POST',{action:'request',phone,consent:true}));expect(request.status).toBe(200);
 const result=await request.json();expect(result.mode).toBe('inbound');const challengeText=new URL(result.verificationUrl).searchParams.get('text')!;
 expect((await inbound(payload('93700999999',challengeText))).status).toBe(200);
 expect((await (await contactGet(accountReq(token))).json()).verified).toBe(false);
 expect((await inbound(payload(phone.slice(1),challengeText))).status).toBe(200);
 expect((await (await contactGet(accountReq(token))).json()).verified).toBe(true);
 const contact=await db.applicantWhatsAppContact.findUniqueOrThrow({where:{applicantProfileId:user.applicantProfile!.id}});
 expect(contact.encryptedNumber).not.toContain(phone);expect(contact.verifyHash).toBeNull();
 let calls=0,sentBody:any;globalThis.fetch=Object.assign(async(_input:unknown,init?:RequestInit)=>{calls++;sentBody=JSON.parse(String(init?.body));return new Response(JSON.stringify({messages:[{id:'wamid.accepted'}]}));},{preconnect:originalFetch.preconnect});
 expect(await sendWhatsAppServiceAlert(contact.id,contact.applicantProfileId,phone,'fa','Verified opportunity','https://www.myariahub.com/fa/opportunities/test')).toBe('wamid.accepted');
 expect(sentBody.type).toBe('text');expect(sentBody.template).toBeUndefined();expect(sentBody.text.body).toContain('STOP');
 await db.applicantWhatsAppContact.update({where:{id:contact.id},data:{lastInboundAt:new Date(Date.now()-25*3600000)}});
 await expect(sendWhatsAppServiceAlert(contact.id,contact.applicantProfileId,phone,'en','role','link')).rejects.toThrow('whatsapp_free_window_closed');expect(calls).toBe(1);
 await inbound(payload(phone.slice(1),'hello'));globalThis.fetch=Object.assign(async()=>{throw Error('lost response');},{preconnect:originalFetch.preconnect});
 await expect(sendWhatsAppServiceAlert(contact.id,contact.applicantProfileId,phone,'en','role','link')).rejects.toThrow('whatsapp_delivery_unknown');
 await inbound(payload(phone.slice(1),'STOP'));await expect(sendWhatsAppServiceAlert(contact.id,contact.applicantProfileId,phone,'en','role','link')).rejects.toThrow('whatsapp_contact_revoked');
 expect((await (await contactGet(accountReq(token))).json()).verified).toBe(false);
 expect((await optout(accountReq(token,'DELETE'))).status).toBe(200);
});
