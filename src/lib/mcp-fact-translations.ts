import 'server-only';
import { createHash,randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from './db';
import { putMcpState,readMcpState } from './mcp-state';
import { factObject,publicFactSources,factNeedsTranslation } from './opportunity-facts';
import { validateIntegrity,validateTranslation,normalizeDigits } from './ai/translate-chunks';
import type { Prisma } from '@prisma/client';

const select={id:true,title:true,language:true,extractedData:true,extractedDataI18n:true,translationOrigin:true} satisfies Prisma.OpportunitySelect;
type Row=Prisma.OpportunityGetPayload<{select:typeof select}>;
type Claim={client:string;items:{id:string;sourceHash:string;fa:Record<string,string>;ps:Record<string,string>}[];expiresAt:string;done:string[]};
type Attempt={id:string;attemptedAt:number};
const key=(id:string)=>`fact-claim:${id}`;
const hash=(row:Row)=>createHash('sha256').update(JSON.stringify([row.id,row.language,row.extractedData,row.extractedDataI18n,row.translationOrigin])).digest('hex');
const locked=(row:Row,lang:'fa'|'ps')=>/^MANUAL/.test(String(factObject(row.translationOrigin)[lang]||''));
function needed(row:Row,lang:'fa'|'ps'){
  if(locked(row,lang))return {};
  return Object.fromEntries(publicFactSources(row.extractedData).filter(s=>factNeedsTranslation(s,row.extractedDataI18n,lang,row.language)).map(s=>[s.key,s.value]));
}
export async function factTranslationStatus(){
  const rows=await db.opportunity.findMany({where:{status:'published'},select});
  let pendingFa=0,pendingPs=0,manualLocked=0;
  for(const row of rows){pendingFa+=Object.keys(needed(row,'fa')).length;pendingPs+=Object.keys(needed(row,'ps')).length;manualLocked+=Number(locked(row,'fa')||locked(row,'ps'));}
  return {pendingFa,pendingPs,manualLocked,unit:'public facts',technicalKeysExcluded:true};
}
export async function claimFactTranslations(client:string,limit:number,charBudget:number,includeExpired=false,excludeIds:string[]=[]){
  return db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(742199)`;
    const now=new Date();const day=new Date(new Date(now.getTime()+270*60000).toISOString().slice(0,10)+'T00:00:00Z');
    const rows=await tx.opportunity.findMany({where:{status:'published',...(!includeExpired?{OR:[{deadline:null},{deadline:{gt:now}},{deadline:day}]}:{})},select,orderBy:{createdAt:'desc'}});
    const active=await tx.$queryRaw<{data:Claim}[]>`SELECT data FROM "McpSecurityState" WHERE key LIKE 'fact-claim:%' AND "expiresAt">now()`;
    const busy=new Set(active.flatMap(c=>c.data.items.filter(i=>!c.data.done.includes(i.id)).map(i=>i.id)));
    const attempts=await tx.$queryRaw<{data:Attempt}[]>`SELECT data FROM "McpSecurityState" WHERE key LIKE 'fact-attempt:%' AND "expiresAt">now()`;
    const attemptedAt=new Map(attempts.map(a=>[a.data.id,a.data.attemptedAt]));
    rows.sort((a,b)=>(attemptedAt.get(a.id)||0)-(attemptedAt.get(b.id)||0));
    const excluded=new Set(excludeIds);
    const items:Claim['items']=[];let chars=0;
    for(const row of rows){
      if(busy.has(row.id)||excluded.has(row.id))continue;
      const fa=needed(row,'fa');
      // A manual Persian translation is never replaced, and Pashto stays
      // gated until the Persian facts for that record are complete.
      const ps=locked(row,'fa')&&publicFactSources(row.extractedData).some(s=>factNeedsTranslation(s,row.extractedDataI18n,'fa',row.language))?{}:needed(row,'ps');
      const size=[...Object.values(fa),...Object.values(ps)].reduce((n,v)=>n+v.length,0);
      if(!size)continue;if(chars+size>charBudget)continue;
      items.push({id:row.id,sourceHash:hash(row),fa,ps});chars+=size;
      if(items.length>=limit)break;
    }
    const claimId=randomUUID(),expiresAt=new Date(Date.now()+45*60000);
    if(items.length)await putMcpState(key(claimId),{client,items,expiresAt:expiresAt.toISOString(),done:[]},expiresAt,tx);
    for(const item of items)await putMcpState(`fact-attempt:${item.id}`,{id:item.id,attemptedAt:Date.now()},new Date(Date.now()+30*86400000),tx);
    return {claimId:items.length?claimId:null,expiresAt:items.length?expiresAt.toISOString():null,count:items.length,chars,items,instructions:'Translate every key in each supplied fa and ps map, preserving names, codes and all numbers. Persian Afghanistan first. Do not translate technical IDs. These facts are separate from the main body translations.'};
  },{timeout:30000});
}
export const factCommitInput=z.object({claimId:z.string().uuid(),items:z.array(z.object({id:z.string().max(100),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),fa:z.record(z.string(),z.string().max(20000)).optional(),ps:z.record(z.string(),z.string().max(20000)).optional()}).strict()).min(1).max(10)}).strict();
export function validFactTranslation(source:string,result:string){
  if(!/[\u0600-\u06ff]/.test(result)||result.trim().toLowerCase()===source.trim().toLowerCase()||!validateTranslation(source,result)||validateIntegrity(source,result).length)return false;
  const src=normalizeDigits(source),out=normalizeDigits(result);
  // The general body validator permits single-digit changes. Public facts
  // often contain a one-digit duration/age/vacancy count, so protect those too.
  const nums=src.match(/\d+(?:[.,]\d+)*/g)||[];
  const outputNumbers=(out.match(/\d+(?:[.,]\d+)*/g)||[]).map(n=>n.replace(/,/g,''));
  return nums.every(n=>outputNumbers.includes(n.replace(/,/g,'')));
}
export async function commitFactTranslations(client:string,input:unknown){
  const request=factCommitInput.parse(input);
  return db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(742199)`;
    const claim=await readMcpState<Claim>(key(request.claimId),tx);
    if(!claim||claim.client!==client)throw new Error('fact_claim_invalid_or_expired');
    if(new Set(request.items.map(i=>i.id)).size!==request.items.length)throw new Error('duplicate_record');
    for(const item of [...request.items].sort((a,b)=>a.id.localeCompare(b.id))){
      const plan=claim.items.find(i=>i.id===item.id);
      if(!plan||claim.done.includes(item.id))throw new Error('row_not_in_active_fact_claim');
      await tx.$queryRaw`SELECT id FROM "Opportunity" WHERE id=${item.id} FOR UPDATE`;
      const row=await tx.opportunity.findUniqueOrThrow({where:{id:item.id},select});
      if(plan.sourceHash!==item.sourceHash||hash(row)!==item.sourceHash)throw new Error('fact_source_hash_changed');
      const root=factObject(row.extractedDataI18n),sources=factObject(root._sources);
      const next:Record<string,unknown>={...root,_sources:{...sources}};
      for(const lang of ['fa','ps'] as const){
        const fields=plan[lang],results=item[lang]||{};
        if(Object.keys(fields).sort().join('|')!==Object.keys(results).sort().join('|'))throw new Error(`fact_fields_incomplete:${lang}`);
        if(!Object.keys(fields).length)continue;
        if(locked(row,lang))throw new Error('manual_translation_locked');
        for(const [field,source] of Object.entries(fields)){if(!validFactTranslation(source,results[field]))throw new Error(`fact_translation_invalid:${lang}:${field}`);}
        next[lang]={...factObject(root[lang]),...results};
        (next._sources as Record<string,unknown>)[lang]={...factObject(sources[lang]),...fields};
      }
      await tx.opportunity.update({where:{id:item.id},data:{extractedDataI18n:next as Prisma.InputJsonObject}});
      await tx.auditLog.create({data:{action:'opportunity.fact_translation',entity:'Opportunity',entityId:item.id,details:JSON.stringify({client,claimId:request.claimId,fieldsFa:Object.keys(plan.fa),fieldsPs:Object.keys(plan.ps)})}});
    }
    await putMcpState(key(request.claimId),{...claim,done:[...claim.done,...request.items.map(i=>i.id)]},new Date(claim.expiresAt),tx);
    return {committed:request.items.length,publicationStatusUnchanged:true};
  },{timeout:20000});
}
export async function releaseFactTranslations(client:string,claimId:string){const claim=await readMcpState<Claim>(key(claimId));if(!claim||claim.client!==client)throw new Error('fact_claim_invalid_or_expired');await putMcpState(key(claimId),{...claim,done:claim.items.map(i=>i.id)},new Date(claim.expiresAt));return {released:true};}
