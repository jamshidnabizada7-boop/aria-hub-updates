import { runSocialTick } from '../src/lib/automation/social-tick';

const baseUrl = (
  process.env.SOCIAL_RENDER_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://www.myariahub.com'
).replace(/\/$/, '');

const intervalMs = Math.max(
  30_000,
  Number(process.env.SOCIAL_WORKER_INTERVAL_MS || 60_000),
);
const renderLimit = Math.min(
  10,
  Math.max(1, Number(process.env.SOCIAL_WORKER_RENDER_LIMIT || 5)),
);
const publishLimit = Math.min(
  10,
  Math.max(1, Number(process.env.SOCIAL_WORKER_PUBLISH_LIMIT || 5)),
);

let stopping = false;
let running = false;

async function cycle() {
  if (stopping || running) return;
  running = true;
  const started = Date.now();
  try {
    const result = await runSocialTick(baseUrl, { renderLimit, publishLimit });
    console.log('[social-worker]', JSON.stringify({
      at: new Date().toISOString(),
      ms: Date.now() - started,
      ...result,
    }));
  } catch (error) {
    console.error(
      '[social-worker] cycle failed:',
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    running = false;
  }
}

function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`[social-worker] ${signal} received; stopping after current cycle`);
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

console.log('[social-worker] starting', JSON.stringify({
  baseUrl,
  intervalMs,
  renderLimit,
  publishLimit,
}));

await cycle();

while (!stopping) {
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
  await cycle();
}

console.log('[social-worker] stopped');
process.exit(0);
