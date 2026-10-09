import {describe,expect,test} from 'bun:test';
import {JOB_ROLE_IDS,recognizeJobRoles,roleMatchesPreference} from '../src/lib/job-role-taxonomy';
import {MatcherProfileSchema,rankOpportunities,rankOpportunity,type MatcherOpportunity,type MatcherProfile} from '../src/lib/opportunity-matcher';
const profile:MatcherProfile={
 intents:['job'],education:'bachelors',nationality:'Afghanistan',
 residence:'Afghanistan',destinations:['Afghanistan'],fieldArea:'any',
 preferredRoles:['driver'],preferredProvinces:['Kabul'],skills:['Driving'],lang:'en',
 explainWithAi:false
};
function vacancy(overrides:Partial<MatcherOpportunity>={}):MatcherOpportunity{
 return {
 id:'id1',slug:'driver-kabul',title:'Driver',organization:'Demo NGO',
 categorySlug:'jobs',categoryName:'Jobs',jobType:'job',country:'Afghanistan',deadline:new Date(Date.now()+86400000*20),
 educationReq:'High school',experience:null,eligibility:'Afghan applicants are eligible',
 requirements:'Valid driving license and practical Driving skills',
 benefits:null,tags:'["Driving"]',extractedData:null,sourceName:'Organization',
 lastChecked:new Date(),updatedAt:new Date(),
 locations:[{country:'Afghanistan',province:'Kabul',city:'Kabul'}],
 ...overrides
 };
}
describe('M3 job taxonomy deterministic multilingual semantics',()=>{
 test('contains a meaningful curated career catalog',()=>expect(JOB_ROLE_IDS.length).toBeGreaterThanOrEqual(25));
 test('recognizes driver, teacher, nurse and accountant roles in English',()=>{
  expect(recognizeJobRoles('Delivery Driver')).toContain('driver');
  expect(recognizeJobRoles('Primary School Teacher')).toContain('teacher');
  expect(recognizeJobRoles('Midwife and Nurse')).toContain('nurse');
  expect(recognizeJobRoles('Accountant')).toContain('accountant');
 });
 test('Persian Afghanistan and Pashto descriptions use same role IDs',()=>{
  expect(recognizeJobRoles('موترران برای کابل')).toContain('driver');
  expect(recognizeJobRoles('ښوونکی د ښوونځي لپاره')).toContain('teacher');
  expect(recognizeJobRoles('محاسب')).toContain('accountant');
 });
 test('does not match role words embedded in unrelated words',()=>{
  expect(recognizeJobRoles('Driverless Vehicle Technician')).not.toContain('driver');
  expect(recognizeJobRoles('Information Technology Officer')).not.toContain('teacher');
 });
 test('selected driver never matches job whose title is Teacher',()=>{
  expect(roleMatchesPreference(['driver'],'English Teacher').matched).toHaveLength(0);
 });
});
describe('M3 role and province relevance with evidence',()=>{
 test('an open driver vacancy in Kabul is recommended for driver / Kabul',()=>{
  const res=rankOpportunity(profile,vacancy());
  expect(res).not.toBeNull();
  expect(res?.evidence.reasons).toContain('preferred_role');
  expect(res?.evidence.reasons).toContain('province');
 });
 test('jobType job without category still enforces teacher role and Kabul province',()=>{
  const teacher={...profile,preferredRoles:['teacher'] as ['teacher']};
  expect(rankOpportunity(teacher,vacancy({title:'Delivery Driver',categorySlug:null,categoryName:null,jobType:'job'}))).toBeNull();
  expect(rankOpportunity(teacher,vacancy({title:'Primary School Teacher',categorySlug:null,categoryName:null,jobType:'job'}))).not.toBeNull();
  expect(rankOpportunity(teacher,vacancy({title:'Primary School Teacher',categorySlug:null,jobType:'job',locations:[{country:'Afghanistan',province:'Herat'}]}))).toBeNull();
 });
 test('a teaching vacancy in Kabul is excluded from driver results',()=>{
  expect(rankOpportunity(profile,vacancy({title:'Primary Teacher'}))).toBeNull();
 });
 test('a driver vacancy in Herat is excluded from Kabul-only results',()=>{
  expect(rankOpportunity(profile,vacancy({locations:[{country:'Afghanistan',province:'Herat'}]}))).toBeNull();
 });
 test('unknown province never creates a fabricated province match',()=>{
  const x=rankOpportunity(profile,vacancy({locations:[]}));
  expect(x?.evidence.reasons).not.toContain('province');
  expect(x?.evidence.unknowns).toContain('province');
 });
 test('known nationality conflict still suppresses role-matched jobs',()=>{
  const row=vacancy({eligibility:null,structuredFacts:{eligibleNationalities:['India'],reviewed:true}});
  expect(rankOpportunities(profile,[row])).toHaveLength(0);
 });
 test('roles never affect scholarship intent unless user requests jobs',()=>{
  const p={...profile,intents:['scholarship'] as ['scholarship'],destinations:['anywhere']};
  const row=vacancy({categorySlug:'scholarships',categoryName:'Scholarships',title:'Engineering Scholarship'});
  expect(rankOpportunity(p,row)).not.toBeNull();
 });
 test('language selection has no effect on deterministic ranking',()=>{
  const signatures=(['en','fa','ps'] as const).map(lang=>rankOpportunities({...profile,lang},[vacancy()]).map(x=>x.rankScore));
  expect(signatures[0]).toEqual(signatures[1]);
  expect(signatures[1]).toEqual(signatures[2]);
 });
 test('unvalidated/unknown roles are rejected by request schema',()=>{
  expect(MatcherProfileSchema.safeParse({...profile,preferredRoles:['unreal_role']}).success).toBe(false);
 });
 test('never claims recommendation is a hiring probability',()=>{
  const res=rankOpportunity(profile,vacancy());expect(JSON.stringify(res)).not.toMatch(/chanceOfAcceptance|hiringProbability/);
 });
 test('overlong skills, more than 12 roles and incorrect provinces rejected',()=>{
  expect(MatcherProfileSchema.safeParse({...profile,skills:['x'.repeat(120)]}).success).toBe(false);
  expect(MatcherProfileSchema.safeParse({...profile,preferredRoles:JOB_ROLE_IDS.slice(0,13)}).success).toBe(false);
  expect(MatcherProfileSchema.safeParse({...profile,preferredProvinces:['Atlantis']}).success).toBe(false);
 });
});
