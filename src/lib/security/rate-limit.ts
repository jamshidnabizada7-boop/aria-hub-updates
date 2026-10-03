/**
 * Shared in-memory rate limiter (Phase 22).
 *
 * One sliding-window implementation for every endpoint that needs it
 * (public submissions, employer auth, employer jobs/claims mutations).
 * Per-process by design — serverless cold starts reset it; the point is to
 * blunt bursts, not to be a distributed quota.
 */
const buckets = new Map<string, number[]>();

/** True when ALLOWED (under the limit); false when the caller must back off. */
export function checkRateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  // opportunistic pruning so the map cannot grow without bound
  if (buckets.size > 10_000) {
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

/** Key helper: user-or-IP plus a route namespace. */
export function rateLimitKey(namespace: string, ...identifiers: (string | null | undefined)[]): string {
  return `${namespace}:${identifiers.filter(Boolean).join(':')}`;
}

export function clientIpOf(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}
