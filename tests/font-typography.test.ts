import { describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';

describe('Persian and Pashto font typography system', () => {
  const root = path.resolve(__dirname, '..');
  const globalsCss = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
  const layoutTsx = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
  const langSyncTsx = fs.readFileSync(path.join(root, 'src/components/site/lang-sync.tsx'), 'utf8');
  const tailwindConfig = fs.readFileSync(path.join(root, 'tailwind.config.ts'), 'utf8');

  it('configures Vazirmatn in layout.tsx with Arabic and Latin subsets and robust Arabic system fallbacks', () => {
    expect(layoutTsx).toContain('Vazirmatn');
    expect(layoutTsx).toContain('"arabic"');
    expect(layoutTsx).toContain('"latin"');
    expect(layoutTsx).toContain('--font-vazirmatn');
    expect(layoutTsx).toContain('Noto Sans Arabic');
    expect(layoutTsx).toContain('Tahoma');
    expect(layoutTsx).toContain('Segoe UI Historic');
  });

  it('configures Geist and Geist_Mono font variables', () => {
    expect(layoutTsx).toContain('--font-geist-sans');
    expect(layoutTsx).toContain('--font-geist-mono');
  });

  it('defines robust font stacks in globals.css for both RTL (Vazirmatn first) and Latin (Geist first)', () => {
    expect(globalsCss).toContain('--font-sans-rtl: var(--font-vazirmatn)');
    expect(globalsCss).toContain('--font-sans-latin: "Geist"');
    expect(globalsCss).toContain('--font-family-sans: var(--font-sans-latin)');
  });

  it('activates Vazirmatn for lang="fa", lang="ps", dir="rtl", and .rtl-text', () => {
    expect(globalsCss).toContain(':root[dir="rtl"]');
    expect(globalsCss).toContain(':root[lang="fa"]');
    expect(globalsCss).toContain(':root[lang="ps"]');
    expect(globalsCss).toContain('[dir="rtl"]');
    expect(globalsCss).toContain('[lang="fa"]');
    expect(globalsCss).toContain('[lang="ps"]');
    expect(globalsCss).toContain('.rtl-text');
  });

  it('supports explicit LTR containers inside RTL to inherit Latin primary font stack', () => {
    expect(globalsCss).toContain('[dir="ltr"]');
    expect(globalsCss).toContain('[lang="en"]');
    expect(globalsCss).toContain('.ltr-text');
    expect(globalsCss).toContain('--font-family-sans: var(--font-sans-latin)');
  });

  it('declares Persian/Pashto base typography in @layer base for clean cascade overrides', () => {
    expect(globalsCss).toContain('@layer base');
    expect(globalsCss).toContain('font-family: var(--font-sans-rtl)');
    expect(globalsCss).toContain('text-rendering: optimizeLegibility');
  });

  it('sets comfortable body, paragraph, and description line-heights (1.7-1.75)', () => {
    expect(globalsCss).toContain('line-height: 1.75');
    expect(globalsCss).toContain('[data-slot="card-description"]');
  });

  it('sets crisp 500 (Medium) font weight on buttons, nav links, and badges in RTL', () => {
    expect(globalsCss).toContain('font-weight: 500');
    expect(globalsCss).toContain('[data-slot="badge"]');
    expect(globalsCss).toContain('[data-slot="button"]');
    expect(globalsCss).toContain('nav a');
  });

  it('protects monospace elements (code, kbd, pre, samp, .font-mono) from being overridden in RTL mode', () => {
    expect(globalsCss).toContain('font-family: var(--font-mono) !important');
    expect(globalsCss).toContain('.font-mono');
  });

  it('neutralizes negative tracking to protect cursive Arabic script while preserving LTR/wide tracking', () => {
    expect(globalsCss).toContain('.tracking-tight');
    expect(globalsCss).toContain('.tracking-tighter');
    expect(globalsCss).toContain('letter-spacing: 0 !important');
    expect(globalsCss).toContain(':not([dir="ltr"]):not([lang="en"])');
  });

  it('protects Persian/Pashto diacritics and dots from tight line-height clipping', () => {
    expect(globalsCss).toContain('.leading-none:not([dir="ltr"]):not([lang="en"])');
    expect(globalsCss).toContain('line-height: 1.4 !important');
    expect(globalsCss).toContain('.leading-tight:not([dir="ltr"]):not([lang="en"])');
    expect(globalsCss).toContain('line-height: 1.45 !important');
    expect(globalsCss).toContain('.leading-snug:not([dir="ltr"]):not([lang="en"])');
    expect(globalsCss).toContain('line-height: 1.55 !important');
  });

  it('synchronizes document.documentElement lang and dir on client transitions in LangSync', () => {
    expect(langSyncTsx).toContain('document.documentElement.lang = lang');
    expect(langSyncTsx).toContain("document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl'");
  });

  it('exposes vazirmatn, sans, and mono in tailwind.config.ts fontFamily', () => {
    expect(tailwindConfig).toContain("vazirmatn: ['var(--font-vazirmatn)', 'sans-serif']");
    expect(tailwindConfig).toContain("sans: ['var(--font-family-sans)', 'sans-serif']");
    expect(tailwindConfig).toContain("mono: ['var(--font-geist-mono)', 'monospace']");
  });
});
