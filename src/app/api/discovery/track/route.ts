import { NextRequest, NextResponse } from 'next/server';
import { applicantSameOrigin } from '@/lib/applicant-origin';
import { db } from '@/lib/db';
import { getClientIp } from '@/lib/admin-auth';
import { checkDurableRateLimit } from '@/lib/security/durable-rate-limit';
import { DISCOVERY_COOKIE, DISCOVERY_PLATFORMS, attributableQueue, attributionHash, newAttribution, readAttribution, recordDiscoveryEvent, signAttribution } from '@/lib/social/discovery/attribution';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const reply=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
  if(!applicantSameOrigin(req)) return reply({error:'invalid_origin'},403);
  if(Number(req.headers.get('content-length')||0)>2048) return reply({error:'too_large'},413);
  try {
    const body=await req.json();
    if(body.consent!==true) return reply({error:'consent_required'},400);
    if(body.kind==='revoke') {const res=reply({ok:true});res.cookies.set(DISCOVERY_COOKIE,'',{maxAge:0,path:'/',httpOnly:true});return res;}
    if(!['landing_view','opportunity_click'].includes(body.kind) || typeof body.queueId!=='string' || !/^[a-z0-9]{8,60}$/.test(body.queueId) || !DISCOVERY_PLATFORMS.includes(body.platform) || typeof body.visitor!=='string'|| !/^[a-f0-9]{32}$/.test(body.visitor)) return reply({error:'invalid_event'},400);
    if(!(await checkDurableRateLimit(db,'discovery-track:'+attributionHash(getClientIp(req)||'unknown'),60,60000)).allowed) return reply({error:'rate_limited'},429);
    if(!(await attributableQueue(body.queueId,body.platform))) return reply({error:'unpublished_campaign'},400);
    const previous=readAttribution(req.cookies.get(DISCOVERY_COOKIE)?.value);
    const a={...newAttribution(body.queueId,body.platform),visitor:previous?.visitor??body.visitor};
    await recordDiscoveryEvent(a,body.kind);
    const res=reply({ok:true});
    // First touch persists for 30 days; later campaigns still get their own visit event.
    if(!previous) res.cookies.set(DISCOVERY_COOKIE,signAttribution(a),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*86400});
    return res;
  } catch {return reply({error:'measurement_unavailable'},503);}
}
