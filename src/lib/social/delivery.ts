import { db } from '@/lib/db';
import {
  classifySocialDeliveryError,
  deliveryRetryDelayMinutes,
  isRetryableDeliveryError,
} from '@/lib/social/delivery-policy';

type ChannelRef = { id: string; platform: string };

export async function ensureSocialDelivery(
  queueId: string,
  channel: ChannelRef,
  legacyOk = false,
  external?: { id?: string | null; permalink?: string | null },
) {
  return db.socialDelivery.upsert({
    where: { queueId_channelId: { queueId, channelId: channel.id } },
    create: {
      queueId,
      channelId: channel.id,
      platform: channel.platform,
      status: legacyOk ? 'published' : 'pending',
      ...(legacyOk ? { publishedAt: new Date() } : {}),
      externalId: external?.id ?? null,
      permalink: external?.permalink ?? null,
    },
    update: legacyOk
      ? {
          status: 'published',
          publishedAt: { set: new Date() },
          externalId: external?.id ?? undefined,
          permalink: external?.permalink ?? undefined,
          errorCode: null,
          error: null,
          nextAttemptAt: null,
        }
      : {},
  });
}

export async function markDeliveryPublishing(id: string) {
  return db.socialDelivery.update({
    where: { id },
    data: {
      status: 'publishing',
      lastAttemptAt: new Date(),
      nextAttemptAt: null,
    },
  });
}

export async function markDeliveryResult(
  id: string,
  result: {
    ok: boolean;
    error?: string;
    id?: string | null;
    permalink?: string | null;
    rateLimited?: boolean;
    tokenExpired?: boolean;
    downgraded?: string;
  },
  currentAttempts: number,
) {
  const attempts = currentAttempts + 1;
  if (result.ok) {
    return db.socialDelivery.update({
      where: { id },
      data: {
        status: 'published',
        attempts,
        publishedAt: new Date(),
        externalId: result.id ?? null,
        permalink: result.permalink ?? null,
        errorCode: null,
        error: result.downgraded ?? null,
        nextAttemptAt: null,
        metadata: result.downgraded ? { downgraded: result.downgraded } : undefined,
      },
    });
  }

  const errorCode = classifySocialDeliveryError(result);
  const retryable = isRetryableDeliveryError(errorCode) && attempts < 3;
  const status = result.tokenExpired || ['PERMISSION_MISSING', 'DESTINATION_INVALID'].includes(errorCode)
    ? 'blocked'
    : retryable
      ? 'retry_wait'
      : 'failed';
  const nextAttemptAt = retryable
    ? new Date(Date.now() + deliveryRetryDelayMinutes(attempts) * 60000)
    : null;

  return db.socialDelivery.update({
    where: { id },
    data: {
      status,
      attempts,
      errorCode,
      error: result.error?.slice(0, 500) ?? 'unknown platform error',
      nextAttemptAt,
    },
  });
}
