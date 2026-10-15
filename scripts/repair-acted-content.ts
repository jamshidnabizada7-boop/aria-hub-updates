/** Dry by default. Refresh only existing ACTED rows; no new records or AI calls. */
import {mkdir,writeFile} from 'node:fs/promises';
import {db} from '../src/lib/db';
import {OfficialHtmlScraper} from '../src/lib/import/scrapers/official-html';
import {ACTED_DETAIL_CONFIG} from '../src/lib/import/scrapers/acted-config';
import {preserveRepairsAndTranslations} from '../src/lib/import/preserve-repairs';
import {applicationFormEvidence} from '../src/lib/apply';
import type {Prisma} from '@prisma/client';

const apply=process.argv.includes('--apply');
const only=process.argv.find(a=>a.startsWith('--id='))?.slice(5);
const norm=(s:string)=>s.replace(/\s+/g,' ').trim();
const root='/opt/aria-hub/private/acted-repair';
try {
 const database=new URL(process.env.DATABASE_URL||'http://invalid');
 if(apply&&(!['127.0.0.1','localhost'].includes(database.hostname)||database.port!=='5450'))throw new Error('Apply requires the existing local Oracle database');
 const source=await db.importSource.findFirstOrThrow({where:{name:'Acted Vacancies',scraperKey:'officialHtml'}});
 if(new URL(source.baseUrl).hostname!=='www.acted.org')throw new Error('Unexpected ACTED source');
 const config={...JSON.parse(source.config||'{}'),...ACTED_DETAIL_CONFIG,selectors:{...JSON.parse(source.config||'{}').selectors,...ACTED_DETAIL_CONFIG.selectors}};
 const scraper=new OfficialHtmlScraper({...source,config});
 const rows=await db.opportunity.findMany({where:{sourceName:source.name,...(only?{id:only}:{})},orderBy:{id:'asc'}});
 const plans: {id:string;updatedAt:Date;data:Prisma.OpportunityUpdateInput;before:unknown;summary:unknown}[]=[];
 const skipped:{id:string;reason:string}[]=[];
 for(const row of rows){
  try {
   const target=new URL(row.sourceUrl||'');
   if(target.hostname!=='www.acted.org'||!target.pathname.startsWith('/en/jobs/'))throw new Error('Unexpected source URL');
   const listing=await scraper.parseDetail({title:row.title,sourceUrl:target.href,sourceName:source.name});
   const logs=await db.auditLog.findMany({where:{entityId:row.id,action:'opportunity.source_repair'},select:{details:true}});
   let protectedFields=[...new Set(logs.flatMap(log=>{try{return Object.keys(JSON.parse(log.details||'{}').patch||{});}catch{return [];}}))];
   const data:Record<string,unknown>={};
   // Expand an actual truncated source prefix; custom descriptions stay intact.
   if(listing.description&&norm(listing.description).startsWith(norm(row.description))&&norm(listing.description)!==norm(row.description))data.description=listing.description;
   for(const field of ['responsibilities','requirements','eligibility','experience','guidelines','benefits','salary','country'] as const){
    if(!row[field]&&listing[field])data[field]=listing[field];
   }
   // Correct only the masked address, preserving the reviewed instruction wording.
   const email=listing.guidelines?.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0];
   if(email&&row.guidelines&&/\[email[\s\u00a0]+protected\]/i.test(row.guidelines)){
    data.guidelines=row.guidelines.replace(/\[email[\s\u00a0]+protected\]/gi,email);
    protectedFields=protectedFields.filter(key=>key!=='guidelines');
   }
   if(listing.verifiedApplicationFormUrl&&row.applyUrl===listing.verifiedApplicationFormUrl&&row.applyUrlEvidence!==applicationFormEvidence(listing.verifiedApplicationFormUrl)){
    data.applyUrlType='application_form';data.applyUrlEvidence=applicationFormEvidence(listing.verifiedApplicationFormUrl);data.applyConfidence=95;data.applyVerifiedAt=new Date();
   }else if(listing.verifiedApplicationFormUrl&&(!row.applyUrl||row.applyUrl===row.sourceUrl)){
    data.applyUrl=listing.verifiedApplicationFormUrl;data.applyUrlType='application_form';data.applyUrlEvidence=applicationFormEvidence(listing.verifiedApplicationFormUrl);data.applyConfidence=95;data.applyVerifiedAt=new Date();
   }
   for(const [key,value] of Object.entries(data))if(['description','responsibilities','requirements','eligibility','experience','guidelines','benefits','salary'].includes(key))data[`${key}I18n`]={en:value};
   const merged=preserveRepairsAndTranslations(data,row as unknown as Record<string,unknown>,protectedFields);
   // The preservation helper may add unchanged protected fields; omit them.
   for(const key of Object.keys(merged))if(JSON.stringify(merged[key])===JSON.stringify(row[key as keyof typeof row]))delete merged[key];
   if(!Object.keys(merged).length){skipped.push({id:row.id,reason:'Already current or custom description preserved'});continue;}
   plans.push({id:row.id,updatedAt:row.updatedAt,data:merged as Prisma.OpportunityUpdateInput,before:row,summary:{id:row.id,slug:row.slug,fields:Object.keys(merged),oldDescriptionLength:row.description.length,newDescriptionLength:typeof merged.description==='string'?merged.description.length:row.description.length}});
  }catch(error){skipped.push({id:row.id,reason:error instanceof Error?error.message:'Detail unavailable'});}
 }
 console.log(JSON.stringify({mode:apply?'apply':'dry',sourceId:source.id,sourceConfigChanges:source.config!==JSON.stringify(config),plans:plans.map(p=>p.summary),skipped}));
 if(apply){
  await mkdir(root,{recursive:true,mode:0o700});
  const backup=`${root}/before-${Date.now()}.json`;
  await writeFile(backup,JSON.stringify({source,opportunities:plans.map(p=>p.before)},null,2),{mode:0o600,flag:'wx'});
  await db.importSource.update({where:{id:source.id},data:{config:JSON.stringify(config)}});
  let updated=0;
  for(const plan of plans){
   await db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Opportunity" WHERE id=${plan.id} FOR UPDATE`;
    const current=await tx.opportunity.findUniqueOrThrow({where:{id:plan.id},select:{updatedAt:true}});
    if(current.updatedAt.getTime()!==plan.updatedAt.getTime())throw new Error(`Concurrent update: ${plan.id}; preserved for review`);
    await tx.opportunity.update({where:{id:plan.id},data:plan.data});
    await tx.auditLog.create({data:{action:'opportunity.acted_backfill',entity:'Opportunity',entityId:plan.id,details:JSON.stringify({sourceUrl:(plan.before as {sourceUrl:string}).sourceUrl,fields:Object.keys(plan.data),backup})}});
   });updated++;
  }
  console.log(JSON.stringify({updated,backup,sourceConfigurationUpdated:true,publicationStatusUnchanged:true}));
 }
}finally{await db.$disconnect();}
