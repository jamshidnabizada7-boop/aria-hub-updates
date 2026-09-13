'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * URL-language context.
 *
 * The [lang] layout provides the language parsed from the URL path. Client
 * components (useT, useLangHref, Navbar…) prefer this value over the zustand
 * language store so that SERVER-RENDERED HTML always matches the URL language.
 *
 * Why: the zustand store is a module singleton that initializes to 'fa' on the
 * server and is only corrected after hydration (LangSync effects). Without the
 * context, every SSR page rendered Persian chrome regardless of /en or /ps —
 * wrong HTML for users on slow connections and for search-engine crawlers.
 *
 * Components rendered outside the [lang] layout (e.g. /admin) get null and
 * fall back to the store as before.
 */
const LangContext = createContext<string | null>(null);

export function LangProvider({ lang, children }: { lang: string; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** URL language when available (SSR-safe), otherwise null. */
export function useLangContext(): string | null {
  return useContext(LangContext);
}

/** Effective UI language: URL context wins, store is the fallback. */
export function useEffectiveLang(): string {
  return useContext(LangContext) ?? 'fa';
}
