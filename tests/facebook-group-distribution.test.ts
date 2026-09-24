import { describe, expect, test } from 'bun:test';
import {
  extractGroupMatchMetadata,
  facebookGroupRuleApplies,
} from '../src/lib/facebook-group-matching';

describe('Facebook Group Distribution matching', () => {
  test('extracts opportunity category, country and caption languages from queue snapshot', () => {
    const meta = extractGroupMatchMetadata({
      templateType: 'spotlight',
      contentRef: 'erasmus-mundus',
      contentJson: {
        posterData: {
          country: 'International',
          category: { name: 'Scholarship' },
        },
      },
      captionJson: { fa: '...', ps: '...', en: '...' },
    });

    expect(meta.kind).toBe('opportunity');
    expect(meta.category).toBe('scholarship');
    expect(meta.country).toBe('international');
    expect(meta.langs.sort()).toEqual(['en', 'fa', 'ps']);
  });

  test('applies an explicit category/language/region rule only when all configured filters match', () => {
    const meta = {
      kind: 'opportunity',
      category: 'scholarship',
      country: 'afghanistan',
      langs: ['fa', 'ps', 'en'],
    };

    expect(facebookGroupRuleApplies({
      contentKinds: ['opportunity'],
      contentCategories: ['Scholarship'],
      languages: ['fa'],
      regions: ['Afghanistan'],
    }, meta)).toBe(true);

    expect(facebookGroupRuleApplies({
      contentKinds: ['opportunity'],
      contentCategories: ['Jobs'],
      languages: ['fa'],
      regions: ['Afghanistan'],
    }, meta)).toBe(false);
  });

  test('does not silently broaden a rule with a mismatched language', () => {
    const meta = {
      kind: 'opportunity',
      category: 'scholarship',
      country: 'international',
      langs: ['en'],
    };

    expect(facebookGroupRuleApplies({
      contentKinds: [],
      contentCategories: ['Scholarship'],
      languages: ['fa'],
      regions: [],
    }, meta)).toBe(false);
  });
});
