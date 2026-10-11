import { describe, expect, test } from 'bun:test';
import {
  DESIGN_FAMILIES,
  defaultDesignFamilyForTemplate,
  designFamiliesForTemplate,
  resolveDesignFamily,
} from '../src/lib/social/studio/registry';

describe('Brand Studio premium design registry', () => {
  test('preserves legacy and includes nine editorial directions', () => {
    expect(DESIGN_FAMILIES.length).toBe(22);
    expect(DESIGN_FAMILIES.filter((x) => x.id !== 'legacy').length).toBe(21);
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
