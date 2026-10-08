import {afterAll,describe,expect,test} from 'bun:test';
import {PrismaClient} from '@prisma/client';
import {emailDue,NotificationPrefsSchema,defaultNotificationPrefs} from '../src/lib/applicants/notification-service';
const db=new PrismaClient();
const ids:string[]=[],opps:string[]=[];
const sample={intents:['job'],education:'bachelors',nationality:'Afghanistan',residence:'Afghanistan',destinations:['Afghanistan'],fieldArea:'any',preferredRoles:['driver'],lang:'en',explainWithAi:false};
afterAll(async()=>{
 if(ids.length)await db.user.deleteMany({where:{id:{in:ids}}});
 if(opps.length)await db.opportunity.deleteMany({where:{id:{in:opps}}});
 await db.$disconnect();
});
describe('M4 notification consent validation',()=>{
 test('all notification channels are opt-in by default',()=>{
  expect(defaultNotificationPrefs).toEqual({inAppEnabled:false,emailEnabled:false,emailFrequency:'daily'});
  expect(NotificationPrefsSchema.safeParse({inAppEnabled:false,emailEnabled:false,emailFrequency:'daily'}).success).toBe(true);
  expect(NotificationPrefsSchema.safeParse({inAppEnabled:true,emailEnabled:true,emailFrequency:'hourly'}).success).toBe(false);
  expect(NotificationPrefsSchema.safeParse({inAppEnabled:true,emailEnabled:true,emailFrequency:'daily',isAdmin:true}).success).toBe(false);
 });
 test('daily/weekly cooldown is grounded in real time',()=>{
  const now=new Date('2026-10-08T10:00:00Z');
  expect(emailDue(null,'daily',now)).toBe(true);
  expect(emailDue(new Date(now.getTime()-3600000),'daily',now)).toBe(false);
  expect(emailDue(new Date(now.getTime()-86400000),'daily',now)).toBe(true);
  expect(emailDue(new Date(now.getTime()-86400000),'weekly',now)).toBe(false);
  expect(emailDue(new Date(now.getTime()-7*86400000),'weekly',now)).toBe(true);
 });
});
describe('M4 applicant notification database isolation and deduplication',()=>{
 test('separate applicant, saved search and opportunity prevent duplicate alerts',async()=>{
  const owner=await db.user.create({data:{email:'m4-a-'+crypto.randomUUID()+'@test.invalid',name:'M4 Fixture A',applicantProfile:{create:{}}},include:{applicantProfile:true}});
  const other=await db.user.create({data:{email:'m4-b-'+crypto.randomUUID()+'@test.invalid',name:'M4 Fixture B',applicantProfile:{create:{}}},include:{applicantProfile:true}});
  ids.push(owner.id,other.id);
  const a=owner.applicantProfile!.id,b=other.applicantProfile!.id;
  const opp=await db.opportunity.create({data:{title:'Driver in Kabul',slug:'m4-driver-'+crypto.randomUUID(),description:'Safe sample vacancy',country:'Afghanistan',jobType:'job',deadline:new Date(Date.now()+7*86400000)}});opps.push(opp.id);
  const search=await db.applicantSavedSearch.create({data:{applicantProfileId:a,name:'Kabul driver',profile:sample}});
  const pref=await db.applicantNotificationPreference.create({data:{applicantProfileId:a}});
  expect(pref.inAppEnabled).toBe(false);expect(pref.emailEnabled).toBe(false);
  const first=await db.applicantNotification.create({data:{applicantProfileId:a,savedSearchId:search.id,opportunityId:opp.id,evidence:{reasons:['preferred_role','province']}}});
  expect(await db.applicantNotification.count({where:{applicantProfileId:a}})).toBe(1);
  let duplicateRejected=false;
  try{await db.applicantNotification.create({data:{applicantProfileId:a,savedSearchId:search.id,opportunityId:opp.id}});}
  catch(err){duplicateRejected=err instanceof Error;}
  expect(duplicateRejected).toBe(true);
  expect(await db.applicantNotification.count({where:{applicantProfileId:a,savedSearchId:search.id,opportunityId:opp.id}})).toBe(1);
  // The API always applies account ID predicates for read/update.
  expect(await db.applicantNotification.count({where:{id:first.id,applicantProfileId:b}})).toBe(0);
  expect((await db.applicantNotification.updateMany({where:{id:first.id,applicantProfileId:b},data:{readAt:new Date()}})).count).toBe(0);
  expect((await db.applicantNotification.updateMany({where:{id:first.id,applicantProfileId:a},data:{readAt:new Date()}})).count).toBe(1);
  expect((await db.applicantNotification.findUnique({where:{id:first.id}}))?.readAt).not.toBeNull();
  await db.applicantNotificationPreference.update({where:{applicantProfileId:a},data:{emailEnabled:true,inAppEnabled:true}});
  const delivery=await db.applicantEmailDelivery.create({data:{notificationId:first.id}});
  expect(delivery.status).toBe('pending');
  await db.applicantEmailDelivery.updateMany({where:{id:delivery.id,status:'pending'},data:{status:'suppressed',errorCode:'consent_disabled'}});
  expect((await db.applicantEmailDelivery.findUnique({where:{id:delivery.id}}))?.status).toBe('suppressed');
 });
});
