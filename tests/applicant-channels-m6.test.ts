import {afterAll,describe,expect,test} from 'bun:test';
import {PrismaClient} from '@prisma/client';
import {createHash} from 'node:crypto';
import {newApplicantSession,APPLICANT_COOKIE} from '../src/lib/applicant-auth';
import {sealChannel,openChannel,otpHash,matchOtpHash,safePushSubscription} from '../src/lib/applicants/channel-security';
import {deliverPushToGateway} from '../src/lib/applicants/channel-providers';
import {GET as whatsappGet,POST as whatsappPost,DELETE as whatsappDelete} from '../src/app/api/applicant/whatsapp-contact/route';
import {GET as pushGet,POST as pushPost,DELETE as pushDelete} from '../src/app/api/applicant/push-subscriptions/route';
const db=new PrismaClient(),owners:string[]=[];
const vars=['APPLICANT_AUTH_ENABLED','APPLICANT_MATCHER_V3_ENABLED','APPLICANT_NOTIFICATIONS_ENABLED',
 'APPLICANT_CHANNEL_ENCRYPTION_KEY','APPLICANT_WHATSAPP_VERIFICATION_ENABLED','APPLICANT_WHATSAPP_DELIVERY_ENABLED',
 'WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_META_ACCESS_TOKEN','WHATSAPP_MATCH_TEMPLATE','WHATSAPP_VERIFY_TEMPLATE',
 'APPLICANT_PUSH_SUBSCRIPTIONS_ENABLED','APPLICANT_VAPID_PUBLIC_KEY'] as const;
const previous=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
Object.assign(process.env,{
 APPLICANT_AUTH_ENABLED:'true',APPLICANT_MATCHER_V3_ENABLED:'true',APPLICANT_NOTIFICATIONS_ENABLED:'true',
 APPLICANT_CHANNEL_ENCRYPTION_KEY:'a'.repeat(64),
 APPLICANT_WHATSAPP_VERIFICATION_ENABLED:'true',APPLICANT_WHATSAPP_DELIVERY_ENABLED:'true',
 WHATSAPP_PHONE_NUMBER_ID:'123456789123',WHATSAPP_META_ACCESS_TOKEN:'candidate-only-fake-token',
 WHATSAPP_MATCH_TEMPLATE:'aria_match_optin',WHATSAPP_VERIFY_TEMPLATE:'aria_verify_optin',
 APPLICANT_PUSH_SUBSCRIPTIONS_ENABLED:'true',APPLICANT_VAPID_PUBLIC_KEY:'a'.repeat(87)
});
const originalFetch=globalThis.fetch;
afterAll(async()=>{
 globalThis.fetch=originalFetch;
 if(owners.length)await db.user.deleteMany({where:{id:{in:owners}}});
 await db.$disconnect();
 for(const k of vars){const old=previous[k];if(old===undefined)delete process.env[k];else process.env[k]=old;}
});
const base='http://localhost:3000';
async function account(){
 const u=await db.user.create({data:{email:'channel-'+crypto.randomUUID()+'@test.invalid',emailVerified:new Date(),
  applicantProfile:{create:{}}},include:{applicantProfile:true}});
 owners.push(u.id);
 const token=await newApplicantSession(u.id);
 return {token,profileId:u.applicantProfile!.id};
}
function req(path:string,method:string,token?:string,body?:unknown,origin=base){
 const json=body===undefined?undefined:JSON.stringify(body);
 return new Request(base+path,{method,headers:{
  host:'localhost:3000',...(method!=='GET'?{origin}:{}),
  ...(token?{cookie:APPLICANT_COOKIE+'='+token}:{}),
  ...(json?{'content-type':'application/json','content-length':String(Buffer.byteLength(json))}:{})
 },body:json});
}
describe('candidate notification channels',()=>{
 test('authenticated encryption and SSRF guard reject untrusted destinations',()=>{
  const sealed=sealChannel('+93700123456','owner1','whatsapp');
  expect(sealed).not.toContain('937001');
  expect(openChannel(sealed,'owner1','whatsapp')).toBe('+93700123456');
  expect(()=>openChannel(sealed,'owner2','whatsapp')).toThrow();
  const digest=otpHash('owner1','+93700123456','123456');
  expect(matchOtpHash(digest,'owner1','+93700123456','123456')).toBe(true);
  expect(matchOtpHash(digest,'owner1','+93700123456','654321')).toBe(false);
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',
   keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}};
  expect(safePushSubscription(subscription).endpoint).toContain('fcm.googleapis.com');
  expect(()=>safePushSubscription({...subscription,endpoint:'https://127.0.0.1/private'})).toThrow('untrusted_push_endpoint');
  expect(()=>safePushSubscription({...subscription,endpoint:'https://evil.example.com/endpoint'})).toThrow('untrusted_push_endpoint');
 });
 test('push gateway uses authenticated contract, stable idempotency and rejects provider outages',async()=>{
  const saved={flag:process.env.APPLICANT_PUSH_DELIVERY_ENABLED,url:process.env.APPLICANT_PUSH_GATEWAY_URL,token:process.env.APPLICANT_PUSH_GATEWAY_TOKEN};
  const beforeFetch=globalThis.fetch;
  process.env.APPLICANT_PUSH_DELIVERY_ENABLED='true';
  process.env.APPLICANT_PUSH_GATEWAY_URL='https://candidate-gateway.example.test/webpush';
  process.env.APPLICANT_PUSH_GATEWAY_TOKEN='fake-candidate-only';
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/fixture',
   keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}};
  const payload={title:'ARIA HUB',body:'Test role',url:'https://www.myariahub.com/en/opportunities/test-role'};
  try{
   const sent: Array<{url:string;auth:string|null;key:string|null;body:unknown}>=[];
   globalThis.fetch=(async (input:unknown,init?:RequestInit)=>{
    sent.push({url:String(input),auth:new Headers(init?.headers).get('Authorization'),
     key:new Headers(init?.headers).get('Idempotency-Key'),body:JSON.parse(String(init?.body))});
    return new Response('{}',{status:200});
   }) as typeof fetch;
   expect(await deliverPushToGateway(subscription,payload,'notification-123')).toBe(true);
   expect(sent).toHaveLength(1);
   expect(sent[0]).toMatchObject({url:'https://candidate-gateway.example.test/webpush',
    auth:'Bearer fake-candidate-only',key:'notification-123',
    body:{subscription,payload}});
   process.env.APPLICANT_PUSH_GATEWAY_URL='http://127.0.0.1:3000/evil';
   await expect(deliverPushToGateway(subscription,payload,'notification-123')).rejects.toThrow('push_provider_disabled');
   process.env.APPLICANT_PUSH_GATEWAY_URL='https://candidate-gateway.example.test/webpush';
   globalThis.fetch=(async(_input:RequestInfo|URL,_init?:RequestInit)=>new Response('{}',{status:503})) as typeof fetch;
   await expect(deliverPushToGateway(subscription,payload,'notification-123')).rejects.toThrow('push_provider_rejected');
  }finally{
   globalThis.fetch=beforeFetch;
   for(const [name,value] of [['APPLICANT_PUSH_DELIVERY_ENABLED',saved.flag],
    ['APPLICANT_PUSH_GATEWAY_URL',saved.url],['APPLICANT_PUSH_GATEWAY_TOKEN',saved.token]] as const){
    if(value===undefined)delete process.env[name];else process.env[name]=value;
   }
  }
 });
 test('WhatsApp sends only a requested template; verification, opt-out and tenant isolation',async()=>{
  const a=await account(),b=await account();
  const calls:Array<Record<string,unknown>>=[];
  globalThis.fetch=(async(_url:unknown,init?:RequestInit)=>{
   const raw=JSON.parse(String(init?.body||'{}'));calls.push(raw);
   return new Response(JSON.stringify({messages:[{id:'fixture'}]}),{status:200,headers:{'content-type':'application/json'}});
  }) as typeof fetch;
  const path='/api/applicant/whatsapp-contact';
  expect((await whatsappPost(req(path,'POST',a.token,{action:'request',phone:'+93700123456',consent:true},'https://evil.example.com'))).status).toBe(403);
  const asked=await whatsappPost(req(path,'POST',a.token,{action:'request',phone:'+93700123456',consent:true}));
  expect(asked.status).toBe(200);
  expect(calls).toHaveLength(1);
  expect(calls[0].type).toBe('template');
  const raw=calls[0] as {template:{components:Array<{parameters:Array<{text:string}>}>}};
  const code=raw.template.components[0].parameters[0].text;
  expect(/^\d{6}$/.test(code)).toBe(true);
  expect((await (await whatsappGet(req(path,'GET',b.token))).json()).verified).toBe(false);
  expect((await whatsappPost(req(path,'POST',a.token,{action:'confirm',code:'999999'}))).status).toBe(403);
  expect((await whatsappPost(req(path,'POST',a.token,{action:'confirm',code}))).status).toBe(200);
  expect((await (await whatsappGet(req(path,'GET',a.token))).json()).verified).toBe(true);
  expect((await db.applicantNotificationPreference.findUniqueOrThrow({where:{applicantProfileId:a.profileId}})).whatsappEnabled).toBe(true);
  expect((await whatsappDelete(req(path,'DELETE',b.token))).status).toBe(200);
  expect((await (await whatsappGet(req(path,'GET',a.token))).json()).verified).toBe(true);
  expect((await whatsappDelete(req(path,'DELETE',a.token))).status).toBe(200);
  expect((await (await whatsappGet(req(path,'GET',a.token))).json()).verified).toBe(false);
  expect((await db.applicantNotificationPreference.findUniqueOrThrow({where:{applicantProfileId:a.profileId}})).whatsappEnabled).toBe(false);
 });
 test('push requires explicit applicant consent and scopes each endpoint to its owner',async()=>{
  const a=await account(),b=await account();
  const path='/api/applicant/push-subscriptions';
  const sub={endpoint:'https://fcm.googleapis.com/fcm/send/'+crypto.randomUUID(),
   keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}};
  const without=await pushPost(req(path,'POST',a.token,sub));
  expect(without.status).toBe(403);
  await db.applicantNotificationPreference.upsert({where:{applicantProfileId:a.profileId},
   create:{applicantProfileId:a.profileId,pushEnabled:true},update:{pushEnabled:true}});
  const response=await pushPost(req(path,'POST',a.token,sub));
  expect(response.status).toBe(201);
  expect((await (await pushGet(req(path,'GET',a.token))).json()).activeSubscriptions).toBe(1);
  expect((await (await pushGet(req(path,'GET',b.token))).json()).activeSubscriptions).toBe(0);
  expect((await pushPost(req(path,'POST',b.token,sub))).status).toBe(403);
  expect((await (await pushDelete(req(path,'DELETE',b.token,{endpoint:sub.endpoint}))).json()).changed).toBe(0);
  expect((await (await pushDelete(req(path,'DELETE',a.token,{endpoint:sub.endpoint}))).json()).changed).toBe(1);
  expect((await (await pushGet(req(path,'GET',a.token))).json()).activeSubscriptions).toBe(0);
  expect((await db.applicantPushSubscription.findFirstOrThrow({where:{applicantProfileId:a.profileId}})).encryptedSubscription).not.toContain(sub.endpoint);
 });
});
