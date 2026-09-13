/**
 * Shared helpers for AI provider adapters.
 */

/**
 * Best-effort parse of a JSON object from an LLM response. Models sometimes
 * wrap JSON in markdown fences or add prose; we extract the first {...} block.
 */
export function parseJSON(raw: string): Record<string, any> | null {
  if (!raw) return null;
  // Strip markdown code fences
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  // Try direct parse first
  try { return JSON.parse(s); } catch { /* continue */ }
  // Extract first {...} block
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const slice = s.slice(start, end + 1);
    try { return JSON.parse(slice); } catch { /* continue */ }
  }
  return null;
}

/**
 * Retry a promise-returning function up to `max` times with exponential backoff.
 * Rethrows the last error if all attempts fail.
 */
export async function retry<T>(fn: () => Promise<T>, max = 3, baseMs = 1000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      // Circuit-breaker open → fail fast, no sleep/retries (the breaker
      // re-opens itself after the cooldown; hammering it is pointless).
      if (e?.message?.includes('circuit-breaker')) throw e;
      // Check if it's a rate limit error
      const isRateLimit = e?.message?.includes('rate_limit') || e?.message?.includes('429');
      if (isRateLimit && i < max - 1) {
        // For rate limits, wait longer
        const waitTime = baseMs * Math.pow(2, i) * 2;
        console.log(`⏳ Rate limit hit, waiting ${waitTime}ms before retry ${i + 1}/${max}...`);
        await sleep(waitTime);
      } else if (i < max - 1) {
        await sleep(baseMs * Math.pow(2, i));
      }
    }
  }
  throw lastErr;
}

/**
 * Add a small delay between API calls to avoid rate limiting.
 * Call this after each API request.
 */
export async function rateLimitDelay(ms = 500): Promise<void> {
  return sleep(ms);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
