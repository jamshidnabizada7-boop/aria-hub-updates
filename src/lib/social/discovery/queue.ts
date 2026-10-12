import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { Lang } from '@/lib/lang-route';
import { DISCOVERY_COOLDOWN_DAYS, DISCOVERY_MINIMUM, DISCOVERY_STYLES, discoveryCaption, discoverySpec, type DiscoveryStyle, type DiscoverySnapshot } from './catalog';
import { discoveryInventory, readDiscoverySnapshot } from './inventory';
export function discoveryContent(snapshot:DiscoverySnapshot, lang:Lang, style:DiscoveryStyle='atlas') {
  return {template:'collection',collection:snapshot,campaignStyle:style,lang,size:'square',title:''};
}
export function discoveryCaptions(snapshot:DiscoverySnapshot) {
  return Object.fromEntries((['fa','ps','en'] as Lang[]).map(lang=>[lang,discoveryCaption(snapshot,lang)]));
}
export async function queueDiscoveryCampaign(specId:string, lang:Lang, style:DiscoveryStyle, scheduledFor:Date) {
  if(!discoverySpec(specId) || !DISCOVERY_STYLES.includes(style))throw Error('invalid_collection');
  const snapshot=await readDiscoverySnapshot(specId);if(!snapshot || snapshot.count<DISCOVERY_MINIMUM)throw Error('insufficient_verified_opportunities');
  return db.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(742194)');
    const aftDay=new Date(scheduledFor.getTime()+270*60000).toISOString().slice(0,10);
    const start=new Date(aftDay+'T00:00:00.000Z');start.setUTCMinutes(-270);
    const daily=await tx.socialPostQueue.count({where:{templateType:'collection',status:{not:'cancelled'},scheduledFor:{gte:start,lt:new Date(start.getTime()+86400000)}}});
    if(daily)throw Error('collection_already_queued_for_day');
    const previous=await tx.socialPostQueue.findFirst({where:{templateType:'collection',OR:[{contentRef:'collection:'+specId},{AND:[{contentJson:{path:['collection','fingerprint'],equals:snapshot.fingerprint}},{contentJson:{path:['collection','spec','kind'],equals:snapshot.spec.kind}}]}],status:{not:'cancelled'},scheduledFor:{gte:new Date(scheduledFor.getTime()-DISCOVERY_COOLDOWN_DAYS*86400000)}},select:{id:true}});
    if(previous)throw Error('collection_already_queued_or_recently_published');
    return tx.socialPostQueue.create({data:{templateType:'collection',contentRef:'collection:'+specId,contentJson:discoveryContent(snapshot,lang,style),captionJson:discoveryCaptions(snapshot),scheduledFor,requiresManualPublish:false}});
  });
}
/** Called while the publisher owns the daily advisory lock. One collection replaces an individual slot. */
export async function discoveryCandidate(now=new Date()) {
  const [inventory,history]=await Promise.all([discoveryInventory(),db.socialPostQueue.findMany({where:{templateType:'collection',status:{not:'cancelled'},scheduledFor:{gte:new Date(now.getTime()-DISCOVERY_COOLDOWN_DAYS*86400000)}},select:{contentRef:true,contentJson:true}})]);
  const start=new Date(new Date(now.getTime()+270*60000).toISOString().slice(0,10)+'T00:00:00Z');start.setUTCMinutes(-270);
  if(await db.socialPostQueue.count({where:{templateType:'collection',status:{not:'cancelled'},scheduledFor:{gte:start,lt:new Date(start.getTime()+86400000)}}}))return null;
  const used=new Set(history.map(row=>row.contentRef));const fingerprints=new Set(history.map(row=>{const s=(row.contentJson as Record<string,unknown>).collection as DiscoverySnapshot;return s?.spec.kind+':'+s?.fingerprint;}));
  const available=inventory.filter(s=>!used.has('collection:'+s.spec.id)&&!fingerprints.has(s.spec.kind+':'+s.fingerprint));
  // Alternate province/category emphasis; stable within an AFT day.
  const day=Math.floor((now.getTime()+270*60000)/86400000);const preferred=available.filter(s=>Boolean(s.spec.province)===(day%2===0));const pool=preferred.length?preferred:available;
  return pool.length?pool[day%pool.length]:null;
}
export async function refreshDiscoveryRow(id:string) {
  const row=await db.socialPostQueue.findUniqueOrThrow({where:{id}});
  const props=row.contentJson as Record<string,unknown>;const old=props.collection as DiscoverySnapshot;
  const snapshot=await readDiscoverySnapshot(old?.spec?.id);if(!snapshot || snapshot.count<DISCOVERY_MINIMUM)return null;
  const style=DISCOVERY_STYLES.includes(props.campaignStyle as DiscoveryStyle)?props.campaignStyle as DiscoveryStyle:'atlas';
  return {contentJson:{...discoveryContent(snapshot,(['en','fa','ps'].includes(String(props.lang))?props.lang:'fa') as Lang,style),queueId:id},captionJson:discoveryCaptions(snapshot),snapshot};
}
export async function invalidateDiscoveryMedia(id:string,status:string,claimedAt:Date,reason:string) {
  const refreshed=await refreshDiscoveryRow(id);
  await db.socialPostQueue.updateMany({where:{id,status,claimedAt},data:refreshed ? {contentJson:refreshed.contentJson,captionJson:refreshed.captionJson,status:'pending',imageStatus:'none',imagePaths:Prisma.DbNull,claimedAt:null,renderAttempts:0,nextRenderAttemptAt:null,error:reason}:{status:'cancelled',claimedAt:null,error:'insufficient_verified_opportunities'}});
}
