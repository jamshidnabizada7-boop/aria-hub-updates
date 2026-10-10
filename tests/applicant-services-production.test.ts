import {test,expect,afterAll} from 'bun:test';
import webpush from 'web-push';
import {createECDH,createPublicKey,verify,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {storeOracleCV,fetchOracleCV,removeOracleCV} from '../src/lib/applicants/cv-oracle-storage';
import {storePrivateCV,fetchPrivateCV,removePrivateCV} from '../src/lib/applicants/cv-private-storage';
import {safePushSubscription} from '../src/lib/applicants/channel-security';
import {directPushOptions} from '../src/lib/applicants/channel-providers';

const vars=['NODE_ENV','CLOUD_CV_STORAGE_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','CV_PRIVATE_BUCKET','APPLICANT_VAPID_PUBLIC_KEY','APPLICANT_VAPID_PRIVATE_KEY','CV_PRIVATE_DIRECTORY','CV_PRIVATE_STORAGE_KEY'];
const previous=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
afterAll(()=>{for(const k of vars){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}});
test('Oracle private objects are encrypted, immutable, tamper-evident, and removable',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'aria-private-test-'));
 Object.assign(process.env,{CV_PRIVATE_DIRECTORY:dir,CV_PRIVATE_STORAGE_KEY:randomBytes(32).toString('hex')});
 const path='owner_fixture/document_fixture.pdf',bytes=Buffer.from('Sensitive synthetic applicant CV');
 try{
  await storeOracleCV(path,bytes);
  const location=join(dir,path+'.enc'),encrypted=await readFile(location);
  expect(encrypted.includes(bytes)).toBe(false);expect(Buffer.from(await fetchOracleCV(path)).equals(bytes)).toBe(true);
  await expect(storeOracleCV(path,Buffer.from('replacement'))).rejects.toThrow();
  expect(await readdir(join(dir,'owner_fixture'))).toHaveLength(1);
  await expect(fetchOracleCV('../outside.pdf')).rejects.toThrow('cv_storage_key_invalid');
  encrypted[encrypted.length-1]^=1;await writeFile(location,encrypted);
  await expect(fetchOracleCV(path)).rejects.toThrow();
  await removeOracleCV(path);expect(await readdir(join(dir,'owner_fixture'))).toHaveLength(0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('private storage protocol rejects public buckets, validates keys and round-trips bytes',async()=>{
 let isPublic=false,stored:Uint8Array|null=null,authorized=0;
 const server=Bun.serve({hostname:'localhost',port:0,async fetch(req){
  if(req.headers.get('authorization')!=='Bearer fixture-only')return new Response('',{status:401});
  authorized++;
  const path=new URL(req.url).pathname;
  if(path.startsWith('/storage/v1/bucket/'))return Response.json({public:isPublic});
  if(req.method==='POST'){stored=new Uint8Array(await req.arrayBuffer());return Response.json({ok:true});}
  if(req.method==='DELETE'){stored=null;return Response.json({ok:true});}
  return stored?new Response(Buffer.from(stored)):new Response('',{status:404});
 }});
 Object.assign(process.env,{NODE_ENV:'test',CLOUD_CV_STORAGE_ENABLED:'true',SUPABASE_URL:'http://localhost:'+server.port,SUPABASE_SERVICE_ROLE_KEY:'fixture-only',CV_PRIVATE_BUCKET:'aria-private-test'});
 try{
  const bytes=Buffer.from('private synthetic CV'),path='owner_fixture/document_fixture.pdf';
  await storePrivateCV(path,bytes,'application/pdf');
  expect(Buffer.from(await fetchPrivateCV(path)).equals(bytes)).toBe(true);
  isPublic=true;await expect(fetchPrivateCV(path)).rejects.toThrow('cv_bucket_not_private');
  isPublic=false;await expect(fetchPrivateCV('../private.pdf')).rejects.toThrow('cv_storage_key_invalid');
  await removePrivateCV(path);expect(stored).toBeNull();expect(authorized).toBeGreaterThan(3);
 }finally{await server.stop(true);}
});
test('native web push encrypts payload for the device and signs VAPID for the trusted endpoint',()=>{
 const vapid=webpush.generateVAPIDKeys();
 Object.assign(process.env,{APPLICANT_VAPID_PUBLIC_KEY:vapid.publicKey,APPLICANT_VAPID_PRIVATE_KEY:vapid.privateKey});
 const device=createECDH('prime256v1'),deviceKey=device.generateKeys().toString('base64url');
 const auth=randomBytes(16).toString('base64url');
 const sub=safePushSubscription({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-device',keys:{p256dh:deviceKey,auth}});
 const payload=JSON.stringify({title:'ARIA HUB',body:'Synthetic role',url:'https://www.myariahub.com/en/portal/notifications'});
 const request=webpush.generateRequestDetails(sub,payload,directPushOptions('delivery-fixture'));
 expect(request.method).toBe('POST');expect(request.headers['Content-Encoding']).toBe('aes128gcm');
 expect(String(request.body)).not.toContain('Synthetic role');expect(String(request.body)).not.toContain(vapid.privateKey);
 const require=createRequire(import.meta.url);
 const ece=require(require.resolve('http_ece',{paths:[require.resolve('web-push')]}));
 expect(ece.decrypt(request.body,{version:'aes128gcm',privateKey:device,authSecret:auth}).toString()).toBe(payload);
 const jwt=String(request.headers.Authorization).match(/t=([^, ]+)/)![1];
 const [header,body,signature]=jwt.split('.');
 const claims=JSON.parse(Buffer.from(body,'base64url').toString());
 expect(claims.aud).toBe('https://fcm.googleapis.com');expect(claims.sub).toBe('mailto:info@myariahub.com');
 const pub=Buffer.from(vapid.publicKey,'base64url');
 const key=createPublicKey({key:{kty:'EC',crv:'P-256',x:pub.subarray(1,33).toString('base64url'),y:pub.subarray(33).toString('base64url')},format:'jwk'});
 expect(verify('sha256',Buffer.from(header+'.'+body),{key,dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url'))).toBe(true);
 expect(directPushOptions('delivery-fixture').topic).toBe(directPushOptions('delivery-fixture').topic);
 expect(()=>safePushSubscription({...sub,endpoint:'https://127.0.0.1/secret'})).toThrow('untrusted_push_endpoint');
});
