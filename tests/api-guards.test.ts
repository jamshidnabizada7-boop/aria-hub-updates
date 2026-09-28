/**
 * Auth-guard regression tests — the Phase 0 security closures MUST stay
 * closed. These hit the running dev/prod server over HTTP; they SKIP
 * (instead of failing) when no server is reachable, so `bun test` works
 * everywhere.
 *
 * Run: bun test tests/api-guards.test.ts   (server on localhost:3000)
 */
import { describe, expect, test } from 'bun:test';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
let serverUp = false;
try {
  const res = await fetch(`${BASE}/api/opportunities/list?limit=1`, { signal: AbortSignal.timeout(5000) });
  serverUp = res.status === 200 && (res.headers.get('content-type')?.includes('application/json') ?? false);
} catch {
  serverUp = false;
}

describe.skipIf(!serverUp)('security closures (Phase 0 regressions)', () => {
  test('GET /api/admin/seed is 401 (was: created a known super-admin)', async () => {
    const res = await fetch(`${BASE}/api/admin/seed`, { signal: AbortSignal.timeout(10000) });
    expect(res.status).toBe(401);
  });

  test('GET /api/admin/import/trigger-all is gone (was: unauthenticated scraping)', async () => {
    const res = await fetch(`${BASE}/api/admin/import/trigger-all`, { signal: AbortSignal.timeout(10000) });
    expect(res.status).toBe(404);
  });

  test('GET /api/admin/import/simple-import is gone (was: content injection)', async () => {
    const res = await fetch(`${BASE}/api/admin/import/simple-import`, { signal: AbortSignal.timeout(10000) });
    expect(res.status).toBe(404);
  });

  test('POST /api/templates is 401 (was: anonymous publishing)', async () => {
    const res = await fetch(`${BASE}/api/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'attack', content: 'x' }),
      signal: AbortSignal.timeout(10000),
    });
    expect(res.status).toBe(401);
  });

  test('admin stats and CRUD are 401 without a session', async () => {
    expect((await fetch(`${BASE}/api/admin/stats`, { signal: AbortSignal.timeout(10000) })).status).toBe(401);
    expect((await fetch(`${BASE}/api/admin/crud?model=Opportunity`, { signal: AbortSignal.timeout(10000) })).status).toBe(401);
  });

  test('public list API still works (guards did not over-tighten)', async () => {
    const res = await fetch(`${BASE}/api/opportunities/list?limit=1`, { signal: AbortSignal.timeout(15000) });
    expect(res.status).toBe(200);
  });

  test('public AI endpoints are rate-limited (rapid calls → 429)', async () => {
    const codes: number[] = [];
    // 15 rapid sequential probes against a 10/min/IP budget — at least one
    // must land a 429. Short timeouts keep the whole burst inside the window.
    for (let i = 0; i < 15; i++) {
      try {
        const res = await fetch(`${BASE}/api/visa-prep/ai-rejection-advice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'rate-limit-probe' }),
          signal: AbortSignal.timeout(5000),
        });
        codes.push(res.status);
      } catch {
        codes.push(0); // network hiccup — not a rate-limit signal either way
      }
    }
    expect(codes.filter((c) => c === 429).length).toBeGreaterThan(0);
  });
});
