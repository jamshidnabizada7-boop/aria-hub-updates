'use client';

import { useEffect } from 'react';
import { useLangStore } from '@/lib/lang-store';
import type { Language } from '@/lib/types';

/**
 * Keeps the client-side language store in sync with the URL's /{lang} prefix.
 * Rendered by the [lang] layout on every request so that navigating directly
 * to /en or /ps (or being redirected there) updates localStorage-backed state.
 */
export function LangSync({ lang, languages }: { lang: string; languages: Language[] }) {
  const setLanguages = useLangStore((s) => s.setLanguages);
  const setLang = useLangStore((s) => s.setLang);
  const current = useLangStore((s) => s.code);

  useEffect(() => {
    setLanguages(languages);
  }, [languages, setLanguages]);

  useEffect(() => {
    if (lang !== current) setLang(lang);
  }, [lang, current, setLang]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    }
  }, [lang]);

  return null;
}
