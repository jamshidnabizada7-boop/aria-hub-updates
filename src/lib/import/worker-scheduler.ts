/**
 * Import-worker scheduling (Phase 8): pure selection logic.
 *
 * Among the DUE sources (enabled, past nextRunAt, backoff expired, not
 * paused/pending_configuration) the worker picks ONE per tick (initial
 * concurrency 1 — ACBAR may drive Chromium). Ordering follows the plan:
 *
 *   1. overdue time   — how long the source has been waiting (a never-run
 *      source is the most overdue, so fresh installs bootstrap naturally)
 *   2. priority       — higher ImportSource.priority first
 *   3. health         — healthy > degraded > blocked
 *
 * Because a source that just ran is not due again until its nextRunAt,
 * high-priority sources cannot permanently starve low-priority ones.
 */
import { isDue } from './source-health';

export interface WorkerCandidate {
  id: string;
  name: string;
  scraperKey: string;
  type?: string | null;
  priority?: number | null;
  healthStatus?: string | null;
  enabled?: boolean | null;
  nextRunAt?: Date | null;
  backoffUntil?: Date | null;
  lastRunAt?: Date | null;
  scheduleMinutes?: number | null;
}

const HEALTH_RANK: Record<string, number> = { healthy: 2, degraded: 1, blocked: 0 };

/** Sources the worker may consider right now (pure view of isDue). */
export function dueSources(candidates: WorkerCandidate[], now: Date): WorkerCandidate[] {
  return candidates.filter((c) =>
    isDue({
      enabled: c.enabled,
      backoffUntil: c.backoffUntil ?? null,
      nextRunAt: c.nextRunAt ?? null,
      lastRunAt: c.lastRunAt ?? null,
      scheduleMinutes: c.scheduleMinutes ?? null,
    }, now) && c.healthStatus !== 'paused' && c.healthStatus !== 'pending_configuration',
  );
}

/** How long the source has been waiting to run (ms). Never-run → Infinity-ranked. */
function overdueMs(c: WorkerCandidate, now: Date): number {
  if (c.nextRunAt) return now.getTime() - c.nextRunAt.getTime();
  if (c.lastRunAt) {
    const minutes = Math.max(5, c.scheduleMinutes ?? 60);
    return now.getTime() - (c.lastRunAt.getTime() + minutes * 60_000);
  }
  return Number.MAX_SAFE_INTEGER / 2; // never ran — top of the queue
}

/** The single source to run this tick, or null when nothing is due. */
export function pickNextSource(candidates: WorkerCandidate[], now: Date): WorkerCandidate | null {
  const due = dueSources(candidates, now);
  if (!due.length) return null;
  return [...due].sort((a, b) =>
    overdueMs(b, now) - overdueMs(a, now) ||
    (b.priority ?? 50) - (a.priority ?? 50) ||
    (HEALTH_RANK[b.healthStatus ?? 'healthy'] ?? 2) - (HEALTH_RANK[a.healthStatus ?? 'healthy'] ?? 2) ||
    a.name.localeCompare(b.name),
  )[0];
}

/** Small observability shape for worker logs. */
export function dueSummary(candidates: WorkerCandidate[], now: Date): {
  dueCount: number;
  byPriority: Array<{ name: string; priority: number; overdueMinutes: number }>;
} {
  const due = dueSources(candidates, now);
  return {
    dueCount: due.length,
    byPriority: due
      .map((c) => ({
        name: c.name,
        priority: c.priority ?? 50,
        overdueMinutes: Math.round(overdueMs(c, now) / 60_000),
      }))
      .sort((a, b) => b.overdueMinutes - a.overdueMinutes || b.priority - a.priority)
      .slice(0, 10),
  };
}
