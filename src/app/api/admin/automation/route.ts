import { canManageSocial } from '@/lib/social/permissions';
import { socialRenderBaseUrl } from '@/lib/automation/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { getState, patchState, DEFAULT_SLOTS_AFT } from '@/lib/social/publisher';
import {
  DEFAULT_OPPORTUNITY_BATCH_SIZE,
  DEFAULT_OPPORTUNITY_BATCH_TIMES_AFT,
  DEFAULT_OPPORTUNITY_DAILY_TARGET,
  DEFAULT_OPPORTUNITY_REPEAT_DAYS,
} from '@/lib/social/opportunity-distribution';
import { checkPlatformConnection, publishToPlatform } from '@/lib/social/channels';
import { decryptCredentials, encryptCredentials, maskCredentials } from '@/lib/social/credentials';
import { getProviderHealth } from '@/lib/ai/failover';

/**
 * GET  /api/admin/automation — status snapshot for the Automation panel:
 *        state (times/batch/toggles/backoff), channels (credentials MASKED —
 *        only "configured" flags + public ids, never secret values),
 *        pending counts, upcoming queue rows, last pipeline runs,
 *        untranslated counts.
 * POST /api/admin/automation — actions:
 *        { action: 'save-state', publishTimes?, captionLangs?, translateBatch?, autoImport?, autoPublish? }
 *        { action: 'save-channel', platform, label?, enabled, credentials? }
 *          — credentials are encrypted at rest; provided fields are MERGED
 *            into the stored ones (send only what changed).
 *        { action: 'test-channel', platform }
 *        { action: 'publish-now', id }      — immediately render+publish one queue row
 *        { action: 'cancel-post', id }
 */
export const dynamic = 'force-dynamic';

const PLATFORMS = ['telegram', 'facebook', 'instagram', 'x', 'linkedin', 'whatsapp'] as const;
/** Per-platform caption budgets (same table the publisher uses). */

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [state, channels, queue, runs] = await Promise.all([
    getState(),
    db.publishChannel.findMany({ orderBy: { platform: 'asc' } }),
    // Keep the existing Automation dashboard compatible with environments
    // where the optional Facebook Group migration has not been applied yet.
    // An unqualified Prisma findMany() selects every model column, including
    // the new group-distribution columns, which would make PostgreSQL reject
    // the whole request on an older schema.
    db.socialPostQueue.findMany({
      where: { scheduledFor: { gte: new Date(Date.now() - 7 * 86400000) } },
      orderBy: { scheduledFor: 'asc' },
      take: 30,
      select: {
        id: true,
        scheduledFor: true,
        templateType: true,
        contentRef: true,
        contentJson: true,
        captionJson: true,
        imagePaths: true,
        imageStatus: true,
        status: true,
        results: true,
        externalIds: true,
        attempts: true,
        claimedAt: true,
        publishedAt: true,
        error: true,
        notifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.pipelineRun.findMany({ orderBy: { startedAt: 'desc' }, take: 8 }),
  ]);

  // Translation progress is driven by atomic per-language state, not merely
  // the presence of a title key. This prevents truncated bodies from being
  // counted as "translated".
  const untranslated = await db.$queryRaw<{ opportunities: number; news: number }[]>\`
    SELECT
      (SELECT COUNT(*)::int FROM "Opportunity" o
        WHERE o.status = 'published'
          AND NOT EXISTS (
            SELECT 1 FROM "OpportunityTranslation" t
            WHERE t."opportunityId" = o.id AND t.lang = 'fa' AND t.status = 'complete'
          )) AS opportunities,
      (SELECT COUNT(*)::int FROM "News"
        WHERE status = 'published'
          AND ("titleI18n" IS NULL OR "titleI18n"->>'fa' IS NULL OR "titleI18n"->>'fa' = '')) AS news
  \`;
  const counts = untranslated[0] ?? { opportunities: 0, news: 0 };

  const progressRows = await db.$queryRaw<Array<{
    active: number;
    faComplete: number;
    faProcessing: number;
    faFailed: number;
    psComplete: number;
    psProcessing: number;
    psFailed: number;
  }>>\`
    SELECT
      COUNT(*) FILTER (WHERE o.status = 'published')::int AS active,
      COUNT(*) FILTER (WHERE o.status = 'published' AND fa.status = 'complete')::int AS "faComplete",
      COUNT(*) FILTER (WHERE o.status = 'published' AND fa.status = 'processing')::int AS "faProcessing",
      COUNT(*) FILTER (WHERE o.status = 'published' AND fa.status = 'failed')::int AS "faFailed",
      COUNT(*) FILTER (WHERE o.status = 'published' AND ps.status = 'complete')::int AS "psComplete",
      COUNT(*) FILTER (WHERE o.status = 'published' AND ps.status = 'processing')::int AS "psProcessing",
      COUNT(*) FILTER (WHERE o.status = 'published' AND ps.status = 'failed')::int AS "psFailed"
    FROM "Opportunity" o
    LEFT JOIN "OpportunityTranslation" fa
      ON fa."opportunityId" = o.id AND fa.lang = 'fa'
    LEFT JOIN "OpportunityTranslation" ps
      ON ps."opportunityId" = o.id AND ps.lang = 'ps'
  \`;
  const translationProgress = progressRows[0] ?? {
    active: 0,
    faComplete: 0,
    faProcessing: 0,
    faFailed: 0,
    psComplete: 0,
    psProcessing: 0,
    psFailed: 0,
  };

  // Delivery tracking is additive. Gracefully return an empty list before the
  // migration reaches an environment so the rest of Automation remains usable.
  const deliveries = queue.length
    ? await db.socialDelivery.findMany({
        where: { queueId: { in: queue.map((row) => row.id) } },
        select: {
          id: true,
          queueId: true,
          platform: true,
          status: true,
          attempts: true,
          errorCode: true,
          error: true,
          permalink: true,
          publishedAt: true,
          nextAttemptAt: true,
        },
        orderBy: [{ queueId: 'asc' }, { platform: 'asc' }],
      }).catch(() => [])
    : [];
  const deliveriesByQueue = new Map<string, typeof deliveries>();
  for (const delivery of deliveries) {
    const list = deliveriesByQueue.get(delivery.queueId) ?? [];
    list.push(delivery);
    deliveriesByQueue.set(delivery.queueId, list);
  }

  // Credentials NEVER leave the server — the panel gets "which fields are
  // configured" flags + public identifiers only.
  const safeChannels = channels.map((ch) => {
    const credentials = maskCredentials(ch.credentials);
    if (ch.platform === 'whatsapp' && !credentials.mode && typeof credentials.channelId === 'string') {
      credentials.mode = 'channel';
    }
    return { ...ch, credentials };
  });

  return NextResponse.json({
    ok: true,
    state: {
      ...state,
      publishTimes: state.publishTimes?.length ? state.publishTimes : DEFAULT_SLOTS_AFT,
      opportunityOnlyAutomation: true,
      opportunityDailyTarget: state.opportunityDailyTarget ?? DEFAULT_OPPORTUNITY_DAILY_TARGET,
      opportunityBatchSize: state.opportunityBatchSize ?? DEFAULT_OPPORTUNITY_BATCH_SIZE,
      opportunityRepeatDays: state.opportunityRepeatDays ?? DEFAULT_OPPORTUNITY_REPEAT_DAYS,
      opportunityBatchTimes: state.opportunityBatchTimes?.length
        ? state.opportunityBatchTimes
        : DEFAULT_OPPORTUNITY_BATCH_TIMES_AFT,
    },
    channels: safeChannels,
    queue: queue.map((row) => ({
      ...row,
      deliveries: deliveriesByQueue.get(row.id) ?? [],
    })),
    runs,
    untranslated: counts,
    translationProgress: {
      ...translationProgress,
      faPending: Math.max(0, translationProgress.active - translationProgress.faComplete),
      psWaitingForPersian: Math.max(0, translationProgress.active - translationProgress.faComplete),
      psPending: Math.max(0, translationProgress.faComplete - translationProgress.psComplete),
    },
    aiProviders: getProviderHealth(),
  });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageSocial(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const action = String(body.action || '');

  try {
    switch (action) {
      case 'save-state': {
        const patch: Record<string, unknown> = {};
        if (Array.isArray(body.publishTimes)) {
          const times = (body.publishTimes as unknown[]).map(String).filter((t) => /^\d{2}:\d{2}$/.test(t));
          if (times.length) patch.publishTimes = times.slice(0, 6);
        }
        if (Array.isArray(body.captionLangs)) {
          const langs = (body.captionLangs as unknown[]).map(String).filter((l) => ['fa', 'ps', 'en'].includes(l));
          if (langs.length) patch.captionLangs = langs;
        }
        if (body.translateBatch !== undefined) {
          patch.translateBatch = Math.min(8, Math.max(1, Number(body.translateBatch) || 3));
        }
        if (typeof body.autoImport === 'boolean') patch.autoImport = body.autoImport;
        if (typeof body.autoPublish === 'boolean') patch.autoPublish = body.autoPublish;
        if (body.opportunityDailyTarget !== undefined) {
          patch.opportunityDailyTarget = Math.min(50, Math.max(1, Number(body.opportunityDailyTarget) || DEFAULT_OPPORTUNITY_DAILY_TARGET));
        }
        if (body.opportunityBatchSize !== undefined) {
          patch.opportunityBatchSize = Math.min(10, Math.max(1, Number(body.opportunityBatchSize) || DEFAULT_OPPORTUNITY_BATCH_SIZE));
        }
        if (body.opportunityRepeatDays !== undefined) {
          patch.opportunityRepeatDays = Math.min(90, Math.max(1, Number(body.opportunityRepeatDays) || DEFAULT_OPPORTUNITY_REPEAT_DAYS));
        }
        if (Array.isArray(body.opportunityBatchTimes)) {
          const times = (body.opportunityBatchTimes as unknown[])
            .map(String)
            .filter((t) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t));
          if (times.length) patch.opportunityBatchTimes = [...new Set(times)].slice(0, 8).sort();
        }
        if (typeof body.studioTheme === 'string' && body.studioTheme) patch.studioTheme = body.studioTheme;
        if (typeof body.studioLayout === 'string' && body.studioLayout) patch.studioLayout = body.studioLayout;
        const next = await patchState(patch);
        return NextResponse.json({ ok: true, state: next });
      }

      case 'save-channel': {
        const platform = String(body.platform || '');
        if (!(PLATFORMS as readonly string[]).includes(platform)) {
          return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
        }
        const incoming = (body.credentials ?? {}) as Record<string, unknown>;
        // Merge semantics: the panel never receives stored secrets, so empty
        // fields mean "unchanged". Only non-empty provided values overwrite.
        const existing = await db.publishChannel.findUnique({ where: { platform } });
        const mergedCreds: Record<string, unknown> = { ...decryptCredentials(existing?.credentials) };
        for (const [k, v] of Object.entries(incoming)) {
          if (typeof v === 'string' && v.trim()) mergedCreds[k] = v.trim();
        }
        const hasAny = Object.values(mergedCreds).some((v) => typeof v === 'string' && v);
        const data = {
          label: String(body.label || existing?.label || platform),
          enabled: body.enabled === undefined ? (existing?.enabled ?? false) : Boolean(body.enabled),
          ...(hasAny ? { credentials: encryptCredentials(mergedCreds) as object } : {}),
        };
        const ch = await db.publishChannel.upsert({
          where: { platform },
          create: { platform, ...data },
          update: data,
        });
        return NextResponse.json({ ok: true, channel: { ...ch, credentials: maskCredentials(ch.credentials) } });
      }

      case 'test-channel': {
        const platform = String(body.platform || '');
        const ch = await db.publishChannel.findUnique({ where: { platform } });
        if (!ch) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        const creds = decryptCredentials(ch.credentials);
        // Facebook/Instagram "Test" is non-destructive: verify the configured
        // identity/token without creating a real social post.
        if (platform === 'facebook' || platform === 'instagram' || platform === 'linkedin' || platform === 'whatsapp') {
          const check = await checkPlatformConnection(platform, creds);
          await db.publishChannel.update({
            where: { id: ch.id },
            data: { lastStatus: check.ok ? 'ok' : 'error', lastError: check.ok ? null : check.error ?? 'failed' },
          });
          return NextResponse.json(check);
        }

        const r = await publishToPlatform(platform, creds, {
          caption: 'ARIA HUB — test message from Brand Studio automation. ✅',
        });
        await db.publishChannel.update({
          where: { id: ch.id },
          data: { lastStatus: r.ok ? 'ok' : 'error', lastError: r.ok ? null : r.error ?? 'failed' },
        });
        return NextResponse.json({ ok: r.ok, error: r.error });
      }


      case 'publish-now': {
        const id = String(body.id || '');
        const row = await db.socialPostQueue.findUnique({ where: { id } });
        if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        if (['published', 'cancelled', 'publishing', 'rendering'].includes(row.status)) {
          return NextResponse.json({ error: 'post_not_claimable', status: row.status }, { status: 409 });
        }
        const { renderOneQueueRow, publishQueueRow } = await import('@/lib/social/publisher');
        if (row.imageStatus !== 'ready') {
          await renderOneQueueRow(id, socialRenderBaseUrl());
        }
        const result = await publishQueueRow(id, { manual: true, force: body.force === true });
        return NextResponse.json(result, { status: result.ok || result.attempted ? 200 : 409 });
      }

      case 'cancel-post': {
        const id = String(body.id || '');
        const cancelled = await db.$transaction(async (tx) => {
          const result = await tx.socialPostQueue.updateMany({
            where: { id, status: { notIn: ['publishing', 'rendering', 'published'] } },
            data: { status: 'cancelled', claimedAt: null },
          });
          if (result.count) await tx.socialDelivery.updateMany({
            where: { queueId: id, status: { notIn: ['published', 'publishing'] } },
            data: { status: 'cancelled', nextAttemptAt: null },
          });
          return result.count;
        });
        return NextResponse.json({ ok: Boolean(cancelled) }, { status: cancelled ? 200 : 409 });
      }

      default:
        return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)).slice(0, 200) }, { status: 500 });
  }
}
