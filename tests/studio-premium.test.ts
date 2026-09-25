import { describe, expect, test } from 'bun:test';
import { TEMPLATE_DEFS } from '../src/lib/social/brand';
import {
  STUDIO_DESIGN_FAMILIES,
  STUDIO_TEMPLATE_DEFINITIONS,
  getCompatibleDesignFamilies,
  getStudioDesignFamily,
} from '../src/lib/social/studio/registry';
import {
  defaultStudioVisualLayer,
  normalizeStudioMedia,
  sanitizeStudioVisualLayer,
  setStudioMediaLayer,
} from '../src/lib/social/studio/media';

describe('premium Brand Studio registry', () => {
  test('preserves every existing template type', () => {
    const existing = TEMPLATE_DEFS.map((item) => item.key).sort();
    const registered = Object.keys(STUDIO_TEMPLATE_DEFINITIONS).sort();
    expect(registered).toEqual(existing);
  });

  test('ships exactly twelve premium design directions in addition to legacy', () => {
    const premium = STUDIO_DESIGN_FAMILIES.filter((family) => family.premium);
    expect(premium).toHaveLength(12);
    expect(new Set(premium.map((family) => family.id)).size).toBe(12);
    expect(new Set(premium.map((family) => family.label)).size).toBe(12);
  });

  test('each premium family has real compatibility and visual guidance', () => {
    for (const family of STUDIO_DESIGN_FAMILIES.filter((item) => item.premium)) {
      expect(family.compatibleTemplates.length).toBeGreaterThan(0);
      expect(family.recommendedLayouts.length).toBeGreaterThan(0);
      expect(family.visualSlots.length).toBeGreaterThan(0);
    }
  });

  test('opportunity templates receive multiple premium families', () => {
    expect(getCompatibleDesignFamilies('spotlight').filter((family) => family.premium).length).toBeGreaterThanOrEqual(6);
    expect(getCompatibleDesignFamilies('hiring').filter((family) => family.premium).length).toBeGreaterThanOrEqual(4);
  });

  test('unknown family safely falls back to legacy', () => {
    expect(getStudioDesignFamily('not-a-real-family').id).toBe('legacy');
  });
});

describe('Studio visual layers', () => {
  test('creates safe role-specific defaults', () => {
    const hero = defaultStudioVisualLayer('hero', '/hero.png', 'hero-1');
    const background = defaultStudioVisualLayer('background', '/bg.jpg', 'bg-1');
    expect(hero.role).toBe('hero');
    expect(hero.fit).toBe('contain');
    expect(hero.shadow).toBeGreaterThan(0);
    expect(background.fit).toBe('cover');
    expect(background.opacity).toBeLessThan(1);
  });

  test('clamps unsafe transforms', () => {
    const layer = sanitizeStudioVisualLayer({
      url: '/hero.png',
      x: 999,
      y: -999,
      scale: 9,
      rotation: 300,
      opacity: -4,
      blur: 100,
      brightness: 9,
      contrast: -1,
      saturation: 9,
      borderRadius: 999,
      shadow: 9,
      glow: -3,
    }, 'hero');
    expect(layer).not.toBeNull();
    expect(layer?.x).toBe(125);
    expect(layer?.y).toBe(-25);
    expect(layer?.scale).toBe(2.5);
    expect(layer?.rotation).toBe(45);
    expect(layer?.opacity).toBe(0);
    expect(layer?.blur).toBe(30);
    expect(layer?.brightness).toBe(1.8);
    expect(layer?.contrast).toBe(0.4);
    expect(layer?.saturation).toBe(2);
    expect(layer?.borderRadius).toBe(240);
    expect(layer?.shadow).toBe(1);
    expect(layer?.glow).toBe(0);
  });

  test('upgrades a legacy visual URL into a background layer', () => {
    const media = normalizeStudioMedia(null, '/legacy.jpg');
    expect(media.background?.url).toBe('/legacy.jpg');
    expect(media.background?.role).toBe('background');
  });

  test('adds and removes independent visual roles', () => {
    const hero = defaultStudioVisualLayer('hero', '/hero.png');
    const withHero = setStudioMediaLayer({}, 'hero', hero);
    expect(withHero.hero?.url).toBe('/hero.png');
    const withoutHero = setStudioMediaLayer(withHero, 'hero', null);
    expect(withoutHero.hero).toBeUndefined();
  });
});
