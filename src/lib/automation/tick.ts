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
const MIN_FREE_MB_RENDER = 900;
const TRANSLATE_BACKOFF_MIN = 30;

export interface TickResult {
  ran: boolean;
  reason?: string;
  import?: { ran: number; ok: number; error?: string };
  translate?: { processed: number; failed: number; rateLimited: boolean; skipped: boolean; error?: string };
  queue?: { created: number; error?: string };
  publish?: { rendered: number; published: number; failed: number; error?: string };
  /** step-level failures — a tick with errors is recorded as 'partial', never 'ok' */
  errors: string[];
}

/**
 * Cross-process tick lock.
 *
 * The in-memory flag below cannot see across processes — the 5-min in-process
 * scheduler, the 15-min external cron and the admin "Run now" button all
 * converge here, and a dev server + a CLI tick run in different processes.
 * This is an atomic compare-and-set on the AutomationState singleton: it
 * succeeds only when no tick is running OR the previous claim is stale
 * (crashed process that never released).
 */
const TICK_LOCK_STALE_MS = 30 * 60 * 1000;

export async function acquireTickLock(): Promise<boolean> {
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - TICK_LOCK_STALE_MS).toISOString();
  const claim = JSON.stringify({ tickRunning: true, tickStartedAt: now });
  const n = await db.$executeRaw`
    INSERT INTO "AutomationState" (id, state, "updatedAt")
    VALUES ('singleton', ${claim}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
    SET state = "AutomationState".state || ${claim}::jsonb, "updatedAt" = now()
    WHERE COALESCE(("AutomationState".state->>'tickRunning')::boolean, false) = false
       OR ("AutomationState".state->>'tickStartedAt') IS NULL
       OR ("AutomationState".state->>'tickStartedAt')::timestamptz < ${stale}::timestamptz`;
  return n === 1;
}

export async function releaseTickLock(): Promise<void> {
  await db.$executeRaw`
    UPDATE "AutomationState"
    SET state = state || '{"tickRunning":false}'::jsonb
    WHERE id = 'singleton'`;
}

function freeMb(): number {
  return Math.floor(os.freemem() / 1024 / 1024);
}

async function stepImport(state: Awaited<ReturnType<typeof getState>>, runId: string, errors: string[]): Promise<{ ran: number; ok: number }> {
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
      else errors.push(`import ${src.name}: ${String(summary.error).slice(0, 120)}`);
    } catch (e) {
      ran++;
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 120);
      errors.push(`import ${src.name}: ${msg}`);
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

async function stepTranslate(state: Awaited<ReturnType<typeof getState>>, errors: string[]): Promise<{ processed: number; failed: number; rateLimited: boolean; skipped: boolean; error?: string }> {
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
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 160);
    errors.push(`translate: ${msg}`);
    await patchState({ translateBackoffUntil: new Date(Date.now() + TRANSLATE_BACKOFF_MIN * 60000).toISOString() });
    return { processed: 0, failed: 0, rateLimited: true, skipped: false, error: msg };
  }
}

export async function runTick(baseUrl = 'http://127.0.0.1:3000', opts?: { skipImport?: boolean; skipTranslate?: boolean }): Promise<TickResult> {
  const g = globalThis as unknown as { __ariaTickRunning?: boolean };
  if (g.__ariaTickRunning) return { ran: false, reason: 'tick_already_running', errors: [] };
  if (freeMb() < MIN_FREE_MB) return { ran: false, reason: `low_memory_${freeMb()}mb`, errors: [] };
  // Cross-process guard: the in-memory flag cannot see the cron backstop or
  // a CLI tick in another process — the DB lock can.
  if (!(await acquireTickLock())) return { ran: false, reason: 'tick_locked_elsewhere', errors: [] };
  g.__ariaTickRunning = true;

  // Housekeeping: ticks abandoned by a crashed/OOM-killed process stay
  // 'running' forever — mark old runs stale. The threshold must sit ABOVE the
  // legit tick budget (IMPORT_GLOBAL_TIMEOUT_MS can be 10 min), else healthy
  // long runs get poisoned as errors.
  await db.pipelineRun.updateMany({
    where: { status: 'running', startedAt: { lt: new Date(Date.now() - 30 * 60000) } },
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

  // Housekeeping: prune generated post images older than 30 days (the folder
  // used to grow unbounded — one 1080px PNG per post per day).
  await import('@/lib/social/publisher')
    .then((m) => m.cleanupGeneratedPosts())
    .catch(() => undefined);

  const run = await db.pipelineRun.create({ data: { kind: 'tick', status: 'running' } });
  const result: TickResult = { ran: true, errors: [] };

  try {
    const state = await getState();

    // 1. import due sources (skippable via cron fast-path)
    if (!opts?.skipImport) result.import = await stepImport(state, run.id, result.errors);

    // 2. translate a small batch (skippable via cron fast-path)
    if (!opts?.skipTranslate) result.translate = await stepTranslate(state, result.errors);

    // 3. build today's social queue (once/day)
    try {
      result.queue = await buildTodaysQueue();
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 160);
      result.queue = { created: 0, error: msg };
      result.errors.push(`queue: ${msg}`);
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
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 160);
      result.publish = { rendered: 0, published: 0, failed: 0, error: msg };
      result.errors.push(`publish: ${msg}`);
    }

    // A tick with any step error is 'partial' at best — silent failures used
    // to be recorded as 'ok' with zeroed counters.
    const okAll =
      result.errors.length === 0 &&
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
    await releaseTickLock().catch(() => undefined);
  }

  return result;
}
