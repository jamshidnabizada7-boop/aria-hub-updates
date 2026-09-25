import { db } from '@/lib/db';
import {
  buildTodaysQueue,
  publishDueQueue,
  renderDueQueue,
} from '@/lib/social/publisher';

const SOCIAL_LOCK_STALE_MS = 20 * 60 * 1000;

export interface SocialTickResult {
  ran: boolean;
  reason?: string;
  queue?: { created: number; error?: string };
  rendered: number;
  published: number;
  failed: number;
  errors: string[];
}

async function acquireSocialLock(): Promise<boolean> {
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - SOCIAL_LOCK_STALE_MS).toISOString();
  const claim = JSON.stringify({ socialTickRunning: true, socialTickStartedAt: now });
  const n = await db.$executeRaw\`
    INSERT INTO "AutomationState" (id, state, "updatedAt")
    VALUES ('singleton', ${claim}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
    SET state = "AutomationState".state || ${claim}::jsonb, "updatedAt" = now()
    WHERE COALESCE(("AutomationState".state->>'socialTickRunning')::boolean, false) = false
       OR ("AutomationState".state->>'socialTickStartedAt') IS NULL
       OR ("AutomationState".state->>'socialTickStartedAt')::timestamptz < ${stale}::timestamptz\`;
  return n === 1;
}

async function releaseSocialLock(): Promise<void> {
  await db.$executeRaw\`
    UPDATE "AutomationState"
    SET state = state || '{"socialTickRunning":false}'::jsonb
    WHERE id = 'singleton'\`;
}

/**
 * Fast, independent social-distribution loop.
 *
 * Deliberately excludes scraping and translation so a slow import can never
 * starve a scheduled social post. Queue and delivery claim logic remains
 * idempotent when this runs beside the legacy all-in-one automation tick.
 */
export async function runSocialTick(
  baseUrl: string,
  options: { renderLimit?: number; publishLimit?: number } = {},
): Promise<SocialTickResult> {
  if (!(await acquireSocialLock())) {
    return { ran: false, reason: 'social_tick_locked_elsewhere', rendered: 0, published: 0, failed: 0, errors: [] };
  }

  const run = await db.pipelineRun.create({
    data: { kind: 'social_publish', status: 'running' },
  });

  const result: SocialTickResult = {
    ran: true,
    rendered: 0,
    published: 0,
    failed: 0,
    errors: [],
  };

  try {
    try {
      result.queue = await buildTodaysQueue();
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 180);
      result.queue = { created: 0, error: message };
      result.errors.push(\`queue: ${message}\`);
    }

    try {
      const rendered = await renderDueQueue(baseUrl, Math.min(10, Math.max(1, options.renderLimit ?? 5)));
      result.rendered = rendered.rendered;
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 180);
      result.errors.push(\`render: ${message}\`);
    }

    try {
      const published = await publishDueQueue(Math.min(10, Math.max(1, options.publishLimit ?? 5)));
      result.published = published.published;
      result.failed = published.failed;
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 180);
      result.errors.push(\`publish: ${message}\`);
    }

    await db.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: result.errors.length || result.failed ? 'partial' : 'ok',
        stats: result as unknown as object,
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 180);
    result.errors.push(message);
    await db.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: 'error',
        message,
        stats: result as unknown as object,
        finishedAt: new Date(),
      },
    }).catch(() => undefined);
  } finally {
    await releaseSocialLock().catch(() => undefined);
  }

  return result;
}
