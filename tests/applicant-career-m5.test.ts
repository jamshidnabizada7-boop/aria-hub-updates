import {afterAll,describe,expect,test} from 'bun:test';
import {PrismaClient} from '@prisma/client';
import {TrackerCreate,TrackerUpdate,nextStatusDates} from '../src/lib/applicants/career-service';
import {CoachRequestSchema,deterministicCareerCoach,normalizedCoachContext,coachAiPrompt} from '../src/lib/applicants/career-coach';

const db=new PrismaClient(),users:string[]=[],opps:string[]=[];
afterAll(async()=>{
 if(users.length)await db.user.deleteMany({where:{id:{in:users}}});
 if(opps.length)await db.opportunity.deleteMany({where:{id:{in:opps}}});
 await db.$disconnect();
});
describe('Milestone 5 safe career copilot',()=>{
 test('supports 5 bounded career tasks and default no external AI sharing',()=>{
  for(const task of ['cover_letter','application_email','interview_prep','cv_tips','application_checklist']){
   const r=CoachRequestSchema.safeParse({task,lang:'fa'});
   expect(r.success).toBe(true);
   if(r.success){expect(r.data.useAi).toBe(false);expect(r.data.consentToShareContext).toBe(false);}
  }
  expect(CoachRequestSchema.safeParse({task:'submit_application',lang:'en'}).success).toBe(false);
  expect(CoachRequestSchema.safeParse({task:'cover_letter',lang:'en',userNotes:'z'.repeat(2000)}).success).toBe(false);
 });
 test('guided outputs use verified skills and do not fabricate experience',()=>{
  const ctx={name:'Applicant',headline:'Teacher',skills:['Classroom management'],
   opportunityTitle:'English teacher',organization:'School A'};
  for(const lang of ['en','fa','ps'] as const){
   const draft=deterministicCareerCoach('cover_letter',lang,ctx);
   expect(draft).toContain('English teacher');
   expect(draft).toContain('Classroom management');
   expect(draft).not.toMatch(/10 years|PhD|100% success|hired automatically/);
   expect(deterministicCareerCoach('application_checklist',lang,ctx).split('\n')).toHaveLength(5);
  }
 });
 test('external AI prompt excludes name, email, phone, CV bytes and PII fields',()=>{
  const prompt=coachAiPrompt('cover_letter','en',{
   name:'PRIVATE PERSON',headline:'Public-facing verified headline',skills:['Writing'],
   userNotes:'Write respectfully',opportunityTitle:'Teacher',organization:'Charity',
   requirements:'Classroom experience'
  });
  expect(prompt).not.toContain('PRIVATE PERSON');
  expect(prompt).not.toMatch(/email|phone|cvBytes|originalName/i);
  expect(prompt).toContain('Writing');
  expect(normalizedCoachContext({name:'A',headline:'B',skills:Array(40).fill('t'.repeat(80))}).skills).toHaveLength(15);
 });
});
describe('Milestone 5 private application tracking database',()=>{
 test('one user cannot change or delete another user application; duplicate is blocked',async()=>{
  const a=await db.user.create({data:{email:'m5-a-'+crypto.randomUUID()+'@test.invalid',applicantProfile:{create:{}}},include:{applicantProfile:true}});
  const b=await db.user.create({data:{email:'m5-b-'+crypto.randomUUID()+'@test.invalid',applicantProfile:{create:{}}},include:{applicantProfile:true}});
  users.push(a.id,b.id);
  const opp=await db.opportunity.create({data:{title:'Teacher',slug:'m5-'+crypto.randomUUID(),description:'School teacher',deadline:new Date(Date.now()+5*86400000)}});
  opps.push(opp.id);
  const row=await db.applicantApplication.create({data:{applicantProfileId:a.applicantProfile!.id,opportunityId:opp.id,opportunitySlug:opp.slug,opportunityTitle:opp.title,opportunityOrganization:'Test School'}});
  expect(row.status).toBe('saved');
  expect(row.appliedAt).toBeNull();
  expect(await db.applicantApplication.count({where:{id:row.id,applicantProfileId:b.applicantProfile!.id}})).toBe(0);
  expect((await db.applicantApplication.deleteMany({where:{id:row.id,applicantProfileId:b.applicantProfile!.id}})).count).toBe(0);
  const other=await db.applicantApplication.updateMany({where:{id:row.id,applicantProfileId:b.applicantProfile!.id},data:{status:'applied'}});
  expect(other.count).toBe(0);
  let rejected=false;try{await db.applicantApplication.create({data:{applicantProfileId:a.applicantProfile!.id,opportunityId:opp.id,opportunitySlug:opp.slug,opportunityTitle:opp.title,opportunityOrganization:'Test School'}});}catch{rejected=true;}
  expect(rejected).toBe(true);
  expect(await db.applicantApplication.count({where:{applicantProfileId:a.applicantProfile!.id,opportunityId:opp.id}})).toBe(1);
  await db.applicantApplication.update({where:{id:row.id},data:{status:'applied',...nextStatusDates('applied',row,new Date())}});
  const applied=await db.applicantApplication.findUnique({where:{id:row.id}});
  expect(applied?.appliedAt).not.toBeNull();
 });
 test('a removed source listing does not erase user notes or application history',async()=>{
  const u=await db.user.create({data:{email:'m5-history-'+crypto.randomUUID()+'@test.invalid',applicantProfile:{create:{}}},include:{applicantProfile:true}});users.push(u.id);
  const opp=await db.opportunity.create({data:{title:'Historic driver opening',slug:'m5-old-'+crypto.randomUUID(),description:'Archived opportunity'}});
  const row=await db.applicantApplication.create({data:{applicantProfileId:u.applicantProfile!.id,opportunityId:opp.id,opportunitySlug:opp.slug,opportunityTitle:opp.title,notes:'I submitted through official form',status:'applied'}});
  await db.opportunity.delete({where:{id:opp.id}});
  const restored=await db.applicantApplication.findUnique({where:{id:row.id}});
  expect(restored?.opportunityId).toBeNull();
  expect(restored?.opportunityTitle).toBe('Historic driver opening');
  expect(restored?.notes).toBe('I submitted through official form');
 });
 test('opening or saving a listing never creates an implied application timestamp',()=>{
  const now=new Date('2026-10-08T12:00:00Z');
  expect(nextStatusDates('saved',{status:'saved',appliedAt:null},now)).toEqual({appliedAt:null});
  expect(nextStatusDates('preparing',{status:'saved',appliedAt:null},now)).toEqual({appliedAt:null});
  expect(nextStatusDates('applied',{status:'preparing',appliedAt:null},now)).toEqual({appliedAt:now});
  expect(nextStatusDates('interview',{status:'applied',appliedAt:now},new Date('2026-10-10'))).toEqual({appliedAt:now});
 });
 test('rejects malformed URLs, status or oversized notes',()=>{
  expect(TrackerCreate.safeParse({opportunitySlug:'https://example.com'}).success).toBe(false);
  expect(TrackerCreate.safeParse({opportunitySlug:'teacher-kabul'}).success).toBe(true);
  expect(TrackerUpdate.safeParse({status:'sent_by_ai'}).success).toBe(false);
  expect(TrackerUpdate.safeParse({status:'interview',notes:'x'.repeat(2001)}).success).toBe(false);
 });
});
