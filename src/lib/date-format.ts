import { format } from 'date-fns';
import type { Lang } from '@/lib/lang-route';

/**
 * Shared locale-aware Gregorian date formatting.
 *
 * English → "October 15, 2026" (date-fns).
 * Farsi/Pashto → Afghan-standard Gregorian month names + Eastern Arabic
 * digits («۱۵ اکتوبر ۲۰۲۶»), UTC-safe so server/client render identically.
 */
export const GREGORIAN_MONTHS: Record<'fa' | 'ps', string[]> = {
  fa: [
    'جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون',
    'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دیسمبر',
  ],
  ps: [
    'جنوري', 'فبروري', 'مارچ', 'اپریل', 'مې', 'جون',
    'جولای', 'اګست', 'سپتمبر', 'اکتوبر', 'نومبر', 'ډیسمبر',
  ],
};

export function toEasternDigits(value: string, lang: Lang): string {
  if (lang === 'en') return value;
  const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return value.replace(/[0-9]/g, (d) => digits[Number(d)]);
}

export function parseSafeDate(date: Date | string | number | null | undefined): Date | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

export function toSafeIsoString(date: Date | string | number | null | undefined): string {
  const d = parseSafeDate(date);
  return d ? d.toISOString() : '';
}

/** "15 October 2026" → «۱۵ اکتوبر ۲۰۲۶» (fa) / «۱۵ اکتوبر ۲۰۲۶» (ps). */
export function formatGregorianLong(date: Date | string | number | null | undefined, lang: Lang): string {
  const d = parseSafeDate(date);
  if (!d) return '';
  const months = GREGORIAN_MONTHS[lang === 'ps' ? 'ps' : 'fa'];
  const month = months[d.getUTCMonth()];
  if (!month) return '';
  const text = `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
  return toEasternDigits(text, lang);
}

/** Locale-aware long date for detail pages: "October 15, 2026" / «۱۵ اکتوبر ۲۰۲۶». */
export function formatDateLong(date: Date | string | number | null | undefined, lang: Lang): string {
  try {
    const d = parseSafeDate(date);
    if (!d) return '';
    return lang === 'en' ? format(d, 'MMMM d, yyyy') : formatGregorianLong(d, lang);
  } catch {
    return '';
  }
}

/** Locale-aware short date for cards/chips: "Oct 15, 2026" / «۱۵ اکتوبر ۲۰۲۶». */
export function formatDateShort(date: Date | string | number | null | undefined, lang: Lang): string {
  try {
    const d = parseSafeDate(date);
    if (!d) return '';
    return lang === 'en' ? format(d, 'MMM d, yyyy') : formatGregorianLong(d, lang);
  } catch {
    return '';
  }
}
