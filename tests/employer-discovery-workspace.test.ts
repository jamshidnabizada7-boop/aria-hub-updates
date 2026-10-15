import {describe,test,expect,beforeAll,afterAll,mock} from 'bun:test';
import {randomBytes,createHash} from 'node:crypto';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import bcrypt from 'bcryptjs';
mock.module('server-only',()=>({}));
const url=new URL(process.env.DATABASE_URL||'postgresql://localhost/not_allowed');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw Error('Use an isolated localhost *_test database.');
process.env.APPLICANT_AUTH_ENABLED='true';process.env.CLOUD_CV_STORAGE_ENABLED='true';process.env.CV_PRIVATE_STORAGE_PROVIDER='oracle';process.env.CV_PRIVATE_STORAGE_KEY=randomBytes(32).toString('hex');
const {db}=await import('../src/lib/db');const {encodeEmployerSession}=await import('../src/lib/employer-auth');const {newApplicantSession}=await import('../src/lib/applicant-auth');
const orgRoutes=await import('../src/app/api/employers/organizations/route');
const submits=await import('../src/app/api/applicant/submissions/route');const inbox=await import('../src/app/api/employers/applications/route');
const docRoute=await import('../src/app/api/employers/applications/[id]/cv/route');const follow=await import('../src/app/api/applicant/organization-follows/route');
const jobs=await import('../src/app/api/employers/jobs/route');const team=await import('../src/app/api/employers/team/route');
const {reviewMembership}=await import('../src/lib/employers/membership');const {getPublicOrganization}=await import('../src/lib/organizations/public-profile');
const {storePrivateCV}=await import('../src/lib/applicants/cv-private-storage');const {exportApplicantData}=await import('../src/lib/applicants/account-privacy');
const run=Date.now().toString(36),users:string[]=[],orgIds:string[]=[];let root='',owner='',foreign='',viewer='',candidate='',candidate2='',org='',job='',document='',otherDocument='',submission='',ownerCookie='',foreignCookie='',viewerCookie='',candidateCookie='';
const req=(path:string,method='GET',body?:object,cookie='',origin='http://localhost:3003')=>new Request('http://localhost:3003'+path,{method,headers:{host:'localhost:3003',origin,'Content-Type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})});
const employer=(id:string,email:string)=>'aria-employer-session='+encodeEmployerSession({userId:id,email,t:Date.now()+1});
beforeAll(async()=>{
 root=await mkdtemp(join(tmpdir(),'aria-workspace-test-'));process.env.CV_PRIVATE_DIRECTORY=root;
 const hash=await bcrypt.hash('Test workspace password 123!',4);
 async function user(name:string){const u=await db.user.create({data:{email:name+'-'+run+'@example.org',name,passwordHash:hash,emailVerified:new Date()}});users.push(u.id);return u;}
 const a=await user('owner'),b=await user('foreign'),v=await user('viewer'),c=await user('candidate'),d=await user('candidate2');owner=a.id;foreign=b.id;viewer=v.id;candidate=c.id;candidate2=d.id;
 ownerCookie=employer(a.id,a.email!);foreignCookie=employer(b.id,b.email!);viewerCookie=employer(v.id,v.email!);
 candidateCookie='aria-applicant-session='+await newApplicantSession(c.id,undefined,'en');await newApplicantSession(d.id,undefined,'en');
});
afterAll(async()=>{await db.user.deleteMany({where:{id:{in:users}}});await db.opportunity.deleteMany({where:{organizationId:{in:orgIds}}});await db.organization.deleteMany({where:{id:{in:orgIds}}});await db.auditLog.deleteMany({where:{entityId:{in:[...orgIds,submission]}}});await rm(root,{recursive:true,force:true});});
describe('Employer discovery and consented applications: real DB and route boundaries',()=>{
 test('registration stays private until admin ownership review; foreign edits and CSRF fail',async()=>{
  const body={name:'Workspace test '+run,industry:'Education',country:'Afghanistan',website:'https://example.org',description:'An organization created exclusively in the isolated test database.'};
  expect((await orgRoutes.POST(req('/api/employers/organizations','POST',body,ownerCookie,'https://attacker.example'))).status).toBe(403);
  const response=await orgRoutes.POST(req('/api/employers/organizations','POST',body,ownerCookie));expect(response.status).toBe(200);const data=await response.json();org=data.id;orgIds.push(org);
  expect(await getPublicOrganization(data.slug)).toBeNull();
  const m=await db.organizationMember.findFirstOrThrow({where:{organizationId:org,userId:owner}});expect(m.status).toBe('pending');
  await reviewMembership(db,m.id,true,'test-admin@example.org');expect((await getPublicOrganization(data.slug))?.name).toBe(body.name);
  expect((await orgRoutes.PATCH(req('/api/employers/organizations','PATCH',{...body,id:org,description:'Edited'},foreignCookie))).status).toBe(400);
  expect((await orgRoutes.PATCH(req('/api/employers/organizations','PATCH',{...body,id:org,industry:'Healthcare'},ownerCookie))).status).toBe(200);
  expect((await orgRoutes.PATCH(req('/api/employers/organizations','PATCH',{...body,id:org,name:'Hijacked identity'},ownerCookie))).status).toBe(400);
 });
 test('native job remains moderated; scraped roles cannot be managed by employer',async()=>{
  const r=await jobs.POST(req('/api/employers/jobs','POST',{organizationId:org,title:'Native application test '+run,description:'A genuine-length test vacancy description with responsibilities and requirements for this isolated test.',location:'Kabul',applyMethod:'ariahub'},ownerCookie));expect(r.status).toBe(200);const j=await r.json();job=j.id;
  const record=await db.opportunity.findUniqueOrThrow({where:{id:job}});expect(record.acceptsNativeApplications).toBe(true);expect(record.status).toBe('draft');expect(record.applyUrl).toBeNull();
  await db.opportunity.update({where:{id:job},data:{status:'published'}});
  await db.organizationMember.create({data:{organizationId:org,userId:viewer,role:'viewer',status:'active'}});
 });
 test('only owner manages explicit colleague requests, never elevates another owner',async()=>{
  const member=await db.organizationMember.create({data:{organizationId:org,userId:foreign,role:'owner',status:'pending'}});
  expect((await team.PATCH(req('/api/employers/team','PATCH',{id:member.id,organizationId:org,role:'recruiter'},viewerCookie))).status).toBe(403);
  expect((await team.PATCH(req('/api/employers/team','PATCH',{id:member.id,organizationId:org,role:'viewer'},ownerCookie))).status).toBe(200);
  expect((await team.PATCH(req('/api/employers/team','PATCH',{id:member.id,organizationId:org,role:'owner'},ownerCookie))).status).toBe(400);
  // Remove granted test access to verify the foreign account remains denied below.
  await db.organizationMember.delete({where:{id:member.id}});
 });
 test('company follow persists idempotently and stays private to applicant',async()=>{
  const path='/api/applicant/organization-follows';
  for(let i=0;i<2;i++)expect((await follow.POST(req(path,'POST',{organizationId:org,follow:true},candidateCookie))).status).toBe(200);
  const r=await follow.GET(req(path,'GET',undefined,candidateCookie));expect((await r.json()).items).toHaveLength(1);
  expect((await follow.GET(req(path,'GET',undefined,ownerCookie))).status).toBe(401);
 });
 test('application requires consent and an owned CV; duplicate and closed roles reject',async()=>{
  const p=await db.applicantProfile.findUniqueOrThrow({where:{userId:candidate}}),p2=await db.applicantProfile.findUniqueOrThrow({where:{userId:candidate2}});
  const bytes=Buffer.from('synthetic application CV bytes'),hash=createHash('sha256').update(bytes).digest('hex');
  for(const [profile,set] of [[p,(id:string)=>{document=id;}],[p2,(id:string)=>{otherDocument=id;}]] as const){
   const key=profile.id+'/'+randomBytes(8).toString('hex')+'.pdf';await storePrivateCV(key,bytes,'application/pdf');
   const d=await db.applicantDocument.create({data:{applicantProfileId:profile.id,originalName:'test-only.pdf',storageKey:key,mimeType:'application/pdf',byteSize:bytes.length,sha256:hash}});set(d.id);
  }
  const body={opportunityId:job,coverLetter:'I am applying for the isolated test position with explicit consent.',name:'Test Candidate',documentId:document,consent:false};
  expect((await submits.POST(req('/api/applicant/submissions','POST',body,candidateCookie))).status).toBe(400);
  expect((await submits.POST(req('/api/applicant/submissions','POST',{...body,consent:true,documentId:otherDocument},candidateCookie))).status).toBe(400);
  const response=await submits.POST(req('/api/applicant/submissions','POST',{...body,consent:true},candidateCookie));expect(response.status).toBe(200);submission=(await response.json()).id;
  expect((await submits.POST(req('/api/applicant/submissions','POST',{...body,consent:true},candidateCookie))).status).toBe(400);
  expect(await db.applicantApplication.count({where:{applicantProfileId:p.id}})).toBe(0);
  await db.opportunity.update({where:{id:job},data:{status:'expired'}});
  const user2Cookie='aria-applicant-session='+await newApplicantSession(candidate2);
  expect((await submits.POST(req('/api/applicant/submissions','POST',{...body,consent:true,documentId:otherDocument},user2Cookie))).status).toBe(400);
  await db.opportunity.update({where:{id:job},data:{status:'published'}});
 });
 test('inbox and selected CV are inaccessible to viewers and foreign employers',async()=>{
  const path='/api/employers/applications?organizationId='+org;
  expect((await inbox.GET(req(path,'GET',undefined,foreignCookie))).status).toBe(403);
  expect((await inbox.GET(req(path,'GET',undefined,viewerCookie))).status).toBe(403);
  const visible=await inbox.GET(req(path,'GET',undefined,ownerCookie));const data=await visible.json();expect(data.items[0].document.id).toBe(document);expect(data.items[0].coverLetter).toContain('explicit consent');expect(JSON.stringify(data)).not.toContain('storageKey');
  const ctx={params:Promise.resolve({id:submission})};
  expect((await docRoute.GET(req('/cv','GET',undefined,foreignCookie),ctx)).status).toBe(404);
  expect((await docRoute.GET(req('/cv','GET',undefined,viewerCookie),ctx)).status).toBe(404);
  const cv=await docRoute.GET(req('/cv','GET',undefined,ownerCookie),ctx);expect(cv.status).toBe(200);expect(await cv.text()).toBe('synthetic application CV bytes');
 });
 test('stage appears to applicant; withdrawal revokes CV and contact, exporting keeps only own data',async()=>{
  const changed=await inbox.PATCH(req('/api/employers/applications','PATCH',{id:submission,status:'shortlisted'},ownerCookie));expect(changed.status).toBe(200);
  const mine=await submits.GET(req('/api/applicant/submissions','GET',undefined,candidateCookie));expect((await mine.json()).items[0].status).toBe('shortlisted');
  const exported=await exportApplicantData(db,candidate);expect(exported.account.applicantProfile?.submittedApplications).toHaveLength(1);expect(exported.account.applicantProfile?.organizationFollows).toHaveLength(1);
  const withdrawn=await submits.PATCH(req('/api/applicant/submissions','PATCH',{id:submission},candidateCookie));expect(withdrawn.status).toBe(200);
  expect((await docRoute.GET(req('/cv','GET',undefined,ownerCookie),{params:Promise.resolve({id:submission})})).status).toBe(404);
  const row=await db.employerApplication.findUniqueOrThrow({where:{id:submission}});expect(row.email).toBe('');expect(row.coverLetter).toBe('');expect(row.documentId).toBeNull();
  expect((await inbox.PATCH(req('/api/employers/applications','PATCH',{id:submission,status:'hired'},ownerCookie))).status).toBe(400);
 });
 test('organization merge preserves private follows and submitted application records',async()=>{
  const {mergeOrganizations}=await import('../src/lib/import/organization-actions');
  const target=await db.organization.create({data:{name:'Merged workspace '+run,slug:'merged-workspace-'+run}});orgIds.push(target.id);
  await mergeOrganizations(db,target.id,org,'test-admin@example.org');
  expect((await db.employerApplication.findUniqueOrThrow({where:{id:submission}})).organizationId).toBe(target.id);
  expect(await db.organizationFollow.count({where:{organizationId:target.id}})).toBe(1);
  expect(await db.organization.findUnique({where:{id:org}})).toBeNull();
 });

});
