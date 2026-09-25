import { describe, expect, test } from 'bun:test';
import {
  DESIGN_FAMILIES,
  defaultDesignFamilyForTemplate,
  designFamiliesForTemplate,
  resolveDesignFamily,
} from '../src/lib/social/studio/registry';

describe('Brand Studio premium design registry', () => {
  test('contains twelve premium directions plus legacy compatibility', () => {
    expect(DESIGN_FAMILIES.length).toBe(13);
    expect(DESIGN_FAMILIES.filter((x) => x.id !== 'legacy').length).toBe(12);
  });

  test('recommends opportunity and career families deterministically', () => {
    expect(defaultDesignFamilyForTemplate('spotlight')).toBe('global-portal');
    expect(defaultDesignFamilyForTemplate('hiring')).toBe('career-desk');
    expect(defaultDesignFamilyForTemplate('news')).toBe('editorial-break');
  });

  test('does not offer incompatible design directions', () => {
    const quote = designFamiliesForTemplate('quote').map((x) => x.id);
    expect(quote).toContain('legacy');
    expect(quote).toContain('big-type-story');
    expect(quote).not.toContain('career-desk');
  });

  test('unknown family ids fall back safely', () => {
    expect(resolveDesignFamily('not-a-family')).toBe('legacy');
  });
});
