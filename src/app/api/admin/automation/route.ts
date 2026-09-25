import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { getState, patchState, DEFAULT_SLOTS_AFT, composeCaptionWithLimit, deepLinkOf } from '@/lib/social/publisher';
import { publishToPlatform } from '@/lib/social/channels';
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

  // Credentials NEVER leave the server — the panel gets "which fields are
  // configured" flags + public identifiers only.
  const safeChannels = channels.map((ch) => ({
    ...ch,
    credentials: maskCredentials(ch.credentials),
  }));

  return NextResponse.json({
    ok: true,
    state: { ...state, publishTimes: state.publishTimes?.length ? state.publishTimes : DEFAULT_SLOTS_AFT },
    channels: safeChannels,
    queue,
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
        // Honest test per platform: Instagram physically cannot post without
        // an image, so a caption-only test there used to always "fail".
        if (platform === 'instagram') {
          const missing = ['igUserId', 'accessToken'].filter((k) => !String(creds[k] || ''));
          return NextResponse.json({
            ok: false,
            error: missing.length
              ? `instagram: missing ${missing.join('/')}`
              : 'instagram: config present — Instagram needs a rendered image; use "Publish now" on a ready queue row to test end-to-end',
            configOk: missing.length === 0,
          });
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
          if (prevResults[ch.platform]?.ok) continue; // never double-post a channel
          const caption = composeCaptionWithLimit(fresh.captionJson, [...langs], CAPTION_LIMITS[ch.platform] ?? 2200);
          const creds = decryptCredentials(ch.credentials);
          const r = await publishToPlatform(ch.platform, creds, {
            caption,
            imageUrl: images.square ?? null,
            imagePath: images.local ?? null,
            link: deepLinkOf(caption) || (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com'),
          });
          results[ch.platform] = { ok: r.ok, ...(r.error ? { error: r.error } : {}), ...(r.downgraded ? { downgraded: r.downgraded } : {}) };
          if (r.ok) {
            anyOk = true;
            external[ch.platform] = { id: r.id ?? null, permalink: r.permalink ?? null };
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
