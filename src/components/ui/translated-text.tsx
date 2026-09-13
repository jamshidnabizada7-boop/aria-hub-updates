"use client";

import { useT } from '@/hooks/use-t';
import React from 'react';

export function TranslatedText({ tKey, params }: { tKey: string, params?: Record<string, string | number> }) {
  const t = useT();
  return <>{t(tKey, params)}</>;
}
