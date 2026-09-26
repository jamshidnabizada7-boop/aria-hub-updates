import { runSocialTick } from '../src/lib/automation/social-tick';
import { socialRenderBaseUrl } from '../src/lib/automation/auth';
import { db } from '../src/lib/db';

const baseUrl = socialRenderBaseUrl();
const encryptionSecret = process.env.CREDENTIALS_SECRET || process.env.ADMIN_SESSION_SECRET;
if (!encryptionSecret || encryptionSecret.length < 16) {
  throw new Error('Set the same CREDENTIALS_SECRET (or ADMIN_SESSION_SECRET) used by the web app');
}
if (process.env.NODE_ENV === 'production' && (!process.env.SOCIAL_RENDER_TOKEN || !process.env.BLOB_READ_WRITE_TOKEN)) {
  throw new Error('Production worker requires SOCIAL_RENDER_TOKEN and BLOB_READ_WRITE_TOKEN');
}
function bounded(value: string | undefined, fallback: number, min: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
}
const intervalMs = bounded(process.env.SOCIAL_WORKER_INTERVAL_MS, 60_000, 30_000, 3_600_000);
const renderLimit = bounded(process.env.SOCIAL_WORKER_RENDER_LIMIT, 5, 1, 10);
const publishLimit = bounded(process.env.SOCIAL_WORKER_PUBLISH_LIMIT, 5, 1, 10);
const once = process.argv.includes('--once');
const shutdown = new AbortController();
let stopping = false;

function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  shutdown.abort();
  console.log('[social-worker] ' + signal + ' received; finishing current cycle');
}
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

console.log('[social-worker] starting', JSON.stringify({ baseUrl, intervalMs, renderLimit, publishLimit }));
try {
  do {
    const started = Date.now();
    try {
      const result = await runSocialTick(baseUrl, { renderLimit, publishLimit });
      // A healthy idle cycle is represented by the database heartbeat.
      if (once || result.queue?.created || result.rendered || result.published || result.failed || result.errors.length) {
        console.log('[social-worker]', JSON.stringify({ at: new Date().toISOString(), ms: Date.now() - started, ...result }));
      }
    } catch {
      console.error('[social-worker] cycle failed; check database connectivity and worker configuration');
      if (once) process.exitCode = 1;
    }
    if (once || stopping) break;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        shutdown.signal.removeEventListener('abort', finish);
        resolve();
      };
      const timer = setTimeout(finish, intervalMs);
      shutdown.signal.addEventListener('abort', finish, { once: true });
      if (stopping) finish();
    });
  } while (!stopping);
} finally {
  await db.$disconnect();
  console.log('[social-worker] stopped');
}
