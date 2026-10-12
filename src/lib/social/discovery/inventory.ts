import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { DISCOVERY_MINIMUM, DISCOVERY_SPECS, discoverySpec, type DiscoverySpec, type DiscoverySnapshot } from './catalog';
import { evaluateImportedDraftPublication, type PublicationSource } from '@/lib/import/automatic-publication';
import { isSafePublicUrl } from '@/lib/security/url-guard';

/** Date-only imports close at the end of their Afghan calendar day; explicit times expire at that instant. */
export function discoveryWhere(spec: DiscoverySpec, now = new Date()): Prisma.OpportunityWhereInput {
  const aftDate = new Date(now.getTime()+270*60000).toISOString().slice(0,10);
  const day = new Date(aftDate+'T00:00:00.000Z');
  const where: Prisma.OpportunityWhereInput = {
    status: 'published', OR:[{deadline:{gt:now}},{deadline:day}],
    verificationStatus: { in: ['verified_official', 'verified_employer', 'aggregator_confirmed', 'multi_source_confirmed', 'single_source'] },
  };
  if (spec.province) where.locations = { some: { province: { equals: spec.province, mode: 'insensitive' }, confidence:{gte:0.75} } };
  const types = spec.kind === 'jobs' || ['ngo','remote','graduates'].includes(spec.kind) ? ['job','jobs'] : [spec.kind.replace(/s$/, ''), spec.kind];
  where.AND = [{ OR: [ { jobType: { in: types, mode: 'insensitive' } }, { category: { slug: { in: types, mode: 'insensitive' } } } ] }];
  if (spec.kind === 'ngo') where.organizationRef = { verified: true, active: true, organizationType: { in: ['ngo','nonprofit','non-profit','non-governmental organization'], mode: 'insensitive' } };
  if (spec.kind === 'remote') where.matchProfile = { reviewed: true, locationType: 'remote' };
  if (spec.kind === 'graduates') where.matchProfile = { reviewed: true, minExperienceYears: 0 };
  return where;
}
export async function readDiscoverySnapshot(id: unknown, now = new Date()): Promise<DiscoverySnapshot | null> {
  const spec = discoverySpec(id); if (!spec) return null;
  // Query canonical opportunities, never location rows or vacancy totals. A multi-province listing counts once.
  const rows = await readDiscoveryListings(spec,now);
  return { spec, count: rows.length, capturedAt: now.toISOString(), fingerprint: createHash('sha256').update(rows.map(r => r.id).join('\n')).digest('hex') };
}
export async function readDiscoveryListings(spec:DiscoverySpec,now=new Date(), sharedSources?:PublicationSource[]) {
  const [rows,sources]=await Promise.all([
    db.opportunity.findMany({where:discoveryWhere(spec,now),orderBy:{id:'asc'},select:{id:true,slug:true,title:true,titleI18n:true,organization:true,deadline:true,status:true,description:true,sourceName:true,sourceUrl:true,importStatus:true,applyUrl:true,applyUrlType:true,guidelines:true,requirements:true,responsibilities:true,eligibility:true,verificationStatus:true,extractedData:true,canonicalUrl:true,contentHash:true,locations:{select:{province:true,confidence:true}}}}),
    sharedSources ?? db.importSource.findMany({where:{enabled:true,healthStatus:'healthy'},select:{id:true,name:true,baseUrl:true,enabled:true,autoPublish:true,healthStatus:true}}),
  ]);
  const pending=rows.length ? await db.$queryRaw<{opportunityId:string}[]>`SELECT DISTINCT "opportunityId" FROM "OpportunitySourceObservation" WHERE "opportunityId" = ANY(${rows.map(row=>row.id)}::text[]) AND "rawData"->'matchReview' IS NOT NULL AND "rawData"->'matchReview' NOT IN ('null'::jsonb,'false'::jsonb) AND COALESCE("rawData"->>'matchReviewResolved','false') <> 'true'` : [];
  const pendingIds=new Set(pending.map(row=>row.opportunityId));
  const sourceByName=new Map(sources.map(s=>[s.name,s]));const seen=new Set<string>();
  return rows.filter(row=>{
    if(pendingIds.has(row.id))return false;
    let source:PublicationSource|undefined=sourceByName.get(row.sourceName||'');
    const independentlyConfirmed=['verified_official','verified_employer','aggregator_confirmed','multi_source_confirmed'].includes(row.verificationStatus||'');
    // Published status is the site's authorization, including manually approved imports.
    // Source autoPublish is a draft-import setting, not a ban on promoting existing public listings.
    const candidate={...row,status:'draft'};
    if(source)source={...source,autoPublish:true};
    if(independentlyConfirmed && row.sourceUrl) {candidate.sourceName=row.sourceName||'Reviewed source';candidate.importStatus='imported';source={id:'reviewed',name:candidate.sourceName,baseUrl:row.sourceUrl,enabled:true,autoPublish:true,healthStatus:'healthy'};}
    const decision=evaluateImportedDraftPublication(candidate,source,false,now);
    // A published source-backed article remains discoverable even when application instructions
    // live on the source page. The campaign never advertises a verified direct Apply endpoint.
    const sourceArticle=decision.reasons.length===1 && decision.reasons[0]==='missing_application_route' && row.applyUrlType==='source_article_fallback' && isSafePublicUrl(row.applyUrl);
    if(decision.action!=='publish'&&!sourceArticle)return false;
    const key=row.canonicalUrl || row.contentHash || row.id;
    if(seen.has(key))return false;seen.add(key);return true;
  });
}
export async function discoveryInventory() {
  const now = new Date();
  const sources=await db.importSource.findMany({where:{enabled:true,healthStatus:'healthy'},select:{id:true,name:true,baseUrl:true,enabled:true,autoPublish:true,healthStatus:true}});
  const categories=DISCOVERY_SPECS.filter(s=>!s.province);
  const pools=await Promise.all(categories.map(async spec=>({spec,rows:await readDiscoveryListings(spec,now,sources)})));
  const jobs=pools.find(pool=>pool.spec.id==='jobs')!.rows;
  const snapshot=(spec:DiscoverySpec,rows:{id:string}[])=>({spec,count:rows.length,capturedAt:now.toISOString(),fingerprint:createHash('sha256').update(rows.map(row=>row.id).join('\n')).digest('hex')});
  const provinceCandidates=DISCOVERY_SPECS.filter(s=>s.province).filter(spec=>jobs.filter(row=>row.locations.some(l=>l.province?.toLowerCase()===spec.province!.toLowerCase() && (l.confidence??0)>=.75)).length>=DISCOVERY_MINIMUM);
  // Reuse the exact destination query even when duplicate source records disagree on location.
  const provinces=await Promise.all(provinceCandidates.map(spec=>readDiscoverySnapshot(spec.id,now)));
  const results=[...pools.map(pool=>snapshot(pool.spec,pool.rows)),...provinces];
  return results.filter((s): s is DiscoverySnapshot => Boolean(s && s.count >= DISCOVERY_MINIMUM));
}
export function validDiscoverySnapshot(snapshot: unknown): snapshot is DiscoverySnapshot {
  const s = snapshot as DiscoverySnapshot | null;
  return Boolean(s && discoverySpec(s.spec?.id) && Number.isSafeInteger(s.count) && s.count >= DISCOVERY_MINIMUM && Number.isFinite(Date.parse(s.capturedAt)) && /^[a-f0-9]{64}$/.test(s.fingerprint));
}
