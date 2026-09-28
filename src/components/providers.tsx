'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect } from 'react';
import { useLangStore } from '@/lib/lang-store';

function LangSync() {
  useEffect(() => {
    // Defer rehydration past React's hydration commit phase to prevent error #418
    const t = setTimeout(() => {
      useLangStore.persist.rehydrate();
    }, 0);
    return () => clearTimeout(t);
  }, []);
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
