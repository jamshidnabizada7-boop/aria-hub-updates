/** The sources whose fresh opportunities must be checked every UTC day. */
export const PRIMARY_OPPORTUNITY_KEYS = new Set([
  'acbar',
  'wazifaha',
  'jobsaf',
  'o4af',
  'scholarshipsAf',
]);

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIMARY_INTERVAL_MS = DAY_MS / 2;
const WEEK_MS = 7 * DAY_MS;
const RETRY_MS = 60 * 60 * 1000;

export interface ScheduledSource {
  id: string;
  name: string;
  scraperKey: string;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
  lastRunStats: string | null;
}

function remainingNew(stats: string | null): number {
  try {
    const value = JSON.parse(stats || '{}').remainingNew;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

function oldestFirst(a: ScheduledSource, b: ScheduledSource): number {
  return (a.lastRunAt?.getTime() ?? 0) - (b.lastRunAt?.getTime() ?? 0) || a.name.localeCompare(b.name);
}

/**
 * Reserve the hourly cron slots for the five primary sites twice daily. When a run
 * runs out of time with unseen listings, retry it after one hour, then use
 * remaining slots for the other opportunity sources once a week.
 */
export function selectScheduledOpportunitySource(
  sources: ScheduledSource[],
  now: Date,
): ScheduledSource | null {
  const primary = sources.filter((s) => PRIMARY_OPPORTUNITY_KEYS.has(s.scraperKey));
  const secondary = sources.filter((s) => !PRIMARY_OPPORTUNITY_KEYS.has(s.scraperKey));
  const age = (s: ScheduledSource) => now.getTime() - (s.lastRunAt?.getTime() ?? 0);

  const duePrimary = primary.filter((s) => !s.lastRunAt || age(s) >= PRIMARY_INTERVAL_MS).sort(oldestFirst);
  if (duePrimary.length) return duePrimary[0];

  const backlog = primary.filter((s) =>
    s.lastRunAt && age(s) >= RETRY_MS && remainingNew(s.lastRunStats) > 0,
  ).sort(oldestFirst);
  if (backlog.length) return backlog[0];

  const dueSecondary = secondary.filter((s) => !s.lastRunAt || age(s) >= WEEK_MS).sort(oldestFirst);
  return dueSecondary[0] ?? null;
}
