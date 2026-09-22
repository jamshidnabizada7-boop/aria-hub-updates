import { describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';

describe('Persian and Pashto font typography system', () => {
  const root = path.resolve(__dirname, '..');
  const globalsCss = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
  const layoutTsx = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
  const langSyncTsx = fs.readFileSync(path.join(root, 'src/components/site/lang-sync.tsx'), 'utf8');
  const tailwindConfig = fs.readFileSync(path.join(root, 'tailwind.config.ts'), 'utf8');

  it('configures Vazirmatn in layout.tsx with Arabic and Latin subsets and system fallbacks', () => {
    expect(layoutTsx).toContain('Vazirmatn');
    expect(layoutTsx).toContain('"arabic"');
    expect(layoutTsx).toContain('"latin"');
    expect(layoutTsx).toContain('--font-vazirmatn');
    expect(layoutTsx).toContain('Noto Sans Arabic');
  });

  it('disables Geist auto font fallback to prevent Arial from hijacking Arabic script', () => {
    expect(layoutTsx).toContain('adjustFontFallback: false');
  });

  it('defines RTL font stack in globals.css with Vazirmatn as the primary typeface', () => {
    expect(globalsCss).toContain('--font-sans-rtl: var(--font-vazirmatn)');
    expect(globalsCss).toContain('--font-family-sans: var(--font-sans-rtl)');
  });

  it('activates Vazirmatn for lang="fa", lang="ps", and dir="rtl"', () => {
    expect(globalsCss).toContain(':root[dir="rtl"]');
    expect(globalsCss).toContain(':root[lang="fa"]');
    expect(globalsCss).toContain(':root[lang="ps"]');
    expect(globalsCss).toContain('[dir="rtl"]');
    expect(globalsCss).toContain('[lang="fa"]');
    expect(globalsCss).toContain('[lang="ps"]');
  });

  it('applies Vazirmatn to all body copy, buttons, nav, forms, tables, badges, and card summaries', () => {
    expect(globalsCss).toContain('[dir="rtl"] p');
    expect(globalsCss).toContain('[dir="rtl"] button');
    expect(globalsCss).toContain('[dir="rtl"] nav a');
    expect(globalsCss).toContain('[dir="rtl"] input');
    expect(globalsCss).toContain('[dir="rtl"] table');
    expect(globalsCss).toContain('[dir="rtl"] [data-slot="card-description"]');
    expect(globalsCss).toContain('[dir="rtl"] [data-slot="badge"]');
  });

  it('neutralizes letter-spacing in RTL so connected Arabic letters never break ligatures', () => {
    expect(globalsCss).toContain('letter-spacing: 0 !important');
  });

  it('protects Persian/Pashto headings and card titles from dot-clipping with comfortable line-heights', () => {
    expect(globalsCss).toContain('line-height: 1.45 !important');
    expect(globalsCss).toContain('line-height: 1.4 !important');
  });

  it('synchronizes document.documentElement lang and dir on client transitions in LangSync', () => {
    expect(langSyncTsx).toContain('document.documentElement.lang = lang');
    expect(langSyncTsx).toContain('document.documentElement.dir = lang === \'en\' ? \'ltr\' : \'rtl\'');
  });

  it('exposes vazirmatn in tailwind.config.ts fontFamily', () => {
    expect(tailwindConfig).toContain('vazirmatn: [\'var(--font-vazirmatn)\', \'sans-serif\']');
  });
});
