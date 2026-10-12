/** Prepare factual, deduplicated owned social browser shares; never exports credentials.
 * This is a browser handoff, not a WhatsApp Cloud API Channel adapter.
 * --reserve claims a share before a UI send. --complete records verified UI proof.
 * Unresolved claims block retries, including after crashes or expired sessions.
 */
import { db } from '../src/lib/db';
import { discoveryCaption, discoverySpec, type DiscoverySnapshot } from '../src/lib/social/discovery/catalog';
import { readDiscoverySnapshot, readDiscoveryListings, validDiscoverySnapshot } from '../src/lib/social/discovery/inventory';
import { composeCaptionWithLimit } from '../src/lib/social/publisher';

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const destination = arg('destination') || 'channel';
if (!['channel', 'group', 'linkedin-company'].includes(destination)) throw Error('unsupported_destination');
const target = destination === 'channel'
  ? { name: 'بخش نشر اعلانات وظایف آنلاین آریا', url: 'https://whatsapp.com/channel/0029Vb64Wf25q08koeYn8b3h', transport: 'whatsapp_web' }
  : destination === 'linkedin-company'
    ? { name: 'Aria Hub', url: 'https://www.linkedin.com/company/145224326/admin/dashboard/', transport: 'linkedin_web', publicUrl: 'https://www.linkedin.com/company/aria-hub/' }
    : { name: 'ثبت نام وظیفه آریا', url: null, transport: 'whatsapp_web', audience: 'reviewed remote work only' };
const queueId = arg('queue');
const rows = await db.socialPostQueue.findMany({
  where: { status: 'published', ...(queueId ? { id: queueId } : { scheduledFor: { gte: new Date(Date.now() - 24 * 3600000) } }) },
  orderBy: { scheduledFor: 'desc' }, take: queueId ? 1 : 12,
});
const now = new Date();
const date = new Date(new Date(now.getTime() + 270 * 60000).toISOString().slice(0, 10) + 'T00:00:00Z');
const remoteIds = destination === 'group'
  ? new Set((await readDiscoveryListings(discoverySpec('remote')!, now)).map(o => o.id)) : null;
let selected: typeof rows[number] | undefined;
let caption = '';
for (const row of rows) {
  const props = row.contentJson as Record<string, unknown>;
  const images = row.imagePaths as Record<string, string> | null;
  if (row.imageStatus !== 'ready' || !images?.square) continue;
  const asset = new URL(images.square);
  if (asset.protocol !== 'https:' || !asset.hostname.endsWith('.public.blob.vercel-storage.com')) continue;
  if (row.templateType === 'collection') {
    const snapshot = props.collection as DiscoverySnapshot;
    if (!validDiscoverySnapshot(snapshot) || Date.now() - Date.parse(snapshot.capturedAt) > 15 * 60000) continue;
    if (destination === 'group' && snapshot.spec.kind !== 'remote') continue;
    const current = await readDiscoverySnapshot(snapshot.spec.id, now);
    if (!current || current.count !== snapshot.count || current.fingerprint !== snapshot.fingerprint) continue;
    caption = discoveryCaption(snapshot, 'fa', row.id, destination === 'linkedin-company' ? 'linkedin' : 'whatsapp');
  } else if (['spotlight', 'deadline'].includes(row.templateType) && row.contentRef) {
    const opportunity = await db.opportunity.findFirst({ where: {
      slug: row.contentRef, status: 'published', OR: [{ deadline: { gt: now } }, { deadline: date }],
    }, select: { id: true } });
    if (!opportunity || remoteIds && !remoteIds.has(opportunity.id)) continue;
    caption = composeCaptionWithLimit(row.captionJson, ['fa'], destination === 'linkedin-company' ? 2900 : 1000);
  } else continue;
  if (!caption || !caption.includes('myariahub.com')) continue;
  const key = `whatsapp-browser:${destination}:${row.id}`;
  const state = await db.automationState.findUnique({ where: { id: 'singleton' } });
  const previous = (state?.state as Record<string, unknown> | null)?.[key];
  const previousStatus = (previous as { status?: string } | undefined)?.status;
  if (previous && !process.argv.includes('--complete') &&
    !(process.argv.includes('--check') && previousStatus === 'reserved')) continue;
  selected = row;
  break;
}
if (process.argv.includes('--complete')) {
  if (!queueId || !arg('proof')) throw Error('queue_and_verified_screenshot_required');
  const key = `whatsapp-browser:${destination}:${queueId}`;
  await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(742196)');
    const state = await tx.automationState.findUniqueOrThrow({ where: { id: 'singleton' } });
    const previous = (state.state as Record<string, unknown>)[key] as { status?: string } | undefined;
    if (!['reserved', 'verified'].includes(previous?.status || '')) throw Error('share_not_reserved');
    const record = { status: 'verified', verifiedAt: now.toISOString(), proof: arg('proof'), target };
    await tx.$executeRawUnsafe('UPDATE "AutomationState" SET state = state || $1::jsonb, "updatedAt" = now() WHERE id = \'singleton\'', JSON.stringify({ [key]: record }));
    await tx.auditLog.create({ data: { action: 'social.browser_share_verified', entity: 'SocialPostQueue', entityId: queueId, details: JSON.stringify(record) } });
  });
  console.log(JSON.stringify({ status: 'verified', queueId, destination }));
} else if (selected) {
  let reserved = false;
  if (process.argv.includes('--reserve')) {
    reserved = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(742196)');
      const state = await tx.automationState.findUniqueOrThrow({ where: { id: 'singleton' } });
      const key = `whatsapp-browser:${destination}:${selected!.id}`;
      if ((state.state as Record<string, unknown>)[key]) return false;
      await tx.$executeRawUnsafe('UPDATE "AutomationState" SET state = state || $1::jsonb, "updatedAt" = now() WHERE id = \'singleton\'', JSON.stringify({ [key]: { status: 'reserved', reservedAt: now.toISOString(), target } }));
      return true;
    });
  }
  console.log(JSON.stringify({ status: process.argv.includes('--reserve') && !reserved ? 'blocked' : 'ready', reserved,
    queueId: selected.id, target, caption, imageUrl: (selected.imagePaths as Record<string, string>).square }, null, 2));
} else console.log(JSON.stringify({ status: 'no_fresh_eligible_share', target }));
await db.$disconnect();
