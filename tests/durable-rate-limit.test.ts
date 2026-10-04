/**
 * PHASE 6 — durable Postgres-backed rate limiter.
 * Atomic upsert-increment, fixed windows, fail-open, opportunistic cleanup.
 * Uses the isolated ariahub_test database.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { checkDurableRateLimit, allowDurable } = await import('../src/lib/security/durable-rate-limit');
const { db } = await import('../src/lib/db');

let dbUp = false;
try {
  if (isolatedTestDatabase) await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch { dbUp = false; }

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);
const runId = Date.now().toString(36);

describeIf(dbUp)('durable rate limiter (db)', () => {
  afterAll(async () => {
    await db.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "key" LIKE ${`drl-${runId}%`}`;
  });

  test('enforces the limit within the window, then allows after expiry', async () => {
    const key = `drl-${runId}-basic`;
    const now = 1_700_000_000_000;
    for (let i = 0; i < 5; i++) {
      const r = await checkDurableRateLimit(db, key, 5, 60_000, new Date(now + i * 100));
      expect(r.allowed).toBe(true);
      expect(r.count).toBe(i + 1);
    }
    const blocked = await checkDurableRateLimit(db, key, 5, 60_000, new Date(now + 600));
    expect(blocked.allowed).toBe(false);
    expect(blocked.count).toBe(6);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    // next window → fresh
    const fresh = await checkDurableRateLimit(db, key, 5, 60_000, new Date(now + 61_000));
    expect(fresh.allowed).toBe(true);
    expect(fresh.count).toBe(1);
  });

  test('counters are durable and shared across "instances" (separate client objects)', async () => {
    const key = `drl-${runId}-shared`;
    await checkDurableRateLimit(db, key, 1, 60_000);
    // a second call through a brand-new PrismaClient simulates another instance
    const { PrismaClient } = await import('@prisma/client');
    const p2 = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    try {
      const r = await checkDurableRateLimit(p2 as never, key, 1, 60_000);
      expect(r.count).toBe(2);
      expect(r.allowed).toBe(false); // the shared counter proves durability
    } finally {
      await p2.$disconnect();
    }
  });

  test('keys are namespaced and atomic under concurrency', async () => {
    const key = `drl-${runId}-atomic`;
    const results = await Promise.all(
      Array.from({ length: 10 }, () => checkDurableRateLimit(db, key, 10, 60_000)),
    );
    const counts = results.map((r) => r.count).sort((a, b) => a - b);
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // no lost updates
    expect(results.filter((r) => r.allowed).length).toBe(10);
  });

  test('allowDurable fails OPEN when the table is unavailable', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const broken = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres@127.0.0.1:1/none?connect_timeout=1' } } });
    try {
      const ok = await allowDurable(broken as never, 'drl-failopen', [runId], 5, 60_000);
      expect(ok).toBe(true); // fail-open: storage outage never blocks the site
    } finally {
      await broken.$disconnect().catch(() => {});
    }
  });
});
