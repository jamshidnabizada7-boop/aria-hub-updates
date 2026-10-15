import {test,expect,afterAll} from 'bun:test';
import {createHash,randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
import {putMcpState} from '../src/lib/mcp-state';
import {claimRepairBatch,previewRepair,commitRepair,releaseRepairBatch} from '../src/lib/opportunity-repair';
import {applicationFormEvidence,classifyOpportunityApplyUrl} from '../src/lib/apply';

const database=new URL(process.env.DATABASE_URL||'http://invalid');
if(!['127.0.0.1','localhost'].includes(database.hostname)||!database.pathname.endsWith('_test'))throw new Error('Requires isolated localhost *_test database');
const prefix=`embedded-form-${randomUUID()}`;
const source='https://official.example.org/jobs/security-manager/';const form=`${source}#form`;
const quote='Please send your application (CV and letter of motivation) by email or below, including the reference: CSM/OPT.';
const key=(claim:string,id:string,url:string)=>`repair-source:${claim}:${id}:${createHash('sha256').update(url).digest('hex')}`;
afterAll(async()=>{await db.auditLog.deleteMany({where:{entityId:{startsWith:prefix}}});await db.opportunity.deleteMany({where:{id:{startsWith:prefix}}});await db.$disconnect();});

test('Gateway repairs an embedded form on the same vacancy URL, preserves translations and refuses stale evidence',async()=>{
 const row=await db.opportunity.create({data:{id:prefix,slug:prefix,title:'Security Manager',description:quote,status:'published',sourceUrl:source,originalUrl:source,applyUrl:form,applyUrlType:'direct_application',guidelines:'Reviewed instructions',guidelinesI18n:{en:'Reviewed instructions',fa:'دستورالعمل',ps:'لارښوونې'},faStatus:'complete',psStatus:'complete'}});
 const others=(await db.opportunity.findMany({where:{id:{not:row.id}},select:{id:true}})).map(r=>r.id);
 const batch=await claimRepairBatch(prefix,'apply',1,false,others);expect(batch.items[0].id).toBe(row.id);
 const input={claimId:batch.claimId!,id:row.id,sourceHash:batch.items[0].sourceHash,patch:{applyUrl:form},evidence:[{field:'applyUrl',sourceUrl:source,quote}]};
 const cached={url:source,text:quote,links:[{url:form,label:'Application form (CV upload)'}],applicationForms:[{url:form,label:'Application form (CV upload)'}],capturedAt:new Date().toISOString()};
 const expires=new Date(Date.now()+600000);
 await putMcpState(key(batch.claimId!,row.id,source),cached,expires);
 await expect(previewRepair(prefix,input)).rejects.toThrow('read_application_destination_before_saving');
 await putMcpState(key(batch.claimId!,row.id,form),{...cached,url:form,applicationForms:[]},expires);
 await expect(previewRepair(prefix,input)).rejects.toThrow('application_form_not_verified_at_destination');
 await putMcpState(key(batch.claimId!,row.id,form),{...cached,url:form},expires);
 expect((await previewRepair(prefix,input)).valid).toBe(true);
 const committed=await commitRepair(prefix,input);expect(committed.health.hasRealApply).toBe(true);
 const saved=await db.opportunity.findUniqueOrThrow({where:{id:row.id}});
 expect(saved.applyUrlType).toBe('application_form');expect(saved.applyUrlEvidence).toBe(applicationFormEvidence(form));expect(classifyOpportunityApplyUrl(saved)).toBe('application_form');
 expect(saved.status).toBe('published');expect(saved.guidelinesI18n).toEqual(row.guidelinesI18n);expect(saved.faStatus).toBe('complete');expect(saved.psStatus).toBe('complete');
 await expect(commitRepair(prefix,input)).rejects.toThrow('row_not_in_active_claim');
 await releaseRepairBatch(prefix,batch.claimId!,'test complete');
});
