'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/lib/types';

interface LangState {
  code: string;
  dir: 'ltr' | 'rtl';
  languages: Language[];
  setLanguages: (l: Language[]) => void;
  setLang: (code: string) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      code: 'fa',
      dir: 'rtl',
      languages: [],
      setLanguages: (l) => {
        const current = get().code;
        const exists = l.find((x) => x.code === current);
        const def = l.find((x) => x.isDefault) || l[0];
        const active = exists || def;
        set({ languages: l, code: active?.code || 'fa', dir: (active?.direction as 'ltr' | 'rtl') || 'rtl' });
      },
      setLang: (code) => {
        const lang = get().languages.find((l) => l.code === code);
        if (lang) set({ code, dir: lang.direction as 'ltr' | 'rtl' });
      },
    }),
    { name: 'aria-lang', skipHydration: true }
  )
);
