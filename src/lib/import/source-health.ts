/**
 * ImportSource V2 health & scheduling helpers (Phase 6).
 *
 * Pure functions over a source-like shape — the Phase 8 worker (and the
 * admin panels) use these to decide whether a source is due, how long it
 * must back off after failures, and when its health state changes.
 *
 * Backoff ladder (plan baseline): 1→5min, 2→15min, 3→30min, 4→60min,
 * ≥5 → 120min + degraded; ≥8 → blocked. A success resets the ladder and
 * restores healthy (paused / pending_configuration are never auto-cleared).
 */

export const HEALTH_STATES = [
  'healthy',
  'degraded',
  'blocked',
  'paused',
  'pending_configuration',
] as const;

export type SourceHealth = (typeof HEALTH_STATES)[number];

/** Plan's priority baseline by source role. */
export const ROLE_PRIORITY: Record<string, number> = {
  employer_submission: 100,
  official_api: 95,
  official_feed: 95,
  official_careers: 90,
  official_ats: 90,
  official_government: 90,
  official_university: 90,
  aggregator: 30,
  discovery: 20,
};

/** Refinement for today's concrete scrapers (aggregators are not equal). */
export const SCRAPER_KEY_PRIORITY: Record<string, number> = {
  acbar: 60,
  reliefweb: 60,
  jobsaf: 55,
  wazifaha: 50,
  o4af: 30,
  scholarshipsAf: 30,
  wpApi: 30,
  rssNews: 25,
};

/** Effective priority: explicit sourceRole first, then scraperKey, then default. */
export function defaultPriorityFor(source: {
  sourceRole?: string | null;
  scraperKey?: string | null;
}): number {
  if (source.sourceRole && ROLE_PRIORITY[source.sourceRole] != null) return ROLE_PRIORITY[source.sourceRole];
  if (source.scraperKey && SCRAPER_KEY_PRIORITY[source.scraperKey] != null) return SCRAPER_KEY_PRIORITY[source.scraperKey];
  return source.scraperKey === 'rssNews' ? 25 : 30;
}

export interface SourceState {
  consecutiveFailures?: number | null;
  backoffUntil?: Date | null;
  healthStatus?: string | null;
  lastSuccessAt?: Date | null;
  lastFailureAt?: Date | null;
  scheduleMinutes?: number | null;
  nextRunAt?: Date | null;
  lastRunAt?: Date | null;
  enabled?: boolean | null;
}

const BACKOFF_MINUTES = [5, 15, 30, 60];

/** Backoff duration after the Nth consecutive failure (N = 1-based). */
export function backoffMinutesFor(consecutiveFailures: number): number {
  if (consecutiveFailures <= BACKOFF_MINUTES.length) return BACKOFF_MINUTES[consecutiveFailures - 1];
  return 120;
}

/** State transition after a FAILED run. */
export function nextFailureState(
  source: SourceState,
  now: Date = new Date(),
): Required<Pick<SourceState, 'consecutiveFailures' | 'backoffUntil' | 'healthStatus'>> & { lastFailureAt: Date } {
  const failures = (source.consecutiveFailures ?? 0) + 1;
  const backoffUntil = new Date(now.getTime() + backoffMinutesFor(failures) * 60_000);
  let healthStatus: SourceHealth = 'healthy';
  if (failures >= 8) healthStatus = 'blocked';
  else if (failures >= 5) healthStatus = 'degraded';
  else if (source.healthStatus === 'degraded' || source.healthStatus === 'blocked') healthStatus = 'degraded';
  return { consecutiveFailures: failures, backoffUntil, healthStatus, lastFailureAt: now };
}

/** State transition after a SUCCESSFUL run. */
export function nextSuccessState(
  source: SourceState,
  now: Date = new Date(),
): Required<Pick<SourceState, 'consecutiveFailures' | 'backoffUntil' | 'healthStatus'>> & { lastSuccessAt: Date } {
  // paused / pending_configuration are deliberate states — never auto-clear them
  const healthStatus: SourceHealth =
    source.healthStatus === 'paused' || source.healthStatus === 'pending_configuration'
      ? (source.healthStatus as SourceHealth)
      : 'healthy';
  return { consecutiveFailures: 0, backoffUntil: null, healthStatus, lastSuccessAt: now };
}

/** When the source should run next after a completed run. */
export function computeNextRunAt(
  source: SourceState,
  now: Date = new Date(),
): Date {
  const minutes = Math.max(5, source.scheduleMinutes ?? 60);
  return new Date(now.getTime() + minutes * 60_000);
}

/** True when a worker may run this source right now. */
export function isDue(
  source: SourceState & { enabled?: boolean | null },
  now: Date = new Date(),
): boolean {
  if (source.enabled === false) return false;
  if (source.backoffUntil && source.backoffUntil.getTime() > now.getTime()) return false;
  if (source.nextRunAt) return source.nextRunAt.getTime() <= now.getTime();
  const last = source.lastRunAt?.getTime();
  const minutes = Math.max(5, source.scheduleMinutes ?? 60);
  return !last || now.getTime() - last >= minutes * 60_000;
}
