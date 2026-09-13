'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect } from 'react';
import { useLangStore } from '@/lib/lang-store';

function LangSync() {
  const { code, dir } = useLangStore();
  useEffect(() => {
    // Defer rehydration past React's hydration commit phase to prevent error #418
    const t = setTimeout(() => {
      useLangStore.persist.rehydrate();
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const html = document.documentElement;
    html.lang = code;
    html.dir = dir;
  }, [code, dir]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <LangSync />
      {children}
    </ThemeProvider>
  );
}
