/**
 * Next.js instrumentation — starts the in-process automation scheduler ONCE.
 *
 * The scheduler calls the automation tick every 5 minutes. Ticks are small and
 * sequential by design (a couple of scrapes, a translation batch, queue
 * build/render/publish) so they never pressure the 4GB sandbox. The platform
 * 15-min cron hitting /api/admin/pipeline/tick is an independent backstop —
 * the tick is idempotent and lock-guarded.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // Escape hatch for environments with no reachable DB (local previews,
  // screenshot rigs) — the tick's DB retries would otherwise wedge the
  // event loop a couple of minutes after boot.
  if (process.env.ARIA_DISABLE_SCHEDULER === '1') return;
  const g = globalThis as unknown as { __ariaSchedulerStarted?: boolean };
  if (g.__ariaSchedulerStarted) return;
  g.__ariaSchedulerStarted = true;

  const INTERVAL_MS = 5 * 60 * 1000;
  // First tick waits 2 min: the tick's render step used to launch headless
  // chrome while Turbopack was still compiling boot routes → OOM-kill loop.
  const firstDelayMs = 120 * 1000;

  const loop = async () => {
    try {
      const { runTick } = await import('@/lib/automation/tick');
      const r = await runTick();
      if (r.ran) {
        console.log('[automation] tick:', JSON.stringify(r));
      }
    } catch (e) {
      console.error('[automation] tick failed:', (e instanceof Error ? e.message : e));
    }
  };

  setTimeout(() => {
    void loop();
    setInterval(() => void loop(), INTERVAL_MS);
  }, firstDelayMs);

  console.log('[automation] scheduler armed (every 5 min, first tick in 2 min)');
}
