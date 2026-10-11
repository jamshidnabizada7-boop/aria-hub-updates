'use client';
import { useId } from 'react';
import { ARI_COPY } from '@/lib/ari';
import { ARI_POSTER_PRESETS, resolveAriPoster, type AriPosterConfig, type AriPosterPreset } from '@/lib/social/ari-poster';
import type { Lang } from '@/lib/lang-route';

export function AriPosterControls({ lang, value, onChange }: { lang: Lang; value?: AriPosterConfig; onChange: (value: AriPosterConfig) => void }) {
  const id = useId(); const c = ARI_COPY[lang]; const v = resolveAriPoster(value);
  return <fieldset className="space-y-3 rounded-xl border bg-background/50 p-3" dir={lang === 'en' ? 'ltr' : 'rtl'}>
    <legend className="px-1 text-sm font-semibold">{c.studio}</legend>
    <label htmlFor={`${id}-preset`} className="block text-xs">{c.studio}</label>
    <select id={`${id}-preset`} value={v.preset} onChange={e => onChange({ ...v, preset: e.target.value as AriPosterPreset })} className="min-h-11 w-full rounded-lg border bg-background px-2 text-sm">
      {ARI_POSTER_PRESETS.map(p => <option key={p} value={p}>{c[p]}</option>)}
    </select>
    {v.preset !== 'none' ? <>
      <label htmlFor={`${id}-size`} className="block text-xs">{c.size} · {v.size}px</label>
      <input id={`${id}-size`} type="range" min={140} max={210} step={10} value={v.size} onChange={e => onChange({ ...v, size: Number(e.target.value) })} className="min-h-11 w-full accent-primary" />
      <label htmlFor={`${id}-align`} className="block text-xs">{c.placement}</label>
      <select id={`${id}-align`} value={v.align} onChange={e => onChange({ ...v, align: e.target.value as AriPosterConfig['align'] })} className="min-h-11 w-full rounded-lg border bg-background px-2 text-sm">{(['start', 'center', 'end'] as const).map(a => <option key={a} value={a}>{c[a]}</option>)}</select>
      <p className="text-xs text-muted-foreground">{c.safe}</p>
    </> : null}
  </fieldset>;
}
