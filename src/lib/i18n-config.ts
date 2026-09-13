/**
 * Canonical locale configuration — the single source of truth for the
 * supported languages. Several modules import the Lang type from here;
 * this file used to not exist while ten imports pointed at it (masked by
 * ignoreBuildErrors — now the module is real).
 */
export const LANGS = ['en', 'fa', 'ps'] as const;

export type Lang = (typeof LANGS)[number];

/** Default content language (site copy is fa-first). */
export const DEFAULT_LANG: Lang = 'fa';

export function isLang(value: string | null | undefined): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}
