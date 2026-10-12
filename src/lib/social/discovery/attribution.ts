import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { validDiscoverySnapshot } from './inventory';
export const DISCOVERY_COOKIE = 'aria-discovery';
export const DISCOVERY_PLATFORMS = ['facebook','instagram','linkedin','telegram','whatsapp','x','qr'] as const;
type Attribution = { queueId: string; platform: string; visitor: string; expires: number };
function secret() { const s = process.env.DISCOVERY_ANALYTICS_SECRET || process.env.ADMIN_SESSION_SECRET; if (!s || s.length < 16) throw Error('analytics_secret_unavailable'); return s; }
export function attributionHash(value: string) { return createHmac('sha256', secret()).update('discovery-v1:' + value).digest('hex'); }
export function signAttribution(data: Attribution) { const body=Buffer.from(JSON.stringify(data)).toString('base64url'); return body + '.' + attributionHash(body); }
export function readAttribution(value: string | undefined): Attribution | null {
  try {
    if (!value || value.length > 1200) return null;
    const [body, mac, extra] = value.split('.'); if (extra || !/^[a-f0-9]{64}$/.test(mac)) return null;
    const expected = attributionHash(body); if (!timingSafeEqual(Buffer.from(mac),Buffer.from(expected))) return null;
    const a=JSON.parse(Buffer.from(body,'base64url').toString('utf8')) as Attribution;
    return typeof a.queueId === 'string' && /^[a-z0-9]{8,60}$/.test(a.queueId) && DISCOVERY_PLATFORMS.includes(a.platform as typeof DISCOVERY_PLATFORMS[number]) && /^[a-f0-9]{32}$/.test(a.visitor) && Number.isFinite(a.expires) && a.expires > Date.now() && a.expires <= Date.now()+31*86400000 ? a : null;
  } catch { return null; }
}
export function newAttribution(queueId:string, platform:string): Attribution { return {queueId,platform,visitor:randomBytes(16).toString('hex'),expires:Date.now()+30*86400000}; }
export async function attributableQueue(queueId:string, platform:string) {
  const row=await db.socialPostQueue.findUnique({where:{id:queueId},select:{templateType:true,contentJson:true,results:true}});
  const results=row?.results as Record<string,{ok?:boolean}> | null;
  return row?.templateType === 'collection' && validDiscoverySnapshot((row.contentJson as Record<string,unknown>).collection) && (platform==='qr' ? Object.values(results??{}).some(r=>r.ok) : Boolean(results?.[platform]?.ok));
}
export async function recordDiscoveryEvent(a: Attribution, kind: string, visitor = a.visitor) {
  await db.discoveryCampaignEvent.upsert({where:{queueId_platform_kind_visitorHash:{queueId:a.queueId,platform:a.platform,kind,visitorHash:attributionHash(visitor)}},create:{queueId:a.queueId,platform:a.platform,kind,visitorHash:attributionHash(visitor)},update:{}});
}
export async function recordRegistrationAttribution(req: Request, userId: string) {
  try {
    const raw=req.headers.get('cookie')?.split(';').map(p=>p.trim()).find(p=>p.startsWith(DISCOVERY_COOKIE+'='))?.slice(DISCOVERY_COOKIE.length+1);
    const a=readAttribution(raw); if(a && await attributableQueue(a.queueId,a.platform)) await recordDiscoveryEvent(a,'registration','user:'+userId);
  } catch { /* Analytics must never prevent account creation. */ }
}
export async function recordVerifiedRegistration(userId:string) {
  try {
    const rows=await db.discoveryCampaignEvent.findMany({where:{kind:'registration',visitorHash:attributionHash('user:'+userId)},orderBy:{createdAt:'asc'},take:1});
    for(const row of rows) await db.discoveryCampaignEvent.upsert({where:{queueId_platform_kind_visitorHash:{queueId:row.queueId,platform:row.platform,kind:'verified_registration',visitorHash:row.visitorHash}},create:{queueId:row.queueId,platform:row.platform,kind:'verified_registration',visitorHash:row.visitorHash},update:{}});
  } catch { /* Optional measurement. */ }
}
