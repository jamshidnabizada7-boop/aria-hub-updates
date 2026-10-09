import {afterAll,describe,expect,test} from 'bun:test';
import {PrismaClient} from '@prisma/client';
import {createHash} from 'node:crypto';
import {createDraft} from '../src/app/[lang]/cv-builder/lib/cv-utils';
import {applyVerifiedCareerFacts} from '../src/app/[lang]/cv-builder/lib/cv-profile-import';
import {reserveCVUpload,claimCVDeletion} from '../src/lib/applicants/cv-document-lifecycle';
import {scanCV} from '../src/lib/applicants/cv-scan';
import {approveCVReview} from '../src/lib/applicants/cv-review-service';
import {proposeCVFields,CVReviewSchema} from '../src/lib/applicants/cv-extraction-proposals';
import {checkedCloudDraft,encryptCVDraft,decryptCVDraft,cloudCVEnabled} from '../src/lib/applicants/cv-cloud-crypto';
import {reviewedCareerMatcherPrefill,suggestedCareerRoles} from '../src/lib/applicants/cv-matcher-prefill';
import {rankOpportunity,type MatcherProfile,type MatcherOpportunity} from '../src/lib/opportunity-matcher';
const db=new PrismaClient(),ids:string[]=[];
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const make=async()=>{
 const u=await db.user.create({data:{email:'cv-sec-'+crypto.randomUUID()+'@test.invalid',emailVerified:new Date(),
  applicantProfile:{create:{}}},include:{applicantProfile:true}});
 ids.push(u.id);return {userId:u.id,profileId:u.applicantProfile!.id};
};
const data=(key:string)=>({
 originalName:'teacher.pdf',mimeType:'application/pdf',byteSize:1024,
 sha256:digest(key),storageKey:'test_'+key.slice(0,10)+'/'+digest(key).slice(0,20)+'.pdf'
});
afterAll(async()=>{if(ids.length)await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();});
describe('tenant ownership, hash and concurrent document lifecycle',()=>{
 test('malware scanning fails closed when the local scanner is disabled',async()=>{
  const old=process.env.CV_CLAMAV_ENABLED;delete process.env.CV_CLAMAV_ENABLED;
  try{expect(await scanCV(new Uint8Array(Buffer.from('not a real CV')))).toBe(false);}
  finally{if(old!==undefined)process.env.CV_CLAMAV_ENABLED=old;}
 });
 test('parallel uploads cannot exceed ten reserved documents',async()=>{
  const u=await make();
  const attempts=await Promise.allSettled(Array.from({length:12},(_,i)=>reserveCVUpload(db,u.profileId,data('quota-'+i))));
  const successes=attempts.filter(x=>x.status==='fulfilled');
  expect(successes).toHaveLength(10);
  expect(attempts.filter(x=>x.status==='rejected')).toHaveLength(2);
  expect(await db.applicantDocument.count({where:{applicantProfileId:u.profileId}})).toBe(10);
  const statuses=await db.applicantDocument.findMany({where:{applicantProfileId:u.profileId},select:{status:true}});
  expect(statuses.every(x=>x.status==='storing')).toBe(true);
 });
 test('same owner/hash cannot reserve duplicate; other owner independent',async()=>{
  const a=await make(),b=await make();
  const first=await reserveCVUpload(db,a.profileId,data('duplicate'));
  await expect(reserveCVUpload(db,a.profileId,data('duplicate'))).rejects.toMatchObject({code:'already_uploaded',documentId:first.id});
  const other=await reserveCVUpload(db,b.profileId,{...data('duplicate'),storageKey:'test_other/'+digest('other').slice(0,20)+'.pdf'});
  expect(other.applicantProfileId).toBe(b.profileId);
 });
 test('foreign deletion blocked, storing file cannot disappear, deletion fences review',async()=>{
  const a=await make(),b=await make();
  const doc=await reserveCVUpload(db,a.profileId,data('deletion'));
  expect(await claimCVDeletion(db,b.userId,doc.id)).toBeNull();
  await expect(claimCVDeletion(db,a.userId,doc.id)).rejects.toMatchObject({code:'document_busy'});
  await db.applicantDocument.update({where:{id:doc.id},data:{status:'review',extraction:proposeCVFields(
   'Amina Ahmad\nEducation\nBachelor of Education\nWork Experience\nTeacher at Kabul school\nSkills\nTeaching and Excel','pdftotext')}});
  const claimed=await claimCVDeletion(db,a.userId,doc.id);
  expect(claimed?.id).toBe(doc.id);
  expect(await claimCVDeletion(db,a.userId,doc.id)).toEqual(claimed);
  const rejected=await approveCVReview(db,a.profileId,doc.id,{sourceSha256:digest('deletion'),acceptedFields:['education'],edits:{},replaceExisting:false});
  expect(rejected).toBe('stale_review');
  expect(await db.applicantProfile.findUnique({where:{id:a.profileId},select:{verifiedCareerFacts:true}})).toMatchObject({verifiedCareerFacts:null});
  const removed=await db.applicantDocument.deleteMany({where:{id:doc.id,applicantProfileId:a.profileId,status:'deleting'}});
  expect(removed.count).toBe(1);
 });
 test('hash mismatch, alien owner and repeat review cannot import untrusted details',async()=>{
  const a=await make(),b=await make();
  const extracted=proposeCVFields('Amina Ahmad\nEducation\nBachelor of Education\nWork Experience\nTeacher at Kabul school\nSkills\nTeaching and Microsoft Excel','pdftotext');
  const doc=await reserveCVUpload(db,a.profileId,data('review'));
  await db.applicantDocument.update({where:{id:doc.id},data:{status:'review',extraction:extracted}});
  const review={sourceSha256:digest('review'),acceptedFields:['education','skills','workHistory'] as ('education'|'skills'|'workHistory')[],edits:{},replaceExisting:false};
  expect(CVReviewSchema.safeParse(review).success).toBe(true);
  expect(await approveCVReview(db,b.profileId,doc.id,review)).toBe('stale_review');
  expect(await approveCVReview(db,a.profileId,doc.id,{...review,sourceSha256:'0'.repeat(64)})).toBe('stale_review');
  expect(await approveCVReview(db,a.profileId,doc.id,review)).toBe('saved');
  expect(await approveCVReview(db,a.profileId,doc.id,review)).toBe('stale_review');
  const facts=(await db.applicantProfile.findUniqueOrThrow({where:{id:a.profileId}})).verifiedCareerFacts as Record<string,unknown>;
  expect(facts.education).toBe('bachelors');
  expect(facts.skills).toContain('Teaching');
  expect(facts.workHistory).toContain('Teacher at Kabul school');
  expect(JSON.stringify(facts)).not.toMatch(/nationality|gender|experienceYears|birthdate/i);
  const draft=applyVerifiedCareerFacts(createDraft('professional','en'),facts);
  expect(draft.data.skills.map(x=>x.name)).toContain('Teaching');
  expect(draft.data.experience[0]?.description).toBe('Teacher at Kabul school');
  expect(draft.data.experience[0]?.company).toBe('');
  expect(draft.data.experience[0]?.startDate).toBe('');
  const base:MatcherProfile={
   intents:['job'],education:'high_school',nationality:'Afghanistan',residence:'Afghanistan',
   destinations:['Afghanistan'],fieldArea:'any',preferredRoles:[],preferredProvinces:['Kabul'],
   skills:[],lang:'en',explainWithAi:false
  };
  const prefill=reviewedCareerMatcherPrefill(base,facts);
  expect(prefill.education).toBe('bachelors');
  expect(prefill.skills).toContain('Teaching');
  expect(prefill.nationality).toBe(base.nationality);
  expect(prefill.preferredRoles).toEqual([]);
  expect(suggestedCareerRoles(facts)).toContain('teacher');
  const selected={...prefill,preferredRoles:['teacher'] as MatcherProfile['preferredRoles']};
  const vacancy:MatcherOpportunity={
   id:'teacher-cv',slug:'kabul-primary-teacher',title:'Primary School Teacher',organization:'Test School',
   categorySlug:'jobs',categoryName:'Jobs',jobType:'job',country:'Afghanistan',
   deadline:new Date(Date.now()+14*86400000),educationReq:'Bachelor degree',experience:null,
   eligibility:'Afghan citizens may apply',requirements:'Teaching and classroom skills',benefits:null,
   tags:null,extractedData:null,sourceName:'test-source',lastChecked:new Date(),updatedAt:new Date(),
   locations:[{country:'Afghanistan',province:'Kabul',city:'Kabul'}]
  };
  expect(rankOpportunity(selected,vacancy)?.evidence.reasons).toContain('preferred_role');
  expect(rankOpportunity(selected,{...vacancy,title:'Delivery Driver'})).toBeNull();
 });
});
describe('AES-GCM draft security and cross-device CAS',()=>{
 test('encrypted bytes cannot be read with the wrong applicant/draft ID; oversized rejected',()=>{
  const old=process.env.CV_DRAFT_ENCRYPTION_KEY;process.env.CV_DRAFT_ENCRYPTION_KEY='7'.repeat(64);
  try{
   expect(cloudCVEnabled()).toBe(false); // Feature flag stays OFF in candidate
   const draft=createDraft('professional','fa');
   draft.data.personal.fullName='فاطمه احمد';draft.data.skills=[{id:'skill1',name:'Teaching',level:'beginner'}];
   const safe=checkedCloudDraft(draft,draft.id);
   const sealed=encryptCVDraft(safe,'ownerA',draft.id);
   expect(sealed).not.toContain('فاطمه');
   expect(decryptCVDraft(sealed,'ownerA',draft.id).data.personal.fullName).toBe('فاطمه احمد');
   expect(()=>decryptCVDraft(sealed,'ownerB',draft.id)).toThrow();
   expect(()=>checkedCloudDraft({...draft,data:{...draft.data,personal:{...draft.data.personal,summary:'a'.repeat(170000)}}},draft.id)).toThrow('draft_too_large');
  }finally{if(old===undefined)delete process.env.CV_DRAFT_ENCRYPTION_KEY;else process.env.CV_DRAFT_ENCRYPTION_KEY=old;}
 });
 test('two stale devices cannot both overwrite the same server revision',async()=>{
  const a=await make();const draft=createDraft('professional','en');
  const item=await db.applicantCVDraft.create({data:{
    applicantProfileId:a.profileId,draftId:draft.id,encryptedContent:'fixture-encrypted',revision:1
  }});
  const [first,second]=await Promise.all([
   db.applicantCVDraft.updateMany({where:{applicantProfileId:a.profileId,draftId:draft.id,revision:1},data:{encryptedContent:'device-a',revision:{increment:1}}}),
   db.applicantCVDraft.updateMany({where:{applicantProfileId:a.profileId,draftId:draft.id,revision:1},data:{encryptedContent:'device-b',revision:{increment:1}}})
  ]);
  expect(first.count+second.count).toBe(1);
  const saved=await db.applicantCVDraft.findUniqueOrThrow({where:{id:item.id}});
  expect(saved.revision).toBe(2);
  const b=await make();
  expect(await db.applicantCVDraft.findFirst({where:{id:item.id,applicantProfileId:b.profileId}})).toBeNull();
  expect((await db.applicantCVDraft.deleteMany({where:{id:item.id,applicantProfileId:b.profileId}})).count).toBe(0);
 });
});
