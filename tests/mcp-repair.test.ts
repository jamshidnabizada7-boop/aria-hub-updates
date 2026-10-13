import { describe,test,expect,beforeAll,afterAll } from 'bun:test';
import { createHash,randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { putMcpState } from '../src/lib/mcp-state';
import { claimRepairBatch,previewRepair,commitRepair,releaseRepairBatch } from '../src/lib/opportunity-repair';
import { claimFactTranslations,commitFactTranslations,releaseFactTranslations,validFactTranslation } from '../src/lib/mcp-fact-translations';
import { issueTokens,verifyMcpToken,exchangeRefreshToken,MCP_SCOPES,REPAIR_SCOPES,resourceForScopes,revokeMcpToken,getClient } from '../src/lib/mcp-oauth';
import { POST as repairPost } from '../src/app/mcp/repair/route';
import { categoryEvidence,matchEvidence } from '../src/lib/repair-evidence';
import { validateIntegrity } from '../src/lib/ai/translate-chunks';

const url=new URL(process.env.DATABASE_URL||'http://invalid');
if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw new Error('This suite requires an isolated localhost *_test database');
const prefix=`mcpfixture-${randomUUID()}`;
const source='https://example.org/vacancy';
let seq=0;
async function fixture(extra:Record<string,unknown>={}){const id=`${prefix}-${++seq}`;return db.opportunity.create({data:{id,slug:id,title:'Program Officer',description:'Job vacancy in Afghanistan. Apply by email to careers@example.net. At least 3 years of experience required.',status:'published',sourceUrl:`${source}?id=${id}`,originalUrl:source,deadline:new Date(Date.now()+86400000),...extra}});}
async function claim(id:string){const batch=await claimRepairBatch(prefix,'all',10);const row=batch.items.find(i=>i.id===id);expect(row).toBeDefined();return {claimId:batch.claimId!,row:row!};}
async function cache(claimId:string,id:string,text:string){await putMcpState(`repair-source:${claimId}:${id}:${createHash('sha256').update(source).digest('hex')}`,{url:source,text,links:[{url:'mailto:careers@example.net',label:'Apply'}]},new Date(Date.now()+600000));}
beforeAll(async()=>{await db.$executeRaw`ALTER TABLE "McpSecurityState" ENABLE ROW LEVEL SECURITY`;});
afterAll(async()=>{await db.opportunity.deleteMany({where:{id:{startsWith:prefix}}});await db.opportunityCategory.deleteMany({where:{id:{startsWith:prefix}}});await db.$disconnect();});

describe('Repair provenance, stale source and safe saves',()=>{
  test('Released blocked records rotate behind untouched records; a run can exclude its seen IDs',async()=>{
    const existing=(await db.opportunity.findMany({select:{id:true}})).map(r=>r.id);
    const older=await fixture();const newer=await fixture();
    const first=await claimRepairBatch(prefix,'all',1,false,existing);
    expect(first.items[0].id).toBe(newer.id);
    await releaseRepairBatch(prefix,first.claimId!,'Source blocked');
    const next=await claimRepairBatch(prefix,'all',1,false,existing);
    expect(next.items[0].id).toBe(older.id);
    await releaseRepairBatch(prefix,next.claimId!,'Source blocked');
    const exhausted=await claimRepairBatch(prefix,'all',1,false,[...existing,older.id,newer.id]);
    expect(exhausted.count).toBe(0);
    await db.opportunity.update({where:{id:newer.id},data:{description:'Changed source facts for fresh review'}});
    const changed=await claimRepairBatch(prefix,'all',1,false,existing);
    expect(changed.items[0].id).toBe(newer.id);
    await releaseRepairBatch(prefix,changed.claimId!,'test cleanup');
  });
  test('An identical patch cannot create a fake successful repair',async()=>{
    const row=await fixture({country:'Afghanistan'});const c=await claim(row.id);
    await cache(c.claimId,row.id,row.description);
    await expect(commitRepair(prefix,{claimId:c.claimId,id:row.id,sourceHash:c.row.sourceHash,patch:{country:'Afghanistan'},evidence:[{field:'country',sourceUrl:source,quote:'Afghanistan'}]})).rejects.toThrow('no_changes_to_save');
    expect(await db.auditLog.count({where:{entityId:row.id,action:'opportunity.source_repair'}})).toBe(0);
    await releaseRepairBatch(prefix,c.claimId,'test cleanup');
  });
  test('Unknown and privileged fields are rejected',async()=>{const row=await fixture();const c=await claim(row.id);await expect(previewRepair(prefix,{claimId:c.claimId,id:row.id,sourceHash:c.row.sourceHash,patch:{status:'published'},evidence:[{field:'status',sourceUrl:source,quote:'published'}]})).rejects.toThrow();await releaseRepairBatch(prefix,c.claimId,'test');});
  test('Invented quotes cannot repair a missing country',async()=>{const row=await fixture();const c=await claim(row.id);await cache(c.claimId,row.id,row.description);await expect(previewRepair(prefix,{claimId:c.claimId,id:row.id,sourceHash:c.row.sourceHash,patch:{country:'Germany'},evidence:[{field:'country',sourceUrl:source,quote:'Germany'}]})).rejects.toThrow('source_quote_not_verified');await releaseRepairBatch(prefix,c.claimId,'test');});
  test('Claim belongs to its authorized client',async()=>{const row=await fixture();const c=await claim(row.id);await expect(releaseRepairBatch('other-client',c.claimId,'test')).rejects.toThrow('claim_invalid');await releaseRepairBatch(prefix,c.claimId,'test');});
  test('Preview is read only; commit keeps drafts, manual translations and updates English source',async()=>{
    const category=await db.opportunityCategory.create({data:{id:`${prefix}-category`,name:'Jobs',slug:`${prefix}-jobs`}});
    const row=await fixture({status:'draft',eligibility:'Old eligibility',eligibilityI18n:{en:'Old eligibility',fa:'متن دستی'},translationOrigin:{fa:'MANUAL'}});
    const c=await claim(row.id);const text='Job vacancy in Afghanistan. Apply by email to careers@example.net. At least 3 years of experience required.';await cache(c.claimId,row.id,text);
    const input={claimId:c.claimId,id:row.id,sourceHash:c.row.sourceHash,patch:{country:'Afghanistan',applyUrl:'mailto:careers@example.net',eligibility:'At least 3 years of experience required.'},evidence:[{field:'country',sourceUrl:source,quote:'Job vacancy in Afghanistan.'},{field:'applyUrl',sourceUrl:source,quote:'Apply by email to careers@example.net.'},{field:'eligibility',sourceUrl:source,quote:'At least 3 years of experience required.'}]};
    expect((await previewRepair(prefix,input)).valid).toBe(true);expect((await db.opportunity.findUniqueOrThrow({where:{id:row.id}})).country).toBeNull();
    expect((await commitRepair(prefix,input)).status).toBe('draft');const saved=await db.opportunity.findUniqueOrThrow({where:{id:row.id}});
    expect(saved.eligibilityI18n).toEqual({en:input.patch.eligibility,fa:'متن دستی'});expect(saved.faStatus).toBe('pending');expect(saved.translationOrigin).toEqual({fa:'MANUAL_STALE'});
    await expect(commitRepair(prefix,input)).rejects.toThrow('row_not_in_active_claim');
    expect(category.id).toContain(prefix);
  });
  test('Concurrent source edits reject the whole save',async()=>{const row=await fixture();const c=await claim(row.id);await cache(c.claimId,row.id,row.description);await db.opportunity.update({where:{id:row.id},data:{description:'Updated original source'}});await expect(commitRepair(prefix,{claimId:c.claimId,id:row.id,sourceHash:c.row.sourceHash,patch:{country:'Afghanistan'},evidence:[{field:'country',sourceUrl:source,quote:'Afghanistan'}]})).rejects.toThrow('source_hash_changed');expect((await db.opportunity.findUniqueOrThrow({where:{id:row.id}})).country).toBeNull();await releaseRepairBatch(prefix,c.claimId,'test');});
  test('Source article is not accepted as an application portal',async()=>{const row=await fixture();const c=await claim(row.id);await cache(c.claimId,row.id,row.description);await expect(previewRepair(prefix,{claimId:c.claimId,id:row.id,sourceHash:c.row.sourceHash,patch:{applyUrl:source},evidence:[{field:'applyUrl',sourceUrl:source,quote:'Apply by email'}]})).rejects.toThrow('application_destination_not_real');await releaseRepairBatch(prefix,c.claimId,'test');});
  test('Category, match arrays and numbers need relevant quoted facts',()=>{expect(categoryEvidence('scholarships','Scholarships','Job vacancy')).toBe(false);expect(categoryEvidence('jobs','Jobs','Job vacancy')).toBe(true);expect(matchEvidence('minAge',27,'Age requirement starts in 2027')).toBe(false);expect(matchEvidence('minAge',27,'Minimum age 27 years')).toBe(true);expect(matchEvidence('minExperienceYears',3,'3 positions available')).toBe(false);expect(matchEvidence('eligibleCountries',['Germany'],'Applicants in Afghanistan')).toBe(false);});
});

describe('Complete public fact translations',()=>{
  test('Unfinished fact records rotate and failed IDs can be excluded for the run',async()=>{
    const existing=(await db.opportunity.findMany({select:{id:true}})).map(r=>r.id);
    const older=await fixture({extractedData:{contractDuration:'Renewable contract for 3 years'}});
    const newer=await fixture({extractedData:{contractDuration:'Renewable contract for 4 years'}});
    const first=await claimFactTranslations(prefix,1,12000,false,existing);
    expect(first.items[0].id).toBe(newer.id);await releaseFactTranslations(prefix,first.claimId!);
    const next=await claimFactTranslations(prefix,1,12000,false,existing);
    expect(next.items[0].id).toBe(older.id);await releaseFactTranslations(prefix,next.claimId!);
    expect((await claimFactTranslations(prefix,1,12000,false,[...existing,newer.id,older.id])).count).toBe(0);
  });
  test('Single digit durations and identifiers cannot be dropped',()=>{expect(validFactTranslation('3 years','سه سال')).toBe(false);expect(validFactTranslation('3 years','۳ سال')).toBe(true);});
  test('Both SQL gateway and body validator reject single-digit changes',async()=>{expect(validateIntegrity('3 years of experience','۱۳ سال تجربه').length).toBeGreaterThan(0);const result=await db.$queryRaw<{problems:string[]}[]>`SELECT public.aria_tgw_validate_field('3 years of experience','۱۳ سال تجربه') AS problems`;expect(result[0].problems).toContain('number_lost:3');});
  test('Partial facts reject atomically; full Afghan Persian and Pashto facts save',async()=>{
    const row=await fixture({extractedData:{contractDuration:'Renewable contract for 3 years',wpPostId:42361,jobId:'opaque'},faStatus:'complete',psStatus:'complete'});
    const batch=await claimFactTranslations(prefix,10,12000);const plan=batch.items.find(i=>i.id===row.id)!;expect(plan).toBeDefined();expect(plan.fa).toEqual({contractDuration:'Renewable contract for 3 years'});expect(plan.ps).toEqual({contractDuration:'Renewable contract for 3 years'});
    await expect(commitFactTranslations(prefix,{claimId:batch.claimId,items:[{id:row.id,sourceHash:plan.sourceHash,fa:{contractDuration:'۳ سال'}}]})).rejects.toThrow('fact_fields_incomplete:ps');
    expect((await db.opportunity.findUniqueOrThrow({where:{id:row.id}})).extractedDataI18n).toBeNull();
    await commitFactTranslations(prefix,{claimId:batch.claimId,items:[{id:row.id,sourceHash:plan.sourceHash,fa:{contractDuration:'۳ سال'},ps:{contractDuration:'۳ کاله'}}]});
    const saved=await db.opportunity.findUniqueOrThrow({where:{id:row.id}});expect(saved.extractedDataI18n).toEqual({fa:{contractDuration:'۳ سال'},ps:{contractDuration:'۳ کاله'},_sources:{fa:{contractDuration:'Renewable contract for 3 years'},ps:{contractDuration:'Renewable contract for 3 years'}}});expect(saved.status).toBe('published');
  });
  test('Concurrent source changes block stale translations',async()=>{const row=await fixture({extractedData:{contractDuration:'Renewable contract for 4 years'}});const batch=await claimFactTranslations(prefix,10,12000);const plan=batch.items.find(i=>i.id===row.id)!;await db.opportunity.update({where:{id:row.id},data:{extractedData:{contractDuration:'Renewable contract for 5 years'}}});await expect(commitFactTranslations(prefix,{claimId:batch.claimId,items:[{id:row.id,sourceHash:plan.sourceHash,fa:{contractDuration:'۴ سال'},ps:{contractDuration:'۴ کاله'}}]})).rejects.toThrow('fact_source_hash_changed');});
  test('Manual fact translations are never automatically claimed',async()=>{const row=await fixture({extractedData:{contractDuration:'6 years'},translationOrigin:{fa:'MANUAL',ps:'MANUAL'}});const batch=await claimFactTranslations(prefix,10,12000);expect(batch.items.some(i=>i.id===row.id)).toBe(false);});
});

describe('OAuth scope boundaries and durable replay protection',()=>{
  test('Unknown registered clients and mixed resource scopes are rejected',async()=>{expect(await getClient('aria_mcp_invented')).toBeUndefined();expect(()=>resourceForScopes([MCP_SCOPES.WRITE,REPAIR_SCOPES.WRITE])).toThrow('resources must');});
  test('Translation grants cannot call repair tools',async()=>{const t=await issueTokens('suite',[MCP_SCOPES.WRITE]);expect((await verifyMcpToken(t.access_token,'repair')).valid).toBe(false);const res=await repairPost(new Request('https://www.myariahub.com/mcp/repair',{method:'POST',headers:{authorization:`Bearer ${t.access_token}`},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'repairQueueStatus',arguments:{}}})}));expect(res.status).toBe(401);});
  test('Refresh cannot switch clients, escalate scope or replay',async()=>{const t=await issueTokens('suite',[REPAIR_SCOPES.READ]);await expect(exchangeRefreshToken({refreshToken:t.refresh_token,clientId:'other'})).rejects.toThrow('client mismatch');await expect(exchangeRefreshToken({refreshToken:t.refresh_token,clientId:'suite',scopes:[REPAIR_SCOPES.READ,REPAIR_SCOPES.WRITE]})).rejects.toThrow('cannot expand');const fresh=await exchangeRefreshToken({refreshToken:t.refresh_token,clientId:'suite'});expect((await verifyMcpToken(fresh.access_token,'repair')).valid).toBe(true);await expect(exchangeRefreshToken({refreshToken:t.refresh_token,clientId:'suite'})).rejects.toThrow('invalid_grant');});
  test('Revocation invalidates a valid access token',async()=>{const t=await issueTokens('suite',[REPAIR_SCOPES.READ]);expect((await verifyMcpToken(t.access_token,'repair')).valid).toBe(true);await revokeMcpToken(t.access_token);expect((await verifyMcpToken(t.access_token,'repair')).valid).toBe(false);});
});
