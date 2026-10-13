import { db } from '@/lib/db';
import { decryptCredentials } from './credentials';
import { META_GRAPH_VERSION } from './channels';
import { renderQueueImage } from './publisher';
import { socialRenderBaseUrl } from '@/lib/automation/auth';
import { readDiscoverySnapshot, validDiscoverySnapshot } from './discovery/inventory';
import { discoveryContent } from './discovery/queue';
import type { DiscoverySnapshot, DiscoveryStyle } from './discovery/catalog';
import type { Lang } from '@/lib/i18n-config';
import { verifiedStory } from './facebook-story-result';

type StoryResult = { status: 'published' | 'blocked' | 'skipped' | 'prepared'; id?: string; url?: string; reason?: string };
type StoryRecord = StoryResult & { queueId: string; pageId: string; at: string; photoId?: string; asset?: string };

/** Separate durable claim: a Story failure must never repeat a successful Feed post. */
export async function publishFacebookStory(queueId: string, options: { manual?: boolean; dryRun?: boolean } = {}): Promise<StoryResult> {
  const state = await db.automationState.findUnique({ where: { id: 'singleton' } });
  const settings = (state?.state ?? {}) as Record<string, unknown>;
  if (!options.manual && settings.facebookStoriesEnabled !== true) return { status: 'skipped', reason: 'stories_disabled' };
  const channel = await db.publishChannel.findFirst({ where: { platform: 'facebook', enabled: true } });
  if (!channel) return { status: 'skipped', reason: 'no_enabled_page' };
  const creds = decryptCredentials(channel.credentials);
  const pageId = String(creds.pageId || ''); const accessToken = String(creds.accessToken || '');
  if (!pageId || !accessToken) return { status: 'skipped', reason: 'page_credentials_missing' };
  const key = `facebook-story:${pageId}:${queueId}`;
  if (settings[key]) return { status: 'skipped', reason: 'already_claimed' };
  const row = await db.socialPostQueue.findUnique({ where: { id: queueId } });
  const feed = await db.socialDelivery.findFirst({ where: { queueId, channelId: channel.id, status: 'published', publishedAt: { gte: new Date(Date.now() - 24 * 3600000) } } });
  if (!row || !feed || !['spotlight', 'deadline', 'collection'].includes(row.templateType)) return { status: 'skipped', reason: 'no_recent_verified_feed_post' };
  let props = row.contentJson as Record<string, unknown>;
  let snapshot: DiscoverySnapshot | null = null;
  if (row.templateType === 'collection') {
    const old = props.collection as DiscoverySnapshot;
    if (!validDiscoverySnapshot(old)) return { status: 'skipped', reason: 'invalid_campaign' };
    snapshot = await readDiscoverySnapshot(old.spec.id);
    if (!validDiscoverySnapshot(snapshot)) return { status: 'skipped', reason: 'insufficient_verified_opportunities' };
    props = discoveryContent(snapshot, (['en', 'fa', 'ps'].includes(String(props.lang)) ? props.lang : 'fa') as Lang, props.campaignStyle as DiscoveryStyle);
  }
  async function stillCurrent() {
    if (snapshot) {
      const fresh = await readDiscoverySnapshot(snapshot.spec.id);
      return Boolean(fresh && fresh.count === snapshot.count && fresh.fingerprint === snapshot.fingerprint && Date.now() - Date.parse(snapshot.capturedAt) <= 15 * 60000);
    }
    const now = new Date();
    const day = new Date(new Date(now.getTime() + 270 * 60000).toISOString().slice(0, 10) + 'T00:00:00Z');
    return Boolean(row?.contentRef && await db.opportunity.findFirst({ where: { slug: row.contentRef, status: 'published', OR: [{ deadline: null }, { deadline: { gt: now } }, { deadline: day }] }, select: { id: true } }));
  }
  if (!await stillCurrent()) return { status: 'skipped', reason: 'opportunity_no_longer_current' };
  const image = await renderQueueImage(socialRenderBaseUrl(), { ...props, size: 'story', exportFormat: 'jpeg', queueId, platform: 'facebook_story' }, true);
  if (!image || !await stillCurrent()) return { status: 'skipped', reason: 'story_media_unavailable_or_stale' };
  if (options.dryRun) return { status: 'prepared', url: image.publicUrl };
  const claimed: StoryRecord = { status: 'blocked', reason: 'reserved_pending_verification', queueId, pageId, at: new Date().toISOString(), asset: image.publicUrl };
  const claim = await db.$executeRaw`UPDATE "AutomationState" SET state = state || ${JSON.stringify({ [key]: claimed })}::jsonb, "updatedAt" = now() WHERE id = 'singleton' AND NOT (state ? ${key})`;
  if (!claim) return { status: 'skipped', reason: 'already_claimed' };
  async function record(result: StoryRecord) {
    await db.$executeRaw`UPDATE "AutomationState" SET state = state || ${JSON.stringify({ [key]: result })}::jsonb, "updatedAt" = now() WHERE id = 'singleton'`;
    await db.pipelineRun.create({ data: { kind: 'facebook_story', status: result.status === 'published' ? 'ok' : 'error', message: result.reason ?? 'Page Story published and verified', stats: result, finishedAt: new Date() } });
    return result;
  }
  let photoId: string | undefined;
  try {
    const graph = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(pageId)}`;
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    // The Story requires its own unpublished photo object, never a Feed photo ID.
    const uploaded = await fetch(`${graph}/photos`, { method: 'POST', headers, body: JSON.stringify({ url: image.publicUrl, published: false }), signal: AbortSignal.timeout(20000) });
    const upload = await uploaded.json();
    if (!uploaded.ok || !upload.id) return record({ ...claimed, reason: `story_upload_rejected_${uploaded.status}` });
    photoId = String(upload.id);
    if (!await stillCurrent()) return record({ ...claimed, photoId, reason: 'content_changed_before_story_send' });
    const published = await fetch(`${graph}/photo_stories`, { method: 'POST', headers, body: JSON.stringify({ photo_id: photoId }), signal: AbortSignal.timeout(20000) });
    const response = await published.json();
    if (!published.ok || response.success !== true || !response.post_id) return record({ ...claimed, photoId, reason: `story_publish_rejected_${published.status}` });
    const id = String(response.post_id);
    // Verify the native Story listing. An uncertain result remains blocked, never retried automatically.
    const listing = await fetch(`${graph}/stories?since=${Math.floor(Date.now() / 1000) - 3600}`, { headers, signal: AbortSignal.timeout(15000) });
    const stories = await listing.json();
    const found = listing.ok ? verifiedStory(stories.data, id) : undefined;
    return record(found ? { ...claimed, status: 'published', reason: undefined, photoId, id, url: found.url } : { ...claimed, photoId, id, reason: 'story_accepted_verification_pending' });
  } catch {
    return record({ ...claimed, photoId, reason: 'story_outcome_unknown_verify_before_retry' });
  }
}

/** Read-only destination reconciliation; never repeat an uncertain send. */
export async function reconcileFacebookStories(): Promise<number> {
  const stored = await db.automationState.findUnique({ where: { id: 'singleton' } });
  const pending = Object.entries((stored?.state ?? {}) as Record<string, StoryRecord>).filter(([key, value]) =>
    key.startsWith('facebook-story:') && value.status === 'blocked' && Boolean(value.id || value.photoId) && Date.now() - Date.parse(value.at) < 24 * 3600000);
  if (!pending.length) return 0;
  const channel = await db.publishChannel.findFirst({ where: { platform: 'facebook', enabled: true } });
  if (!channel) return 0;
  const creds = decryptCredentials(channel.credentials);
  const response = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(String(creds.pageId))}/stories?since=${Math.floor(Date.now() / 1000) - 86400}`, {
    headers: { Authorization: `Bearer ${String(creds.accessToken)}` }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return 0;
  const listing = await response.json(); let verified = 0;
  for (const [key, previous] of pending.slice(0, 10)) {
    if (previous.pageId !== String(creds.pageId)) continue;
    const found = verifiedStory(listing.data, previous.id, previous.photoId);
    if (!found) continue;
    const record = { ...previous, status: 'published', id: String(found.post_id), url: found.url, reason: undefined };
    await db.$executeRaw`UPDATE "AutomationState" SET state = state || ${JSON.stringify({ [key]: record })}::jsonb, "updatedAt" = now() WHERE id = 'singleton'`;
    await db.pipelineRun.create({ data: { kind: 'facebook_story', status: 'ok', message: 'Page Story reconciled from native published history', stats: record, finishedAt: new Date() } });
    verified++;
  }
  return verified;
}
