import { describe, test, expect } from 'bun:test';
import { ARI_COPY, ariContext, ariCanFloat, ariLinks } from '../src/lib/ari';
import { ariPosterGeometry, resolveAriPoster } from '../src/lib/social/ari-poster';
import { AriPosterFrame } from '../src/lib/social/ari-poster-frame';
import { createElement } from 'react';
import sharp from 'sharp';

describe('ARI public safety and localization', () => {
  test('never overlays authentication, exports, private workspace or timed practice', () => {
    for (const lang of ['en', 'fa', 'ps']) for (const route of ['login', 'register', 'portal', 'account', 'social-poster', 'studio-render', 'interview-prep/practice/session', 'templates/example/editor', 'admin']) expect(ariContext(`/${lang}/${route}`)).toBeNull();
    for (const context of ['cv', 'letter', 'matcher', 'employer', 'contact', 'reading'] as const) expect(ariCanFloat(context)).toBe(false);
    expect(ariContext('/fa/submit-opportunity')).toBe('submit');
  });
  test('all six navigation actions use actual localized public routes and canonical categories', () => {
    for (const lang of ['en', 'fa', 'ps'] as const) {
      const links = ariLinks(lang); expect(links).toHaveLength(6);
      for (const link of links) expect(link.href.startsWith(`/${lang}/`)).toBe(true);
      expect(links[0].href.endsWith('category=job')).toBe(true);
      expect(links[1].href.endsWith('category=scholarship')).toBe(true);
      for (const value of Object.values(ARI_COPY[lang].contexts)) { expect(value.length).toBeGreaterThan(30); if (lang !== 'en') expect(/[\u0600-\u06ff]/.test(value)).toBe(true); }
    }
  });
});
describe('ARI poster opt-in and collision protection', () => {
  test('no mascot leaves the original renderer tree unchanged', () => {
    const original = createElement('div', { 'data-original': 'yes' }, 'Official headline and QR');
    expect(AriPosterFrame({ height: 1080, children: original })).toBe(original);
  });
  test('malformed saved overrides cannot choose URLs, grow outside band or produce NaN', () => {
    expect(resolveAriPoster({ preset: 'https://evil.invalid' as any, size: Infinity }).preset).toBe('none');
    for (const height of [1080, 1350, 1920]) for (const size of [-100, 140, 180, 210, 9999, NaN]) {
      const g = ariPosterGeometry(height, { preset: 'scholar', size });
      expect(g.size).toBeGreaterThanOrEqual(140); expect(g.size).toBeLessThanOrEqual(210);
      expect(g.contentHeight + g.band).toBe(height);
      expect(g.scale).toBeGreaterThan(.75); expect(g.contentWidth).toBeLessThanOrEqual(1080);
    }
  });
  test('shipping assets have real alpha and transparent canvas corners', async () => {
    for (const name of ['classic', 'minimal', 'scholar', 'global', 'celebrating', 'thinking', 'blink']) {
      const file = `public/images/ari/${name}-256.webp`;
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(256); expect(info.height).toBe(256);
      expect(data[3]).toBe(0); expect(data[data.length - 1]).toBe(0);
    }
  });
});
