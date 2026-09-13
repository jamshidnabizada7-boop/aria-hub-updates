'use client';

import { useLangStore } from '@/lib/lang-store';
import { useLangContext } from '@/components/site/lang-context';
import { translate } from '@/lib/i18n';

/**
 * Translation Hook (useT)
 * 
 * A React hook that provides a translation function (`t`) which automatically uses
 * the current language from the language store. This hook subscribes to language
 * changes and causes components to re-render when the user switches languages.
 * 
 * BASIC USAGE:
 * 
 * ```tsx
 * import { useT } from '@/hooks/use-t';
 * 
 * function MyComponent() {
 *   const t = useT();
 *   
 *   return (
 *     <div>
 *       <h1>{t('hero.title')}</h1>
 *       <p>{t('hero.subtitle')}</p>
 *       <button>{t('common.save')}</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * PARAMETRIC TRANSLATIONS:
 * 
 * For translations with dynamic values, pass an object as the second parameter.
 * Placeholders in the translation string (e.g., {count}, {name}) will be replaced
 * with the provided values.
 * 
 * ```tsx
 * function SearchResults() {
 *   const t = useT();
 *   const totalResults = 42;
 *   const filteredResults = 15;
 *   
 *   return (
 *     <div>
 *       // Translation: 'Showing {count} of {total}'
 *       <p>{t('admin.table.showing', { count: filteredResults, total: totalResults })}</p>
 *       // Result: 'Showing 15 of 42'
 *       
 *       // Translation: '{count} results'
 *       <p>{t('search.resultsCount', { count: totalResults })}</p>
 *       // Result: '42 results'
 *     </div>
 *   );
 * }
 * ```
 * 
 * ADMIN PANEL USAGE:
 * 
 * ```tsx
 * function AdminDashboard() {
 *   const t = useT();
 *   
 *   return (
 *     <div>
 *       <h1>{t('admin.dashboard.title')}</h1>
 *       <button>{t('admin.button.addNew')}</button>
 *       <button>{t('admin.button.save')}</button>
 *       <button>{t('admin.button.delete')}</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * AUTOMATIC RE-RENDERING:
 * 
 * The hook subscribes to the language store via Zustand, so when the user changes
 * the language using the language switcher, all components using `useT()` will
 * automatically re-render with the new language translations.
 * 
 * FALLBACK BEHAVIOR:
 * 
 * If a translation key is missing in the current language, the system falls back
 * to English automatically. If the key doesn't exist in English either, the key
 * itself is returned (useful for debugging missing translations).
 * 
 * @returns A translation function that accepts a key and optional parameters
 */
export function useT() {
  // URL language (context) wins so SSR HTML matches the requested language;
  // the zustand store remains the fallback for surfaces outside /[lang]
  // (e.g. /admin) and still drives reactive switches inside the layout.
  const ctxLang = useLangContext();
  const storeCode = useLangStore((s) => s.code);
  const code = ctxLang ?? storeCode;
  return (key: string, params?: Record<string, string | number>) => translate(code, key, params);
}
