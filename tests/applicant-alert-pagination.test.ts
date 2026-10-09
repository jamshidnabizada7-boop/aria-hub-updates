import { test, expect } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { matchMaterialVersion } from '../src/lib/applicants/match-alert-version';
const db=new PrismaClient();
test('material version ignores bookkeeping and changes with eligibility/deadline',()=>{
 const row={title:'Driver',deadline:new Date('2027-01-01'),requirements:'License',locations:[{province:'Kabul'}]};
 expect(matchMaterialVersion(row)).toBe(matchMaterialVersion({...row}));
 expect(matchMaterialVersion(row)).not.toBe(matchMaterialVersion({...row,requirements:'Two years experience'}));
 expect(matchMaterialVersion(row)).not.toBe(matchMaterialVersion({...row,publicationRevision:1}));
 expect(matchMaterialVersion({...row,locations:[{province:'Kabul'},{province:'Herat'}]})).toBe(matchMaterialVersion({...row,locations:[{province:'Herat'},{province:'Kabul'}]}));
});
test('reopening increments publication revision; translation bookkeeping does not',async()=>{
 const id='reopen-'+randomBytes(10).toString('hex');
 try{
  const row=await db.opportunity.create({data:{id,slug:id,title:'Driver',description:'Synthetic reopening test',status:'published'}});
  await db.opportunity.update({where:{id},data:{titleI18n:{fa:'راننده'}}});
  expect((await db.opportunity.findUniqueOrThrow({where:{id}})).publicationRevision).toBe(0);
  await db.opportunity.update({where:{id},data:{status:'expired'}});
  await db.opportunity.update({where:{id},data:{status:'published'}});
  expect((await db.opportunity.findUniqueOrThrow({where:{id}})).publicationRevision).toBe(1);
 }finally{await db.opportunity.deleteMany({where:{id}});}
});
test('scanner rotates past 100 saved searches and resumes beyond a 500-row page',async()=>{
 const url=new URL(process.env.DATABASE_URL||'postgresql://localhost/no_db');
 if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw Error('isolated_database_required');
 const users:string[]=[],opps:string[]=[];
 const prefix='alert-page-'+randomBytes(7).toString('hex');
 const profile={intents:['job'],education:'bachelors',nationality:'Afghanistan',residence:'Afghanistan',destinations:['Afghanistan'],fieldArea:'any',preferredRoles:['driver'],preferredProvinces:['Kabul'],skills:['Driving'],lang:'en',explainWithAi:false};
 try{
  for(let i=0;i<11;i++){
   const user=await db.user.create({data:{email:prefix+i+'@test.invalid',emailVerified:new Date(),applicantProfile:{create:{notificationPreference:{create:{inAppEnabled:true}},savedSearches:{create:Array.from({length:i===10?1:10},(_,j)=>({name:'Driver '+j,profile}))}}}}});users.push(user.id);
  }
  const base=Date.now()+1000;
  await db.opportunity.createMany({data:Array.from({length:501},(_,i)=>({id:prefix+i,slug:prefix+i,title:'Teacher',description:'Teacher vacancy',status:'published' as const,jobType:'job',country:'Afghanistan',updatedAt:new Date(base+i)}))});
  opps.push(...Array.from({length:501},(_,i)=>prefix+i));
  const run=()=>{
   const result=spawnSync(process.execPath,['--conditions=react-server','scripts/applicant-match-alert-worker.ts','--apply'],{cwd:process.cwd(),env:{...process.env,APPLICANT_AUTH_ENABLED:'true',APPLICANT_MATCHER_V3_ENABLED:'true',APPLICANT_NOTIFICATIONS_ENABLED:'true',APPLICANT_MATCH_ALERT_WORKER_ENABLED:'true'},encoding:'utf8',timeout:60000});
   if(result.status!==0)throw Error('scanner_failed:'+result.stderr.slice(-300));
  };
  run();
  expect(await db.applicantSavedSearch.count({where:{applicantProfile:{userId:{in:users}},lastScannedAt:{not:null}}})).toBe(100);
  run();
  expect(await db.applicantSavedSearch.count({where:{applicantProfile:{userId:{in:users}},lastScannedAt:{not:null}}})).toBe(101);
  expect(await db.applicantSavedSearch.count({where:{applicantProfile:{userId:{in:users}},scanCursorId:prefix+'500'}})).toBeGreaterThan(0);
 }finally{
  await db.user.deleteMany({where:{id:{in:users}}});await db.opportunity.deleteMany({where:{id:{in:opps}}});await db.$disconnect();
 }
},120000);
