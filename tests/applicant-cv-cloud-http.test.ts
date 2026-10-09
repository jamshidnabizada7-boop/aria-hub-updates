/** Authenticated route-level cloud CV sync verification against isolated PG.
 * Two sessions represent two devices. Never calls any external API.
 */
import {afterAll,describe,expect,test} from 'bun:test';
import {PrismaClient} from '@prisma/client';
import {newApplicantSession,APPLICANT_COOKIE} from '../src/lib/applicant-auth';
import {createDraft} from '../src/app/[lang]/cv-builder/lib/cv-utils';
import {GET as cloudList} from '../src/app/api/applicant/cv-drafts/route';
import {GET as cloudGet,PUT as cloudPut,DELETE as cloudDelete} from '../src/app/api/applicant/cv-drafts/[draftId]/route';
const db=new PrismaClient(),users:string[]=[];
const restored:Record<string,string|undefined>={};
for(const key of ['APPLICANT_AUTH_ENABLED','APPLICANT_CV_SYNC_ENABLED','CV_DRAFT_ENCRYPTION_KEY'])restored[key]=process.env[key];
process.env.APPLICANT_AUTH_ENABLED='true';process.env.APPLICANT_CV_SYNC_ENABLED='true';
process.env.CV_DRAFT_ENCRYPTION_KEY='e'.repeat(64);
afterAll(async()=>{
 if(users.length)await db.user.deleteMany({where:{id:{in:users}}});
 await db.$disconnect();
 for(const [key,val] of Object.entries(restored)){if(val===undefined)delete process.env[key];else process.env[key]=val;}
});
async function user(){
 const u=await db.user.create({data:{email:'cv-http-'+crypto.randomUUID()+'@test.invalid',emailVerified:new Date(),applicantProfile:{create:{}}}});
 users.push(u.id);
 return {id:u.id,token:await newApplicantSession(u.id)};
}
const base='http://localhost:3000';
const headers=(token?:string,mutating=true)=>({
 host:'localhost:3000', ...(mutating?{origin:base}:{}),
 ...(token?{cookie:APPLICANT_COOKIE+'='+token}:{})
});
function request(path:string,method:string,token?:string,data?:unknown,origin=base){
 const encoded=data===undefined?undefined:JSON.stringify(data);
 return new Request(base+path,{method,headers:{
  ...headers(token,method!=='GET'),...(encoded?{'content-type':'application/json','content-length':String(Buffer.byteLength(encoded))}:{}),
  ...(method!=='GET'?{origin}:{}),
 },body:encoded});
}
const ctx=(id:string)=>({params:Promise.resolve({draftId:id})});
describe('applicant CV cloud API authenticated two-session contract',()=>{
 test('owner can restore on second device; other account denied; CAS protects edits',async()=>{
  const owner=await user(),other=await user();
  const first=await cloudList(request('/api/applicant/cv-drafts','GET',owner.token));
  expect(first.status).toBe(200);
  expect((await first.json()).items).toHaveLength(0);
  const draft=createDraft('professional','fa');
  draft.data.personal.fullName='فاطمه احمد';
  const path='/api/applicant/cv-drafts/'+draft.id;
  const create=await cloudPut(request(path,'PUT',owner.token,{draft,expectedRevision:0}),ctx(draft.id));
  expect(create.status).toBe(200);
  expect((await create.json()).revision).toBe(1);
  // Different session of the same user represents a second authorized device.
  const device2=await newApplicantSession(owner.id);
  const restored=await cloudGet(request(path,'GET',device2),ctx(draft.id));
  expect(restored.status).toBe(200);
  const remote=await restored.json();
  expect(remote.draft.data.personal.fullName).toBe('فاطمه احمد');
  expect(remote.revision).toBe(1);
  const foreign=await cloudGet(request(path,'GET',other.token),ctx(draft.id));
  expect(foreign.status).toBe(404);
  const anonymous=await cloudGet(request(path,'GET'),ctx(draft.id));
  expect(anonymous.status).toBe(404);
  const crossSite=await cloudPut(request(path,'PUT',owner.token,{draft,expectedRevision:1},'https://malicious.test'),ctx(draft.id));
  expect(crossSite.status).toBe(403);
  const secondDraft={...draft,name:'Education CV',updatedAt:new Date().toISOString()};
  const [w1,w2]=await Promise.all([
   cloudPut(request(path,'PUT',owner.token,{draft:secondDraft,expectedRevision:1}),ctx(draft.id)),
   cloudPut(request(path,'PUT',device2,{draft:{...secondDraft,name:'Job CV'},expectedRevision:1}),ctx(draft.id))
  ]);
  expect([w1.status,w2.status].sort()).toEqual([200,409]);
  const last=await cloudGet(request(path,'GET',owner.token),ctx(draft.id));
  expect((await last.json()).revision).toBe(2);
  expect((await cloudDelete(request(path,'DELETE',other.token,{expectedRevision:2}),ctx(draft.id))).status).toBe(409);
  expect((await cloudDelete(request(path,'DELETE',owner.token,{expectedRevision:1}),ctx(draft.id))).status).toBe(409);
  expect((await cloudDelete(request(path,'DELETE',device2,{expectedRevision:2}),ctx(draft.id))).status).toBe(200);
  expect((await cloudGet(request(path,'GET',owner.token),ctx(draft.id))).status).toBe(404);
 });
});
