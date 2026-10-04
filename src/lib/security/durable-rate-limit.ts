/**
 * Durable rate limiting (PHASE 6) — fixed-window counters in Postgres.
 *
 * Unlike the in-memory limiter (security/rate-limit.ts), counters survive
 * serverless cold starts and are shared across function instances. The
 * increment is a single atomic upsert, so concurrent instances cannot race.
 *
 * Fail-safe policy: FAIL-OPEN. If the database is unreachable, callers allow
 * the request — a storage outage must never take the site down; the limiter
 * only blunts abuse. Callers log the failure for visibility.
 *
 * Cleanup: the first hit in any new window opportunistically deletes rows
 * older than 1 hour (bounded work, no separate cron needed).
 */
import { PrismaClient } from '@prisma/client';

export interface DurableRateResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

/** Atomic fixed-window increment. Returns the decision for this request. */
export async function checkDurableRateLimit(
  db: PrismaClient,
  key: string,
  limit: number,
  windowMs: number,
  now: Date = new Date(),
): Promise<DurableRateResult> {
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000));

  const row = (await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "updatedAt")
    VALUES (${key}, ${windowStart}, 1, ${now})
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1, "updatedAt" = ${now}
    RETURNING "count"
  `) as Array<{ count: number }>;
  const count = row[0]?.count ?? 1;

  // Opportunistic cleanup on the first hit of a fresh window: drop buckets
  // older than 1 hour (all standard windows are ≤ 1 hour).
  if (count === 1) {
    try {
      await db.$executeRaw`
        DELETE FROM "RateLimitBucket" WHERE "windowStart" < ${new Date(now.getTime() - 3_600_000)}
      `;
    } catch { /* cleanup is best-effort */ }
  }

  return { allowed: count <= limit, count, limit, retryAfterSeconds };
}

/** Convenience wrapper mirroring the in-memory limiter's boolean shape. */
export async function allowDurable(
  db: PrismaClient,
  namespace: string,
  identifiers: Array<string | null | undefined>,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const key = `${namespace}:${identifiers.filter(Boolean).join(':')}`;
  try {
    return (await checkDurableRateLimit(db, key, limit, windowMs)).allowed;
  } catch (e) {
    console.warn('[durable-rate-limit] unavailable, failing open:', (e as Error).message);
    return true;
  }
}
