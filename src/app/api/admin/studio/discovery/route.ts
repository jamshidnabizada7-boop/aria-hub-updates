import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { canManageSocial } from '@/lib/social/permissions';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { db } from '@/lib/db';
import { getState, patchState, aftSlotToUtc } from '@/lib/social/publisher';
import { discoveryInventory } from '@/lib/social/discovery/inventory';
import { queueDiscoveryCampaign } from '@/lib/social/discovery/queue';
import { DISCOVERY_MINIMUM, DISCOVERY_COOLDOWN_DAYS, DISCOVERY_STYLES } from '@/lib/social/discovery/catalog';
export const dynamic='force-dynamic';
const reply=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET() {
  const admin=await getCurrentAdmin();if(!admin)return reply({error:'unauthorized'},401);
  try {
    const [inventory,state,queue]=await Promise.all([discoveryInventory(),getState(),db.socialPostQueue.findMany({where:{templateType:'collection'},orderBy:{scheduledFor:'desc'},take:60,select:{id:true,contentRef:true,contentJson:true,status:true,scheduledFor:true,externalIds:true,discoveryMetrics:{orderBy:{capturedAt:'desc'},take:30}}})]);
    const events=await db.discoveryCampaignEvent.groupBy({by:['queueId','platform','kind'],where:{queueId:{in:queue.map(row=>row.id)}},_count:true});
    return reply({inventory,minimum:DISCOVERY_MINIMUM,cooldownDays:DISCOVERY_COOLDOWN_DAYS,enabled:state.discoveryCampaignsEnabled!==false,queue:queue.map(row=>({...row,events:Object.fromEntries(events.filter(e=>e.queueId===row.id).map(e=>[e.platform+':'+e.kind,e._count]))}))});
  }catch {return reply({error:'discovery_unavailable'},503);}
}
export async function POST(req:NextRequest) {
  const admin=await getCurrentAdmin();if(!admin)return reply({error:'unauthorized'},401);if(!canManageSocial(admin.role))return reply({error:'forbidden'},403);
  if(!applicantSameOrigin(req))return reply({error:'invalid_origin'},403);
  try {
    const body=await req.json();
    if(body.action==='toggle'&&typeof body.enabled==='boolean'){await patchState({discoveryCampaignsEnabled:body.enabled});return reply({ok:true});}
    if(body.action==='queue'){
      const scheduled=aftSlotToUtc('19:00');if(scheduled<=new Date())scheduled.setUTCDate(scheduled.getUTCDate()+1);
      const style=DISCOVERY_STYLES.includes(body.style)?body.style:'atlas';
      const row=await queueDiscoveryCampaign(String(body.specId),['en','fa','ps'].includes(body.lang)?body.lang:'fa',style,scheduled);
      return reply({ok:true,id:row.id,scheduledFor:row.scheduledFor});
    }
    if(body.action==='metric'){
      if(!['facebook','instagram','linkedin'].includes(body.platform)||!['meta_insights','linkedin_analytics','native_export'].includes(body.source))return reply({error:'invalid_metric_source'},400);
      const capturedAt=new Date(body.capturedAt);if(!Number.isFinite(capturedAt.getTime())||capturedAt>new Date(Date.now()+60000))return reply({error:'invalid_capture_time'},400);
      const row=await db.socialPostQueue.findUnique({where:{id:String(body.queueId)},select:{templateType:true,results:true}});
      if(row?.templateType!=='collection'||!(row.results as Record<string,{ok?:boolean}>|null)?.[body.platform]?.ok)return reply({error:'campaign_not_published_on_platform'},400);
      const data:Record<string,number|null>={};for(const key of ['reach','impressions','engagement','linkClicks']){const value=body[key];if(value!==null&&value!==undefined&&(!Number.isSafeInteger(value)||value<0||value>2147483647))return reply({error:'invalid_metric_value'},400);data[key]=value??null;}
      await db.discoveryCampaignMetric.upsert({where:{queueId_platform_capturedAt:{queueId:body.queueId,platform:body.platform,capturedAt}},create:{queueId:body.queueId,platform:body.platform,capturedAt,source:body.source,paid:typeof body.paid==='boolean'?body.paid:null,...data},update:{source:body.source,paid:typeof body.paid==='boolean'?body.paid:null,...data}});
      return reply({ok:true});
    }
    return reply({error:'unknown_action'},400);
  }catch(error){return reply({error:error instanceof Error&&/insufficient|already_queued|invalid_collection/.test(error.message)?error.message:'campaign_action_failed'},409);}
}
