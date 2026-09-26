import { db } from '@/lib/db';
import type { PublishResult } from '@/lib/social/channels';
import { classifySocialDeliveryError, deliveryRetryDelayMinutes, isRetryableDeliveryError } from '@/lib/social/delivery-policy';

type ChannelRef = { id: string; platform: string };

export async function ensureSocialDelivery(
  queueId: string,
  channel: ChannelRef,
  legacyOk = false,
  external?: { id?: string | null; permalink?: string | null },
) {
  // Legacy results seed NEW delivery records only. Never overwrite an existing
  // destination's state on every poll.
  return db.socialDelivery.upsert({
    where: { queueId_channelId: { queueId, channelId: channel.id } },
    create: {
      queueId, channelId: channel.id, platform: channel.platform,
      status: legacyOk ? 'published' : 'pending',
      publishedAt: legacyOk ? new Date() : null,
      externalId: external?.id ?? null,
      permalink: external?.permalink ?? null,
    },
    update: {},
  });
}

export async function markDeliveryPublishing(id: string, force = false): Promise<Date | null> {
  const now = new Date();
  const claim = await db.socialDelivery.updateMany({
    where: {
      id,
      OR: [
        { status: 'pending' },
        { status: 'retry_wait', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        ...(force ? [{ status: { in: ['blocked', 'failed'] } }] : []),
      ],
    },
    data: { status: 'publishing', lastAttemptAt: now, nextAttemptAt: null, attempts: { increment: 1 } },
  });
  return claim.count ? now : null;
}

export async function markDeliveryResult(
  id: string,
  result: PublishResult,
  currentAttempts: number,
  claimAt: Date,
) {
  const attempts = currentAttempts + 1;
  const errorCode = result.ok ? null : classifySocialDeliveryError(result);
  const retryable = errorCode !== null && isRetryableDeliveryError(errorCode) && attempts < 3;
  const blocked = errorCode !== null && ['AUTH_EXPIRED', 'PERMISSION_MISSING', 'DESTINATION_INVALID', 'UNSUPPORTED', 'OUTCOME_UNKNOWN'].includes(errorCode);
  return db.socialDelivery.updateMany({
    // A delayed process cannot overwrite an administrator's reconciliation or
    // a newer claim after its lease was declared stale.
    where: { id, status: 'publishing', lastAttemptAt: claimAt },
    data: result.ok ? {
      status: 'published',
      publishedAt: new Date(),
      externalId: result.id ?? null,
      permalink: result.permalink ?? null,
      errorCode: null,
      error: result.downgraded ?? null,
      nextAttemptAt: null,
    } : {
      status: blocked ? 'blocked' : retryable ? 'retry_wait' : 'failed',
      errorCode,
      error: result.error?.slice(0, 500) ?? 'unknown platform error',
      nextAttemptAt: retryable ? new Date(Date.now() + deliveryRetryDelayMinutes(attempts) * 60000) : null,
    },
  });
}
