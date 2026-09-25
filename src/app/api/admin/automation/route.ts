import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { getState, patchState, DEFAULT_SLOTS_AFT, composeCaptionWithLimit, deepLinkOf } from '@/lib/social/publisher';
import {
  DEFAULT_OPPORTUNITY_BATCH_SIZE,
  DEFAULT_OPPORTUNITY_BATCH_TIMES_AFT,
  DEFAULT_OPPORTUNITY_DAILY_TARGET,
  DEFAULT_OPPORTUNITY_REPEAT_DAYS,
} from '@/lib/social/opportunity-distribution';
import { checkPlatformConnection, publishToPlatform } from '@/lib/social/channels';
import { decryptCredentials, encryptCredentials, maskCredentials } from '@/lib/social/credentials';
import { ensureSocialDelivery, markDeliveryPublishing, markDeliveryResult } from '@/lib/social/delivery';
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
const CAPTION_LIMITS: Record<string, number> = { telegram: 1000, facebook: 4500, x: 270, instagram: 2100, linkedin: 2900, whatsapp: 3800 };

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

  // Exact untranslated counters via SQL (Prisma JSON path filters are
  // unreliable for "missing key" matching — they reported 0 while ~425 rows
  // still lacked fa).
  const untranslated = await db.$queryRaw<{ opportunities: number; news: number }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "Opportunity"
        WHERE status = 'published'
          AND ("titleI18n" IS NULL OR "titleI18n"->>'fa' IS NULL OR "titleI18n"->>'fa' = '')) AS opportunities,
      (SELECT COUNT(*)::int FROM "News"
        WHERE status = 'published'
          AND ("titleI18n" IS NULL OR "titleI18n"->>'fa' IS NULL OR "titleI18n"->>'fa' = '')) AS news
  `;
  const counts = untranslated[0] ?? { opportunities: 0, news: 0 };

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
      opportunityOnlyAutomation: state.opportunityOnlyAutomation !== false,
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
    aiProviders: getProviderHealth(),
  });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        if (typeof body.opportunityOnlyAutomation === 'boolean') {
          patch.opportunityOnlyAutomation = body.opportunityOnlyAutomation;
        }
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
        // Guard: re-publishing an already-published row used to be one click
        // away (and one double-click away from duplicates).
        if (row.status === 'published' && body.force !== true) {
          return NextResponse.json({ error: 'already_published', message: 'This post is already published. Pass force:true to republish deliberately.' }, { status: 409 });
        }
        const { renderOneQueueRow } = await import('@/lib/social/publisher');
        // Force-render this specific row if it has no image yet, then publish.
        if (row.imageStatus !== 'ready') {
          await renderOneQueueRow(row.id);
        }
        const fresh = await db.socialPostQueue.findUniqueOrThrow({ where: { id } });
        const requiresImage = ['spotlight', 'deadline'].includes(fresh.templateType);
        if (requiresImage && fresh.imageStatus !== 'ready') {
          return NextResponse.json({
            error: 'media_not_ready',
            message: 'This opportunity post requires a rendered durable image before publishing.',
          }, { status: 409 });
        }
        const state = await getState();
        const channels = await db.publishChannel.findMany({ where: { enabled: true } });
        const langs = state.captionLangs?.length ? state.captionLangs : (['fa', 'ps', 'en'] as const);
        const images = (fresh.imagePaths ?? {}) as { square?: string; local?: string };
        const prevResults = (fresh.results ?? {}) as Record<string, { ok?: boolean; error?: string }>;
        const results: Record<string, { ok: boolean; error?: string; downgraded?: string }> =
          { ...(prevResults as Record<string, { ok: boolean; error?: string; downgraded?: string }>) };
        const external: Record<string, { id: string | null; permalink: string | null }> =
          (fresh.externalIds ?? {}) as Record<string, { id: string | null; permalink: string | null }>;
        void external;
        let anyOk = Object.values(prevResults).some((r) => r.ok);
        for (const ch of channels) {
          const legacyOk = Boolean(prevResults[ch.platform]?.ok);
          const delivery = await ensureSocialDelivery(id, ch, legacyOk, external[ch.platform]);

          if (legacyOk || delivery.status === 'published') {
            results[ch.platform] = { ok: true };
            anyOk = true;
            continue;
          }
          if (['blocked', 'cancelled', 'failed'].includes(delivery.status) && body.force !== true) {
            results[ch.platform] = { ok: false, error: delivery.error ?? `${ch.platform}: delivery ${delivery.status}` };
            continue;
          }

          await markDeliveryPublishing(delivery.id);

          const caption = composeCaptionWithLimit(fresh.captionJson, [...langs], CAPTION_LIMITS[ch.platform] ?? 2200);
          const creds = decryptCredentials(ch.credentials);
          const r = await publishToPlatform(ch.platform, creds, {
            caption,
            imageUrl: images.square ?? null,
            imagePath: images.local ?? null,
            link: deepLinkOf(caption) || (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com'),
            requireImage: requiresImage,
          });
          await markDeliveryResult(delivery.id, r, delivery.attempts);

          results[ch.platform] = { ok: r.ok, ...(r.error ? { error: r.error } : {}), ...(r.downgraded ? { downgraded: r.downgraded } : {}) };
          if (r.ok) {
            anyOk = true;
            external[ch.platform] = { id: r.id ?? null, permalink: r.permalink ?? null };
            await db.publishChannel.update({
              where: { id: ch.id },
              data: { lastStatus: 'ok', lastError: null, lastPublishedAt: new Date() },
            });
          } else {
            await db.publishChannel.update({
              where: { id: ch.id },
              data: { lastStatus: 'error', lastError: r.error ?? 'unknown' },
            });
            if (r.tokenExpired) {
              await db.publishChannel.update({ where: { id: ch.id }, data: { enabled: false } });
            }
          }
        }
        const mergedList = Object.values(results);
        const allOk = mergedList.length > 0 && mergedList.every((r) => r.ok);
        const status = allOk ? 'published' : anyOk ? 'partial' : 'failed';
        await db.socialPostQueue.update({
          where: { id },
          data: {
            status,
            results,
            externalIds: Object.keys(external).length ? external : undefined,
            attempts: { increment: 1 },
            publishedAt: allOk ? (fresh.publishedAt ?? new Date()) : fresh.publishedAt ?? null,
            error: allOk ? null : mergedList.map((r) => r.error).filter(Boolean).join(' | ').slice(0, 500) || 'no enabled channels or all failed',
          },
        });
        return NextResponse.json({ ok: anyOk, status, results });
      }

      case 'cancel-post': {
        const id = String(body.id || '');
        await db.socialPostQueue.update({ where: { id }, data: { status: 'cancelled', claimedAt: null } });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)).slice(0, 200) }, { status: 500 });
  }
}
