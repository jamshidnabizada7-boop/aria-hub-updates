/** Real bytes -> extraction -> explicit review -> profile -> CV Builder ->
 * approved-role Matcher -> published DB opportunity via Next route. Offline,
 * ephemeral PostgreSQL, with all applicant upload/cloud flags disabled. */
import {afterAll,describe,expect,test} from 'bun:test';
import {NextRequest} from 'next/server';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {POST as matchPost} from '../src/app/api/opportunities/matcher/route';
import {extractCVBytes} from '../src/lib/applicants/cv-local-extraction';
import {reserveCVUpload} from '../src/lib/applicants/cv-document-lifecycle';
import {approveCVReview} from '../src/lib/applicants/cv-review-service';
import {CVFieldSchema} from '../src/lib/applicants/cv-extraction-proposals';
import {createDraft} from '../src/app/[lang]/cv-builder/lib/cv-utils';
import {applyVerifiedCareerFacts} from '../src/app/[lang]/cv-builder/lib/cv-profile-import';
import {reviewedCareerMatcherPrefill,suggestedCareerRoles} from '../src/lib/applicants/cv-matcher-prefill';
import type {MatcherProfile} from '../src/lib/opportunity-matcher';

const db=new PrismaClient(),users:string[]=[],opportunities:string[]=[];
afterAll(async()=>{
 if(users.length)await db.user.deleteMany({where:{id:{in:users}}});
 if(opportunities.length)await db.opportunity.deleteMany({where:{id:{in:opportunities}}});
 await db.$disconnect();
});
const hash=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
describe('real CV -> user review -> private profile -> CV Builder -> published Matcher',()=>{
 for(const [lang,file] of [['en','en-native.pdf'],['fa','fa-native.docx'],['ps','ps-native.docx']] as const){
  test(lang+' complete offline user journey from genuine document bytes',async()=>{
   const bytes=new Uint8Array(await readFile(join('/tmp/aria-cv-corpus',file)));
   const sha=hash(bytes);
   const extracted=await extractCVBytes({sha256:sha,originalName:file},bytes);
   expect(extracted.requiresUserReview).toBe(true);
   expect(extracted.language).toBe(lang);
   const u=await db.user.create({data:{email:'journey-'+crypto.randomUUID()+'@test.invalid',
    applicantProfile:{create:{}}},include:{applicantProfile:true}});users.push(u.id);
   const profileId=u.applicantProfile!.id;
   const record=await reserveCVUpload(db,profileId,{
    sha256:sha,originalName:file,mimeType:file.endsWith('pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    byteSize:bytes.length,storageKey:'journey_'+lang+'_'+u.id+'/'+sha.slice(0,20)+(file.endsWith('pdf')?'.pdf':'.docx')
   });
   // Extraction proposals alone MUST NOT save a qualification.
   expect((await db.applicantProfile.findUniqueOrThrow({where:{id:profileId}})).verifiedCareerFacts).toBeNull();
   await db.applicantDocument.update({where:{id:record.id},data:{status:'review',extraction:extracted}});
   const selected=CVFieldSchema.options.filter(x=>extracted.fields[x]!==undefined);
   expect(selected).toContain('education');
   expect(selected).toContain('workHistory');
   expect(await approveCVReview(db,profileId,record.id,{
    sourceSha256:sha,acceptedFields:selected,edits:{},replaceExisting:false
   })).toBe('saved');
   const facts=(await db.applicantProfile.findUniqueOrThrow({where:{id:profileId}})).verifiedCareerFacts as Record<string,unknown>;
   const cv=applyVerifiedCareerFacts(createDraft('professional',lang),facts);
   expect(cv.data.personal.fullName.length).toBeGreaterThan(1);
   expect(cv.data.experience.length).toBeGreaterThanOrEqual(1);
   expect(cv.data.experience[0].company).toBe('');
   expect(cv.data.experience[0].startDate).toBe('');
   expect(JSON.stringify(facts)).not.toMatch(/nationality|gender|admissionProbability|experienceYears/i);
   const base:MatcherProfile={
    intents:['job'],education:'high_school',nationality:'Afghanistan',residence:'Afghanistan',
    destinations:['Afghanistan'],preferredProvinces:['Kabul'],preferredRoles:[],skills:[],
    fieldArea:'any',lang,explainWithAi:false
   };
   const prefill=reviewedCareerMatcherPrefill(base,facts);
   expect(prefill.education).toBe('bachelors');
   expect(suggestedCareerRoles(facts)).toContain('teacher');
   // Applicant explicitly chooses the suggested occupation: it cannot be
   // silently converted into a preference, experience length, or eligibility.
   expect(prefill.preferredRoles).toEqual([]);
   const selectedProfile:MatcherProfile={...prefill,preferredRoles:['teacher']};
   const listed=await db.opportunity.create({data:{
    title:'Primary School Teacher',slug:'cv-e2e-'+crypto.randomUUID(),
    description:'Teaching children in Kabul',jobType:'job',country:'Afghanistan',
    deadline:new Date(Date.now()+20*86400000),educationReq:'Bachelor degree',
    requirements:'Teaching skills',eligibility:'Afghan nationals can apply',
    locations:{create:{country:'Afghanistan',province:'Kabul',city:'Kabul'}}
   }});
   opportunities.push(listed.id);
   const unrelated=await db.opportunity.create({data:{
    title:'Delivery Driver',slug:'cv-e2e-driver-'+crypto.randomUUID(),
    description:'Transportation job in Herat',jobType:'job',country:'Afghanistan',
    deadline:new Date(Date.now()+20*86400000),
    locations:{create:{country:'Afghanistan',province:'Herat',city:'Herat'}}
   }});
   opportunities.push(unrelated.id);
   const req=new NextRequest('http://localhost:3000/api/opportunities/matcher',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(selectedProfile)
   });
   const answer=await matchPost(req);
   expect(answer.status).toBe(200);
   const payload=await answer.json() as {results:Array<{slug:string;reasons:string[];unknowns:string[]}>;ai:boolean};
   expect(payload.ai).toBe(false);
   expect(payload.results.some(x=>x.slug===listed.slug)).toBe(true);
   expect(payload.results.some(x=>x.slug===unrelated.slug)).toBe(false);
   expect(payload.results.find(x=>x.slug===listed.slug)?.reasons).toContain('preferred_role');
  },90000);
 }
});
