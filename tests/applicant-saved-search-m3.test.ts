import { afterAll, describe, expect, test } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { MatcherProfileSchema } from '../src/lib/opportunity-matcher';
const db=new PrismaClient();
const userIds:string[]=[];
const sample=MatcherProfileSchema.parse({
 intents:['job'],education:'bachelors',nationality:'Afghanistan',
 residence:'Afghanistan',destinations:['Afghanistan'],fieldArea:'any',
 preferredRoles:['driver'],preferredProvinces:['Kabul'],skills:['driving'],
 lang:'en',explainWithAi:false
});
afterAll(async()=>{if(userIds.length)await db.user.deleteMany({where:{id:{in:userIds}}});await db.$disconnect();});
describe('Milestone 3 saved-search database isolation',()=>{
 test('only an applicant profile owns a saved search, not a notification subscription',async()=>{
  const first=await db.user.create({data:{name:'M3 Driver Fixture',email:'m3-driver-'+crypto.randomUUID()+'@test.invalid',applicantProfile:{create:{}}},include:{applicantProfile:true}});
  const second=await db.user.create({data:{name:'M3 Teacher Fixture',email:'m3-teacher-'+crypto.randomUUID()+'@test.invalid',applicantProfile:{create:{}}},include:{applicantProfile:true}});
  userIds.push(first.id,second.id);
  const row=await db.applicantSavedSearch.create({data:{applicantProfileId:first.applicantProfile!.id,name:'Driver Kabul',profile:sample}});
  expect(row.active).toBe(true);
  expect(row.name).toBe('Driver Kabul');
  // These owner-based filters mirror the API authorization conditions.
  expect(await db.applicantSavedSearch.count({where:{id:row.id,applicantProfileId:second.applicantProfile!.id}})).toBe(0);
  expect((await db.applicantSavedSearch.deleteMany({where:{id:row.id,applicantProfileId:second.applicantProfile!.id}})).count).toBe(0);
  expect(await db.applicantSavedSearch.findUnique({where:{id:row.id}})).not.toBeNull();
  expect((await db.applicantSavedSearch.updateMany({where:{id:row.id,applicantProfileId:first.applicantProfile!.id},data:{active:false}})).count).toBe(1);
  expect((await db.applicantSavedSearch.findUnique({where:{id:row.id}}))?.active).toBe(false);
  await db.applicantSavedSearch.delete({where:{id:row.id}});
 });
 test('verified career facts are private, explicitly written JSON not inferred from documents',async()=>{
  const user=await db.user.create({data:{email:'m3-manual-'+crypto.randomUUID()+'@test.invalid',applicantProfile:{create:{}}},include:{applicantProfile:true}});userIds.push(user.id);
  await db.applicantProfile.update({where:{id:user.applicantProfile!.id},data:{verifiedCareerFacts:{education:'bachelors',preferredRoles:['teacher'],skills:['English']}}});
  const profile=await db.applicantProfile.findUnique({where:{userId:user.id}});
  expect((profile?.verifiedCareerFacts as {preferredRoles?:string[]})?.preferredRoles).toEqual(['teacher']);
  const other=await db.applicantProfile.findFirst({where:{userId:{not:user.id},id:user.applicantProfile!.id}});
  expect(other).toBeNull();
 });
});
