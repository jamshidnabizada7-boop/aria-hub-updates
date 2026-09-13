/**
 * Automation tick — ONE small unit of work per invocation, safe to call every
 * few minutes from the in-process scheduler, the platform cron, or the admin
 * "Run now" button:
 *
 *   1. AUTO IMPORT   — run due enabled ImportSources (max 2/tick)
 *   2. TRANSLATE     — translate a small batch (default 3 rows/tick), opportunities
 *                      first; on 429 → 30 min backoff recorded in AutomationState
 *   3. SOCIAL QUEUE  — once per UTC day: build today's posting queue from the plan
 *   4. AUTO PUBLISH  — render + publish due queue rows to enabled channels
 *
 * Guarded by a global lock; skips gracefully when memory is critically low.
 */
import os from 'node:os';
import { db } from '@/lib/db';
import { runImport } from '@/lib/import/orchestrator';
import { translateNextBatch } from '@/lib/ai/translate-core';
import {
  getState, patchState, buildTodaysQueue, renderDueQueue, publishDueQueue,
} from '@/lib/social/publisher';

const MIN_FREE_MB = 350;
// Headless chrome + a fresh Turbopack route compile together need ~1.5-2GB.
// A 900MB gate still OOM'd the dev server during boot-compile waves.
const MIN_FREE_MB_RENDER = 1500;
const TRANSLATE_BACKOFF_MIN = 30;

export interface TickResult {
  ran: boolean;
  reason?: string;
  import?: { ran: number; ok: number };
  translate?: { processed: number; failed: number; rateLimited: boolean; skipped: boolean };
  queue?: { created: number };
  publish?: { rendered: number; published: number; failed: number };
}

function freeMb(): number {
  return Math.floor(os.freemem() / 1024 / 1024);
}

async function stepImport(state: Awaited<ReturnType<typeof getState>>, runId: string): Promise<{ ran: number; ok: number }> {
  if (state.autoImport === false) return { ran: 0, ok: 0 };
  // Sources due = enabled + (never run OR last run older than ~1h floor).
  const due = await db.importSource.findMany({
    where: {
      enabled: true,
      OR: [
        { lastRunAt: null },
        { lastRunAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
      ],
    },
    orderBy: { lastRunAt: 'asc' },
    take: 2,
  });
  let ran = 0;
  let ok = 0;
  for (const src of due) {
    // respect per-source cadence when set (min 30 min)
    if (src.lastRunAt && Date.now() - src.lastRunAt.getTime() < Math.max(30, src.scheduleMinutes) * 60000) continue;
    try {
      const summary = await runImport({ sourceId: src.id, triggeredBy: 'auto' });
      ran++;
      if (!summary.error) ok++;
    } catch {
      ran++;
    }
  }
  if (ran) {
    await db.pipelineRun.update({
      where: { id: runId },
      data: { stats: { import: { ran, ok } } },
    }).catch(() => undefined);
  }
  return { ran, ok };
}

async function stepTranslate(state: Awaited<ReturnType<typeof getState>>): Promise<{ processed: number; failed: number; rateLimited: boolean; skipped: boolean }> {
  if (state.translateBackoffUntil && new Date(state.translateBackoffUntil) > new Date()) {
    return { processed: 0, failed: 0, rateLimited: false, skipped: true };
  }
  const batch = Math.min(8, Math.max(1, state.translateBatch ?? 3));
  try {
    const r = await translateNextBatch(batch);
    if (r.rateLimited) {
      await patchState({ translateBackoffUntil: new Date(Date.now() + TRANSLATE_BACKOFF_MIN * 60000).toISOString() });
    } else if (state.translateBackoffUntil) {
      await patchState({ translateBackoffUntil: null });
    }
    return { ...r, skipped: false };
  } catch {
    await patchState({ translateBackoffUntil: new Date(Date.now() + TRANSLATE_BACKOFF_MIN * 60000).toISOString() });
    return { processed: 0, failed: 0, rateLimited: true, skipped: false };
  }
}

export async function runTick(baseUrl = 'http://127.0.0.1:3000'): Promise<TickResult> {
  const g = globalThis as unknown as { __ariaTickRunning?: boolean };
  if (g.__ariaTickRunning) return { ran: false, reason: 'tick_already_running' };
  if (freeMb() < MIN_FREE_MB) return { ran: false, reason: `low_memory_${freeMb()}mb` };
  g.__ariaTickRunning = true;

  // Housekeeping: ticks abandoned by a crashed/OOM-killed process stay
  // 'running' forever — mark runs older than 15 min as stale.
  await db.pipelineRun.updateMany({
    where: { status: 'running', startedAt: { lt: new Date(Date.now() - 15 * 60000) } },
    data: { status: 'error', message: 'stale (process died mid-tick)', finishedAt: new Date() },
  }).catch(() => undefined);

  // Housekeeping: expire opportunities whose deadline has passed. The
  // read-side filters already hide them from listings; marking the status
  // keeps the admin content-health "expired" counter truthful.
  await db.opportunity.updateMany({
    where: {
      status: 'published',
      deadline: { lt: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`) },
    },
    data: { status: 'expired' },
  }).catch(() => undefined);

  const run = await db.pipelineRun.create({ data: { kind: 'tick', status: 'running' } });
  const result: TickResult = { ran: true };

  try {
    const state = await getState();

    // 1. import due sources
    result.import = await stepImport(state, run.id);

    // 2. translate a small batch
    result.translate = await stepTranslate(state);

    // 3. build today's social queue (once/day)
    try {
      result.queue = await buildTodaysQueue();
    } catch {
      result.queue = { created: 0 };
    }

    // 4. render + publish due posts — rendering spawns a headless chrome,
    //    so it only runs with real memory headroom (OOM-killed the dev server
    //    when it fired during boot compiles). Publish still runs without image.
    try {
      let rendered = 0;
      if (freeMb() >= MIN_FREE_MB_RENDER) {
        const r = await renderDueQueue(baseUrl);
        rendered = r.rendered;
      }
      const pub = await publishDueQueue();
      result.publish = { rendered, published: pub.published, failed: pub.failed };
    } catch {
      result.publish = { rendered: 0, published: 0, failed: 0 };
    }

    const okAll =
      (result.import?.ok ?? 0) >= (result.import?.ran ?? 0) &&
      !result.translate?.rateLimited &&
      (result.publish?.failed ?? 0) === 0;
    await db.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: okAll ? 'ok' : 'partial',
        stats: result as unknown as object,
        finishedAt: new Date(),
      },
    });
  } catch (e) {
    result.reason = (e instanceof Error ? e.message : String(e)).slice(0, 200);
    await db.pipelineRun.update({
      where: { id: run.id },
      data: { status: 'error', message: result.reason, stats: result as unknown as object, finishedAt: new Date() },
    }).catch(() => undefined);
  } finally {
    g.__ariaTickRunning = false;
  }

  return result;
}
