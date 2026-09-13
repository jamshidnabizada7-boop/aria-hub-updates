import type { Lang } from '@/lib/i18n-config';
import { translate } from '@/lib/i18n';

/**
 * Client-safe story-type constants (no DB import) — keep in sync with
 * STORY_TYPES in src/lib/success-story-queries.ts.
 */
export const STORY_TYPES_CLIENT = [
  'scholarship',
  'job',
  'visa',
  'exchange',
  'training',
  'other',
] as const;

export function translateStoryTypeClient(type: string, lang: Lang): string {
  const key = `stories.type${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  const label = translate(lang, key);
  return label.startsWith('stories.') ? type : label;
}
