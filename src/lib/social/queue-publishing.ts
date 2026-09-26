import { db } from '@/lib/db';
import { composeCaptionWithLimit, deepLinkOf, getState } from '@/lib/social/publisher';
import { publishToPlatform } from '@/lib/social/channels';
import { decryptCredentials } from '@/lib/social/credentials';
import { ensureSocialDelivery, markDeliveryPublishing, markDeliveryResult } from '@/lib/social/delivery';
import type { Lang } from '@/lib/i18n-config';

const CAPTION_LIMITS: Record<string, number> = { telegram: 1000, facebook: 4500, x: 270, instagram: 2100, linkedin: 2900, whatsapp: 1000 };
const UNKNOWN = 'publish outcome unknown — verify the destination before explicitly retrying';
type ChannelResult = { ok: boolean; error?: string; downgraded?: string };
export type QueuePublishResult = {
  ok: boolean; attempted: boolean; status?: string; error?: string;
  results?: Record<string, ChannelResult>;
};

export async function sweepStalePublishing(): Promise<number> {
  const cutoff = new Date(Date.now() - 10 * 60000);
  return db.$transaction(async (tx) => {
    const stale = { status: 'publishing', claimedAt: { lt: cutoff } };
    await tx.socialDelivery.updateMany({
      where: { status: 'publishing', queue: stale },
      data: { status: 'blocked', errorCode: 'OUTCOME_UNKNOWN', error: UNKNOWN, nextAttemptAt: null },
    });
    const result = await tx.socialPostQueue.updateMany({
      where: stale,
      data: { status: 'blocked', claimedAt: null, error: UNKNOWN },
    });
    return result.count;
  });
}

function durableImage(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
      !parsed.port && parsed.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch { return false; }
}

// Fixed SQL with bound values: pace overdue posts across all worker processes.
// Stored timestamps measure actual attempts, so restarting at noon cannot send
// every missed morning slot in one burst.
async function reserveAutomaticPost(): Promise<boolean> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 120000).toISOString();
  const patch = JSON.stringify({ lastAutomaticPostAttemptAt: now.toISOString() });
  const n = await db.$executeRawUnsafe(
    'INSERT INTO "AutomationState" (id, state, "updatedAt") VALUES (\'singleton\', $1::jsonb, now()) ON CONFLICT (id) DO UPDATE SET state = "AutomationState".state || $1::jsonb, "updatedAt" = now() WHERE ("AutomationState".state->>\'lastAutomaticPostAttemptAt\') IS NULL OR ("AutomationState".state->>\'lastAutomaticPostAttemptAt\')::timestamptz <= $2::timestamptz',
    patch, cutoff,
  );
  return n === 1;
}

export async function publishQueueRow(
  id: string,
  options: { manual?: boolean; force?: boolean } = {},
): Promise<QueuePublishResult> {
  const state = await getState();
  if (!options.manual && state.autoPublish === false) return { ok: false, attempted: false, error: 'publishing_paused' };
  const channels = await db.publishChannel.findMany({ where: { enabled: true } });
  if (!channels.length) return { ok: false, attempted: false, error: 'no_enabled_channels' };
  const before = await db.socialPostQueue.findUnique({ where: { id } });
  if (!before) return { ok: false, attempted: false, error: 'not_found' };
  const allowed = ['ready', 'failed', 'partial', ...(options.manual && options.force ? ['blocked'] : [])];
  if (!allowed.includes(before.status)) return { ok: false, attempted: false, status: before.status, error: 'post_not_claimable' };
  if (!options.manual && before.requiresManualPublish) return { ok: false, attempted: false, error: 'manual_post' };

  const claimAt = new Date();
  const claim = await db.socialPostQueue.updateMany({
    where: {
      id, status: { in: allowed },
      ...(!options.manual ? { requiresManualPublish: false, templateType: { in: ['spotlight', 'deadline'] } } : {}),
    },
    data: { status: 'publishing', claimedAt: claimAt },
  });
  if (!claim.count) return { ok: false, attempted: false, error: 'post_already_claimed' };
  const owned = { id, status: 'publishing', claimedAt: claimAt };

  try {
    const row = await db.socialPostQueue.findUniqueOrThrow({ where: { id } });
    const requireImage = ['spotlight', 'deadline'].includes(row.templateType);
    const images = (row.imagePaths ?? {}) as { square?: string; local?: string };
    if (requireImage && (row.imageStatus !== 'ready' || !durableImage(images.square))) {
      await db.socialPostQueue.updateMany({
        where: owned,
        data: { status: 'pending', imageStatus: 'none', claimedAt: null, error: 'durable_media_required' },
      });
      return { ok: false, attempted: false, error: 'durable_media_required' };
    }
    if (!options.manual) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const eligible = row.contentRef && await db.opportunity.findFirst({
        where: { slug: row.contentRef, status: 'published', OR: [{ deadline: null }, { deadline: { gte: today } }] },
        select: { id: true },
      });
      if (!eligible) {
        await db.socialPostQueue.updateMany({ where: owned, data: { status: 'cancelled', claimedAt: null, error: 'opportunity_no_longer_public' } });
        return { ok: false, attempted: false, status: 'cancelled', error: 'opportunity_no_longer_public' };
      }
      if (!(await reserveAutomaticPost())) {
        await db.socialPostQueue.updateMany({ where: owned, data: { status: before.status, claimedAt: null } });
        return { ok: false, attempted: false, error: 'automatic_spacing' };
      }
    }

    const langs = state.captionLangs?.length ? state.captionLangs : ['fa', 'ps', 'en'] as Lang[];
    const previous = (row.results ?? {}) as Record<string, ChannelResult>;
    const results = { ...previous };
    const external = { ...((row.externalIds ?? {}) as Record<string, { id?: string | null; permalink?: string | null }>) };
    let attempted = false;
    let retryPending = false;
    let blocked = false;

    for (const channel of channels) {
      const delivery = await ensureSocialDelivery(id, channel, Boolean(previous[channel.platform]?.ok), external[channel.platform]);
      if (delivery.status === 'published') {
        results[channel.platform] = { ok: true };
        continue;
      }
      const deliveryClaim = await markDeliveryPublishing(delivery.id, Boolean(options.manual && options.force));
      if (!deliveryClaim) {
        retryPending ||= delivery.status === 'pending' || delivery.status === 'retry_wait';
        blocked ||= delivery.status === 'blocked' || delivery.status === 'publishing';
        results[channel.platform] = { ok: false, error: delivery.error ?? ('delivery ' + delivery.status) };
        continue;
      }
      attempted = true;
      const caption = composeCaptionWithLimit(row.captionJson, langs, CAPTION_LIMITS[channel.platform] ?? 2200);
      const result = await publishToPlatform(channel.platform, decryptCredentials(channel.credentials), {
        caption,
        imageUrl: images.square ?? null,
        // Automatic and opportunity delivery never relies on worker-local files.
        imagePath: requireImage ? null : images.local ?? null,
        link: deepLinkOf(caption) || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com',
        requireImage,
      });
      const recorded = await markDeliveryResult(delivery.id, result, delivery.attempts, deliveryClaim);
      if (!recorded.count) throw new Error('delivery_claim_changed');
      const after = await db.socialDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
      retryPending ||= after.status === 'retry_wait';
      blocked ||= after.status === 'blocked';
      results[channel.platform] = { ok: result.ok, ...(result.error ? { error: result.error } : {}), ...(result.downgraded ? { downgraded: result.downgraded } : {}) };
      if (result.ok) external[channel.platform] = { id: result.id ?? null, permalink: result.permalink ?? null };
      await db.publishChannel.update({
        where: { id: channel.id },
        data: {
          lastStatus: result.ok ? 'ok' : 'error',
          lastError: result.ok ? null : result.error ?? 'platform failure',
          ...(result.ok ? { lastPublishedAt: new Date() } : {}),
          ...(result.tokenExpired ? { enabled: false } : {}),
        },
      });
    }
    const values = Object.values(results);
    const anyOk = values.some((value) => value.ok);
    const allOk = channels.every((channel) => results[channel.platform]?.ok);
    const status = allOk ? 'published' : retryPending ? (anyOk ? 'partial' : 'failed') : blocked ? 'blocked' : 'failed';
    const error = allOk ? null : values.map((value) => value.error).filter(Boolean).join(' | ').slice(0, 500);
    await db.socialPostQueue.updateMany({
      where: owned,
      data: {
        status, results, externalIds: external, claimedAt: null, error,
        ...(attempted ? { attempts: { increment: 1 } } : {}),
        ...(allOk ? { publishedAt: row.publishedAt ?? new Date() } : {}),
      },
    });
    return { ok: anyOk, attempted, status, results, ...(error ? { error } : {}) };
  } catch {
    // An exception after a claim could follow an accepted platform request.
    // Preserve successful destinations and require reconciliation for unknowns.
    await db.socialDelivery.updateMany({
      where: { queueId: id, status: 'publishing' },
      data: { status: 'blocked', errorCode: 'OUTCOME_UNKNOWN', error: UNKNOWN, nextAttemptAt: null },
    }).catch(() => undefined);
    await db.socialPostQueue.updateMany({ where: owned, data: { status: 'blocked', claimedAt: null, error: UNKNOWN } }).catch(() => undefined);
    return { ok: false, attempted: true, status: 'blocked', error: UNKNOWN };
  }
}

export async function publishDueQueue(limit = 2): Promise<{ published: number; failed: number }> {
  await sweepStalePublishing();
  const state = await getState();
  if (state.autoPublish === false) return { published: 0, failed: 0 };
  const channels = await db.publishChannel.findMany({ where: { enabled: true }, select: { id: true } });
  if (!channels.length) return { published: 0, failed: 0 };
  const now = new Date();
  const due = await db.socialPostQueue.findMany({
    where: {
      status: { in: ['ready', 'failed', 'partial'] },
      requiresManualPublish: false,
      templateType: { in: ['spotlight', 'deadline'] },
      scheduledFor: { lte: now },
      imageStatus: 'ready',
      OR: [
        { deliveries: { none: {} } },
        { deliveries: { some: { channelId: { in: channels.map((c) => c.id) }, OR: [
          { status: 'pending' },
          { status: 'retry_wait', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        ] } } },
      ],
    },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
    select: { id: true },
  });
  let published = 0;
  let failed = 0;
  for (const row of due) {
    const result = await publishQueueRow(row.id);
    if (result.attempted) {
      if (result.status === 'published') published++; else failed++;
      break; // Only one overdue post per pacing reservation.
    }
    if (result.error === 'automatic_spacing') break;
  }
  return { published, failed };
}
