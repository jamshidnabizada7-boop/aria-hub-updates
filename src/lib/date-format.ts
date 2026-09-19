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

/** "15 October 2026" → «۱۵ اکتوبر ۲۰۲۶» (fa) / «۱۵ اکتوبر ۲۰۲۶» (ps). */
export function formatGregorianLong(date: Date, lang: Lang): string {
  const months = GREGORIAN_MONTHS[lang === 'ps' ? 'ps' : 'fa'];
  const text = `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return toEasternDigits(text, lang);
}

/** Locale-aware long date for detail pages: "October 15, 2026" / «۱۵ اکتوبر ۲۰۲۶». */
export function formatDateLong(date: Date, lang: Lang): string {
  try {
    return lang === 'en' ? format(date, 'MMMM d, yyyy') : formatGregorianLong(date, lang);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Locale-aware short date for cards/chips: "Oct 15, 2026" / «۱۵ اکتوبر ۲۰۲۶». */
export function formatDateShort(date: Date, lang: Lang): string {
  try {
    return lang === 'en' ? format(date, 'MMM d, yyyy') : formatGregorianLong(date, lang);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
