import type { DesignFamilyId } from './types';

export const ROTATION_POOLS = {
  career: ['career-ledger', 'career-signal', 'career-ticket'],
  scholarship: ['scholarship-atlas', 'scholarship-journal', 'scholarship-fellow'],
  deadline: ['deadline-clock', 'deadline-bulletin', 'deadline-calendar'],
} as const;

export function rotationCategory(template: string, category = ''): keyof typeof ROTATION_POOLS | null {
  if (template === 'deadline') return 'deadline';
  if (template === 'hiring' || /job|career|وظیفه|شغل|دنده/i.test(category)) return 'career';
  if (/scholar|fellow|بورسی|تحصیل/i.test(category)) return 'scholarship';
  return null;
}

/** Stable across retries/locales; category ordinal guarantees variety within a batch. */
export function rotatedFamily(template: string, category: string, seed: string, ordinal = 0): DesignFamilyId | null {
  const group = rotationCategory(template, category);
  if (!group) return null;
  const hash = Array.from(seed).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  const pool = ROTATION_POOLS[group];
  return pool[(hash + ordinal) % pool.length] as DesignFamilyId;
}

export function deadlineSnapshot(deadline: string | null | undefined, now: number) {
  const end = deadline ? Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline + 'T23:59:59+04:30' : deadline) : NaN;
  if (!Number.isFinite(end) || !Number.isFinite(now)) return null;
  const remaining = end - now;
  if (remaining <= 0) return { status: 'closed' as const, value: 0, unit: 'hours' as const };
  const hours = Math.ceil(remaining / 3600000);
  return { status: remaining <= 86400000 ? 'urgent' as const : 'open' as const, value: hours > 48 ? Math.ceil(hours / 24) : hours, unit: hours > 48 ? 'days' as const : 'hours' as const };
}
