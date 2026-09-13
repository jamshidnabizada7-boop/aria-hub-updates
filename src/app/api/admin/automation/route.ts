import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { getState, patchState, DEFAULT_SLOTS_AFT } from '@/lib/social/publisher';
import { publishToPlatform } from '@/lib/social/channels';

/**
 * GET  /api/admin/automation — status snapshot for the Automation panel:
 *        state (times/batch/toggles/backoff), channels, pending counts,
 *        upcoming queue rows, last pipeline runs, untranslated counts.
 * POST /api/admin/automation — actions:
 *        { action: 'save-state', publishTimes?, captionLangs?, translateBatch?, autoImport?, autoPublish? }
 *        { action: 'save-channel', platform, label?, enabled, credentials? }
 *        { action: 'test-channel', platform }
 *        { action: 'publish-now', id }      — immediately render+publish one queue row
 *        { action: 'cancel-post', id }
 */
export const dynamic = 'force-dynamic';

const PLATFORMS = ['telegram', 'facebook', 'instagram', 'x'] as const;

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [state, channels, queue, runs] = await Promise.all([
    getState(),
    db.publishChannel.findMany({ orderBy: { platform: 'asc' } }),
    db.socialPostQueue.findMany({
      where: { scheduledFor: { gte: new Date(Date.now() - 7 * 86400000) } },
      orderBy: { scheduledFor: 'asc' },
      take: 30,
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

  return NextResponse.json({
    ok: true,
    state: { ...state, publishTimes: state.publishTimes?.length ? state.publishTimes : DEFAULT_SLOTS_AFT },
    channels,
    queue,
    runs,
    untranslated: counts,
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
        const next = await patchState(patch);
        return NextResponse.json({ ok: true, state: next });
      }

      case 'save-channel': {
        const platform = String(body.platform || '');
        if (!(PLATFORMS as readonly string[]).includes(platform)) {
          return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
        }
        const data = {
          label: String(body.label || platform),
          enabled: Boolean(body.enabled),
          ...(body.credentials !== undefined ? { credentials: body.credentials as object } : {}),
        };
        const ch = await db.publishChannel.upsert({
          where: { platform },
          create: { platform, ...data },
          update: data,
        });
        return NextResponse.json({ ok: true, channel: ch });
      }

      case 'test-channel': {
        const platform = String(body.platform || '');
        const ch = await db.publishChannel.findUnique({ where: { platform } });
        if (!ch) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        const creds = (ch.credentials ?? {}) as Record<string, unknown>;
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
        const { renderDueQueue } = await import('@/lib/social/publisher');
        // Force-render this specific row if it has no image yet, then publish.
        if (row.imageStatus !== 'ready') {
          const { renderOneQueueRow } = await import('@/lib/social/publisher');
          await renderOneQueueRow(row.id);
        }
        const fresh = await db.socialPostQueue.findUniqueOrThrow({ where: { id } });
        const state = await getState();
        const channels = await db.publishChannel.findMany({ where: { enabled: true } });
        const { composeCaption } = await import('@/lib/social/publisher');
        const caption = composeCaption(fresh.captionJson, state.captionLangs?.length ? state.captionLangs : ['fa', 'ps', 'en']);
        const images = (fresh.imagePaths ?? {}) as { square?: string; local?: string };
        const results: Record<string, { ok: boolean; error?: string }> = {};
        let anyOk = false;
        for (const ch of channels) {
          const creds = (ch.credentials ?? {}) as Record<string, unknown>;
          const r = await publishToPlatform(ch.platform, creds, {
            caption,
            imageUrl: images.square ?? null,
            imagePath: images.local ?? null,
            link: 'https://www.myariahub.com',
          });
          results[ch.platform] = r;
          if (r.ok) anyOk = true;
        }
        await db.socialPostQueue.update({
          where: { id },
          data: {
            status: anyOk ? 'published' : 'failed',
            results,
            attempts: { increment: 1 },
            publishedAt: anyOk ? new Date() : null,
            error: anyOk ? null : 'no enabled channels or all failed',
          },
        });
        return NextResponse.json({ ok: anyOk, results });
      }

      case 'cancel-post': {
        const id = String(body.id || '');
        await db.socialPostQueue.update({ where: { id }, data: { status: 'cancelled' } });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)).slice(0, 200) }, { status: 500 });
  }
}
