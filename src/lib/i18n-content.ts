/**
 * Localized Content Utility
 * 
 * Provides functions to retrieve the correct language variant from multilingual content fields.
 */

/**
 * Get localized content from a multilingual field
 * 
 * @param baseValue - The original single-language value (for backward compatibility)
 * @param i18nValue - The i18n JSON object containing translations { en: "...", fa: "...", ps: "..." }
 * @param lang - Target language code ('en', 'fa', 'ps')
 * @returns Localized content string with the following fallback priority:
 *          1. i18n[lang] - Content in requested language
 *          2. i18n.en - English fallback
 *          3. baseValue - Original field value
 *          4. '' - Empty string if nothing available
 * 
 * @example
 * // With full i18n data
 * const title = getLocalizedContent(
 *   'Service Title',
 *   { en: 'Service Title', fa: 'عنوان خدمت', ps: 'د خدمت سرلیک' },
 *   'fa'
 * ); // Returns: 'عنوان خدمت'
 * 
 * @example
 * // With missing language, falls back to English
 * const title = getLocalizedContent(
 *   'Service Title',
 *   { en: 'Service Title' },
 *   'fa'
 * ); // Returns: 'Service Title'
 * 
 * @example
 * // With no i18n data, uses base value
 * const title = getLocalizedContent(
 *   'Service Title',
 *   null,
 *   'fa'
 * ); // Returns: 'Service Title'
 * 
 * @example
 * // Usage in a component
 * import { getLocalizedContent } from '@/lib/i18n-content';
 * import { useLangStore } from '@/store/lang-store';
 * 
 * function ServiceCard({ service }) {
 *   const lang = useLangStore((s) => s.code);
 *   const title = getLocalizedContent(service.title, service.titleI18n, lang);
 *   const description = getLocalizedContent(service.description, service.descriptionI18n, lang);
 *   
 *   return (
 *     <div>
 *       <h3>{title}</h3>
 *       <p>{description}</p>
 *     </div>
 *   );
 * }
 */
/**
 * A localized value that is essentially just a URL (optionally wrapped in a
 * single HTML tag) is scraped junk — e.g. a sitemap URL that was persisted
 * into titleI18n/aiSummary before the scraper was fixed. Rendering it would
 * show "https://…" as a headline, so treat it as MISSING and fall through
 * to the next candidate in the chain (i18n.en → base value).
 * Self-contained so this module stays dependency-free (client-safe).
 */
function isJunkLocalizedValue(v: unknown): boolean {
  if (typeof v !== 'string') return true;
  const s = v.replace(/<[^>]+>/g, ' ').trim();
  if (!s) return true;
  // Bare URL: starts with http(s):// and contains no whitespace after the scheme
  return /^https?:\/\/\S+$/i.test(s);
}

export function getLocalizedContent(
  baseValue: string | null | undefined,
  i18nValue: unknown, // Prisma JsonValue in practice — validated below
  lang: string
): string {
  // Priority 1: Check if i18n value exists and has the requested language
  const i18n =
    i18nValue && typeof i18nValue === 'object' && !Array.isArray(i18nValue)
      ? (i18nValue as Record<string, unknown>)
      : null;
  if (i18n) {
    // Try requested language (junk values — bare URLs — count as missing)
    const inLang = i18n[lang];
    if (typeof inLang === 'string' && !isJunkLocalizedValue(inLang)) {
      return inLang;
    }

    // Fallback to English
    const inEn = i18n['en'];
    if (typeof inEn === 'string' && !isJunkLocalizedValue(inEn)) {
      return inEn;
    }
  }

  // Priority 2: Fall back to base value
  if (baseValue) {
    return baseValue;
  }

  // Priority 3: Return empty string
  return '';
}

/**
 * Get localized content from a JSON array field with i18n support
 * 
 * Some fields like 'features', 'requirements', 'documents' are stored as JSON arrays
 * with i18n variants. This function handles retrieving the correct language variant.
 * 
 * @param baseValue - The original JSON array as a string or parsed array
 * @param i18nValue - The i18n JSON object containing language-specific arrays
 * @param lang - Target language code
 * @returns Parsed array in the requested language, or empty array if nothing available
 * 
 * @example
 * // With i18n array data
 * const features = getLocalizedArray(
 *   '["Feature 1", "Feature 2"]',
 *   { en: ['Feature 1', 'Feature 2'], fa: ['ویژگی ۱', 'ویژگی ۲'] },
 *   'fa'
 * ); // Returns: ['ویژگی ۱', 'ویژگی ۲']
 */
export function getLocalizedArray(
  baseValue: string | any[] | null | undefined,
  i18nValue: unknown, // Prisma JsonValue in practice — validated below
  lang: string
): any[] {
  // Priority 1: Check if i18n value exists and has the requested language
  const i18n =
    i18nValue && typeof i18nValue === 'object' && !Array.isArray(i18nValue)
      ? (i18nValue as Record<string, unknown>)
      : null;
  if (i18n) {
    // Try requested language
    if (Array.isArray(i18n[lang])) {
      return i18n[lang] as any[];
    }

    // Fallback to English
    if (Array.isArray(i18n['en'])) {
      return i18n['en'] as any[];
    }
  }
  
  // Priority 2: Fall back to base value
  if (baseValue) {
    try {
      // If it's a string, try to parse it as JSON
      if (typeof baseValue === 'string') {
        return JSON.parse(baseValue);
      }
      // If it's already an array, return it
      if (Array.isArray(baseValue)) {
        return baseValue;
      }
    } catch (e) {
      // If parsing fails, return empty array
      return [];
    }
  }
  
  // Priority 3: Return empty array
  return [];
}
