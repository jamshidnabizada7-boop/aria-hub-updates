/**
 * Atomic Persian-first opportunity translation worker.
 * Free-model outages/rate limits never expose partial translations.
 */
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { getProviderSlots, chatWithFailover } from '@/lib/ai/failover';
import { stripHtml } from '@/lib/import/utils';
import { Prisma } from '@prisma/client';

type TargetLang = 'fa' | 'ps';
const CHUNK_CHARS = Math.max(700, Math.min(2400, Number(process.env.TRANSLATION_CHUNK_CHARS) || 1500));

const FIELDS = [
  'title','description','aiSummary','eligibility','benefits','responsibilities',
  'requirements','guidelines','jobType','salary','educationReq','experience',
] as const;
type FieldName = (typeof FIELDS)[number];

type Opp = {
  id: string; status: string; createdAt: Date; deadline: Date | null;
  title: string; description: string; aiSummary: string | null;
  eligibility: string | null; benefits: string | null; responsibilities: string | null;
  requirements: string | null; guidelines: string | null; jobType: string | null;
  salary: string | null; educationReq: string | null; experience: string | null;
  titleI18n: unknown; descriptionI18n: unknown; aiSummaryI18n: unknown;
  eligibilityI18n: unknown; benefitsI18n: unknown; responsibilitiesI18n: unknown;
  requirementsI18n: unknown; guidelinesI18n: unknown; jobTypeI18n: unknown;
  salaryI18n: unknown; educationReqI18n: unknown; experienceI18n: unknown;
  seoTitleI18n?: unknown; ogTitleI18n?: unknown; seoDescriptionI18n?: unknown; ogDescriptionI18n?: unknown;
  translationStates: Array<{id:string;lang:string;sourceHash:string;status:string;staging:unknown;attempts:number;nextAttemptAt:Date|null}>;
};

interface StagedField { sourceHash: string; chunks: string[]; translated: Array<string | null>; }
interface Staging { version: 1; fields: Partial<Record<FieldName, StagedField>>; }

function hash(s: string): string { return createHash('sha256').update(s).digest('hex'); }
function clean(v: unknown): string {
  if (typeof v !== 'string') return '';
  return stripHtml(v).replace(/\r\n/g,'\n').replace(/\u0000/g,'').replace(/\n{4,}/g,'\n\n\n').trim();
}
function sources(opp: Opp): Partial<Record<FieldName,string>> {
  const out: Partial<Record<FieldName,string>> = {};
  for (const f of FIELDS) { const v = clean(opp[f]); if (v) out[f] = v; }
  return out;
}
function overallHash(src: Partial<Record<FieldName,string>>): string {
  return hash(JSON.stringify(FIELDS.map((f) => [f, src[f] || ''])));
}

/** Full-text chunking: every source character is assigned to a chunk. */
export function chunkTranslationText(input: string, maxChars = CHUNK_CHARS): string[] {
  const text = input.trim();
  if (!text) return [];
  if (text.length <= maxChars) return [text];
  const out: string[] = []; let rest = text;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf('\n\n', maxChars);
    if (cut < maxChars * 0.45) cut = rest.lastIndexOf('\n', maxChars);
    if (cut < maxChars * 0.45) cut = rest.lastIndexOf('. ', maxChars);
    if (cut < maxChars * 0.45) cut = rest.lastIndexOf(' ', maxChars);
    if (cut < maxChars * 0.45) cut = maxChars;
    out.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trimStart();
  }
  if (rest.trim()) out.push(rest.trim());
  return out.filter(Boolean);
}

function fresh(src: Partial<Record<FieldName,string>>): Staging {
  const s: Staging = { version: 1, fields: {} };
  for (const f of FIELDS) {
    const text = src[f]; if (!text) continue;
    const chunks = chunkTranslationText(text);
    s.fields[f] = { sourceHash: hash(text), chunks, translated: chunks.map(() => null) };
  }
  return s;
}
function parseStaging(v: unknown): Staging | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const s = v as Staging; return s.version === 1 && s.fields && typeof s.fields === 'object' ? s : null;
}
function nextChunk(s: Staging): {field:FieldName;index:number;source:string} | null {
  for (const f of FIELDS) { const w=s.fields[f]; if(!w) continue; for(let i=0;i<w.chunks.length;i++) if(!w.translated[i]) return {field:f,index:i,source:w.chunks[i]}; }
  return null;
}
function complete(s: Staging): boolean { return nextChunk(s) === null; }

function parseTranslation(raw: string): string | null {
  if (!raw) return null;
  const text = raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const a=text.indexOf('{'), b=text.lastIndexOf('}');
  if(a>=0 && b>a){ try { const p=JSON.parse(text.slice(a,b+1)); const v=typeof p.translation==='string'?p.translation:typeof p.text==='string'?p.text:null; if(v&&v.trim()) return v.trim(); } catch {} }
  return text && !/^\{/.test(text) ? text : null;
}

async function translateChunk(lang: TargetLang, field: FieldName, chunk: string): Promise<string> {
  const slots = await getProviderSlots(); if (!slots.length) throw new Error('no AI provider configured');
  const target = lang === 'fa' ? 'Farsi/Persian (فارسی)' : 'Pashto (پښتو)';
  const system = 'You are a professional translator for ARIA HUB. Translate into '+target+'. Translate EVERY sentence and bullet. Never summarize, shorten, omit, or invent facts. Preserve URLs, emails, phone numbers, dates, amounts, organization names and technical terms. Keep line breaks/bullets where practical. Return ONLY strict JSON: {"translation":"..."}. If already in the target language, return it faithfully.';
  const prompt = 'FIELD: '+field+'\nTARGET: '+lang+'\n\nSOURCE CHUNK:\n'+chunk;
  const served = await chatWithFailover(slots, system, prompt);
  const value = parseTranslation(served.text); if(!value) throw new Error('unparseable translation from '+served.provider);
  return value;
}

function rateLimited(msg:string):boolean { return /\b429\b|rate.?limit|quota|too many requests|cooling down/i.test(msg); }
function backoff(attempts:number, limited:boolean):number {
  if(limited) return Math.min(60*60_000, Math.max(60_000, attempts*5*60_000));
  return Math.min(60*60_000, Math.max(60_000, Math.pow(2,Math.max(0,attempts-1))*60_000));
}
function obj(v:unknown):Record<string,unknown>{ return v&&typeof v==='object'&&!Array.isArray(v)?{...(v as Record<string,unknown>)}:{}; }

async function commitLanguage(opp:Opp, lang:TargetLang, staging:Staging, stateId:string):Promise<void>{
  if(!complete(staging)) throw new Error('incomplete translation staging');
  const src=sources(opp); const data:Record<string,unknown>={};
  for(const f of FIELDS){
    const w=staging.fields[f]; if(!w) continue;
    if(w.translated.some((x)=>!x)) throw new Error('missing translated chunk for '+f);
    const finalText=w.translated.filter((x):x is string=>Boolean(x)).join('\n\n').trim();
    if(!finalText) throw new Error('empty completed translation for '+f);
    const col=f+'I18n'; const existing=obj((opp as unknown as Record<string,unknown>)[col]);
    data[col]={...existing,...(existing.en?{}:{en:src[f]||''}),[lang]:finalText};
  }
  const titleMap=(data.titleI18n||opp.titleI18n) as Record<string,unknown>|null;
  const sumMap=(data.aiSummaryI18n||opp.aiSummaryI18n||data.descriptionI18n||opp.descriptionI18n) as Record<string,unknown>|null;
  const t=typeof titleMap?.[lang]==='string'?String(titleMap[lang]):'';
  const s=typeof sumMap?.[lang]==='string'?String(sumMap[lang]):'';
  if(t){ for(const col of ['seoTitleI18n','ogTitleI18n']) data[col]={...obj((opp as unknown as Record<string,unknown>)[col]),[lang]:t}; }
  if(s){ const meta=s.replace(/\s+/g,' ').trim().slice(0,158); for(const col of ['seoDescriptionI18n','ogDescriptionI18n']) data[col]={...obj((opp as unknown as Record<string,unknown>)[col]),[lang]:meta}; }
  await db.$transaction([
    db.opportunity.update({where:{id:opp.id},data:{...data,translationStatus:lang==='fa'?'fa_complete':'complete'} as Prisma.OpportunityUpdateInput}),
    db.opportunityTranslation.update({where:{id:stateId},data:{status:'complete',staging:staging as unknown as Prisma.InputJsonValue,nextAttemptAt:null,lastError:null,completedAt:new Date()}})
  ]);
}

async function ensureState(opp:Opp, lang:TargetLang){
  const src=sources(opp), sourceHash=overallHash(src); const current=opp.translationStates.find((s)=>s.lang===lang);
  if(!current){
    const staging=fresh(src); const row=await db.opportunityTranslation.create({data:{opportunityId:opp.id,lang,sourceHash,status:'pending',staging:staging as unknown as Prisma.InputJsonValue}});
    return {id:row.id,status:row.status,attempts:row.attempts,nextAttemptAt:row.nextAttemptAt,staging};
  }
  const parsed=parseStaging(current.staging);
  if(current.sourceHash!==sourceHash || !parsed){
    const staging=fresh(src); const row=await db.opportunityTranslation.update({where:{id:current.id},data:{sourceHash,status:'pending',staging:staging as unknown as Prisma.InputJsonValue,attempts:0,nextAttemptAt:null,lastError:current.sourceHash!==sourceHash?'source changed; restaged':'invalid staging reset',completedAt:null}});
    return {id:row.id,status:row.status,attempts:row.attempts,nextAttemptAt:row.nextAttemptAt,staging};
  }
  return {id:current.id,status:current.status,attempts:current.attempts,nextAttemptAt:current.nextAttemptAt,staging:parsed};
}

const INCLUDE={translationStates:{select:{id:true,lang:true,sourceHash:true,status:true,staging:true,attempts:true,nextAttemptAt:true}}} as const;
async function candidate(lang:TargetLang):Promise<Opp|null>{
  const now=new Date();
  for(const status of ['published','expired'] as const){
    const rows=await db.opportunity.findMany({where:{status},include:INCLUDE,orderBy:status==='published'?[{deadline:{sort:'asc',nulls:'last'}},{createdAt:'desc'}]:[{createdAt:'desc'}],take:100});
    for(const row of rows as unknown as Opp[]){
      const st=row.translationStates.find((x)=>x.lang===lang); if(st?.nextAttemptAt&&st.nextAttemptAt>now) continue; if(st?.status==='complete') continue;
      if(lang==='ps'){ const fa=row.translationStates.find((x)=>x.lang==='fa'); if(!fa||fa.status!=='complete') continue; }
      return row;
    }
  }
  return null;
}

export interface TranslateBatchResult { processed:number; failed:number; rateLimited:boolean; }
export async function translateNextBatch(batch=3):Promise<TranslateBatchResult>{
  let processed=0, failed=0, limited=false; const limit=Math.max(1,Math.min(8,batch));
  for(let unit=0;unit<limit;unit++){
    let lang:TargetLang='fa'; let opp=await candidate('fa'); if(!opp){lang='ps';opp=await candidate('ps');} if(!opp) break;
    const state=await ensureState(opp,lang); if(state.status==='complete') continue;
    const work=nextChunk(state.staging);
    if(!work){ try{await commitLanguage(opp,lang,state.staging,state.id);processed++;}catch(e){failed++;const msg=e instanceof Error?e.message:String(e);await db.opportunityTranslation.update({where:{id:state.id},data:{status:'pending',lastError:msg.slice(0,400),nextAttemptAt:new Date(Date.now()+5*60_000)}});} continue; }
    try{
      const translated=await translateChunk(lang,work.field,work.source); const fw=state.staging.fields[work.field]; if(!fw) throw new Error('missing staging field '+work.field); fw.translated[work.index]=translated;
      await db.opportunityTranslation.update({where:{id:state.id},data:{status:'processing',staging:state.staging as unknown as Prisma.InputJsonValue,attempts:{increment:1},nextAttemptAt:null,lastError:null}});
      if(complete(state.staging)) await commitLanguage(opp,lang,state.staging,state.id); processed++;
    }catch(e){
      const msg=(e instanceof Error?e.message:String(e)).slice(0,500); const isLimited=rateLimited(msg); limited=limited||isLimited; failed++;
      const attempts=state.attempts+1; await db.opportunityTranslation.update({where:{id:state.id},data:{status:'pending',attempts:{increment:1},lastError:msg,nextAttemptAt:new Date(Date.now()+backoff(attempts,isLimited))}});
      if(isLimited||/all AI providers failed|timeout|temporar|503|502|504/i.test(msg)) break;
    }
  }
  return {processed,failed,rateLimited:limited};
}
