import { describe, expect, test } from 'bun:test';
import {
  isNearMatch,
  isRecommendation,
  rankOpportunity,
  rankOpportunities,
  type MatcherOpportunity,
  type MatcherProfile,
} from '../src/lib/opportunity-matcher';

function opportunity(overrides: Partial<MatcherOpportunity> = {}): MatcherOpportunity {
  return {
    id: 'opp-1',
    slug: 'test-opportunity',
    title: 'Global Scholarship for Masters Students',
    organization: 'Test Foundation',
    country: 'Germany',
    deadline: new Date('2026-10-30T00:00:00.000Z'),
    jobType: 'scholarship',
    educationReq: "Applicants must have at least a Bachelor's degree.",
    experience: null,
    eligibility: 'Open to international applicants.',
    requirements: 'Academic documents required.',
    sourceName: 'Official source',
    lastChecked: new Date('2026-09-26T00:00:00.000Z'),
    extractedData: { nationality: 'All nationalities' },
    category: { slug: 'scholarships', name: 'Scholarships' },
    ...overrides,
  };
}

function profile(overrides: Partial<MatcherProfile> = {}): MatcherProfile {
  return {
    intent: 'scholarship',
    education: 'bachelors',
    nationality: 'AF',
    residence: 'PK',
    targetCountry: 'DE',
    experienceYears: null,
    ...overrides,
  };
}

describe('opportunity matcher ranking', () => {
  test('canonical values make language-independent matching possible', () => {
    const result = rankOpportunity(opportunity(), profile(), new Date('2026-09-27T00:00:00.000Z'));
    expect(result.score).toBeGreaterThanOrEqual(76);
    expect(result.strength).toBe('strong');
    expect(result.eligibilityStatus).not.toBe('potential_conflict');
    expect(isRecommendation(result)).toBe(true);
  });

  test('does not double count scholarship title/category tokens', () => {
    const categoryOnly = opportunity({ title: 'Academic Funding 2027', jobType: null });
    const keywordHeavy = opportunity({ title: 'Scholarship Scholar Scholarship', jobType: 'scholarship' });
    const a = rankOpportunity(categoryOnly, profile(), new Date('2026-09-27T00:00:00.000Z'));
    const b = rankOpportunity(keywordHeavy, profile(), new Date('2026-09-27T00:00:00.000Z'));
    expect(b.score).toBe(a.score);
  });

  test('explicit education contradiction produces a conflict instead of fake confidence', () => {
    const result = rankOpportunity(
      opportunity({ educationReq: 'Applicants must have at least a Master\'s degree.' }),
      profile({ education: 'bachelors' }),
      new Date('2026-09-27T00:00:00.000Z')
    );
    expect(result.eligibilityStatus).toBe('potential_conflict');
    expect(isRecommendation(result)).toBe(false);
  });

  test('unknown eligibility data remains unknown rather than becoming a rejection', () => {
    const result = rankOpportunity(
      opportunity({ educationReq: null, extractedData: null, experience: null }),
      profile(),
      new Date('2026-09-27T00:00:00.000Z')
    );
    expect(result.eligibilityStatus).toBe('incomplete');
    expect(result.check.length).toBeGreaterThan(0);
  });

  test('nationality restriction can produce a conflict when structured data is explicit', () => {
    const result = rankOpportunity(
      opportunity({ extractedData: { nationality: 'Citizens of Germany only' } }),
      profile({ nationality: 'AF' }),
      new Date('2026-09-27T00:00:00.000Z')
    );
    expect(result.eligibilityStatus).toBe('potential_conflict');
    expect(result.check.some((item) => item.toLowerCase().includes('nationality'))).toBe(true);
  });

  test('experience requirement is checked only when both sides are known', () => {
    const row = opportunity({ experience: 'Minimum 3 years of relevant experience required.' });
    const conflict = rankOpportunity(row, profile({ experienceYears: 1 }), new Date('2026-09-27T00:00:00.000Z'));
    const pass = rankOpportunity(row, profile({ experienceYears: 4 }), new Date('2026-09-27T00:00:00.000Z'));
    const unknown = rankOpportunity(row, profile({ experienceYears: null }), new Date('2026-09-27T00:00:00.000Z'));

    expect(conflict.eligibilityStatus).toBe('potential_conflict');
    expect(pass.verified.some((item) => item.toLowerCase().includes('experience'))).toBe(true);
    expect(unknown.eligibilityStatus).not.toBe('potential_conflict');
  });

  test('same-day deadline is still treated as open by ranking', () => {
    const result = rankOpportunity(
      opportunity({ deadline: new Date('2026-09-27T00:00:00.000Z') }),
      profile(),
      new Date('2026-09-27T15:00:00.000Z')
    );
    expect(result.check.some((item) => item.includes('very close'))).toBe(true);
  });

  test('intent mismatch cannot become a strong recommendation from country alone', () => {
    const result = rankOpportunity(
      opportunity({
        title: 'Software Engineer',
        jobType: 'job',
        category: { slug: 'jobs', name: 'Jobs' },
        educationReq: null,
        extractedData: null,
      }),
      profile({ intent: 'scholarship' }),
      new Date('2026-09-27T00:00:00.000Z')
    );
    expect(result.strength).toBe('possible');
    expect(isRecommendation(result)).toBe(false);
  });

  test('ranking places non-conflicting recommendations above conflicts', () => {
    const safe = opportunity({ id: 'safe', slug: 'safe' });
    const conflict = opportunity({
      id: 'conflict',
      slug: 'conflict',
      extractedData: { nationality: 'Citizens of Germany only' },
    });
    const ranked = rankOpportunities([conflict, safe], profile(), new Date('2026-09-27T00:00:00.000Z'));
    expect(ranked[0].row.id).toBe('safe');
    expect(ranked[1].eligibilityStatus).toBe('potential_conflict');
  });

  test('near-match threshold is distinct from recommendation threshold', () => {
    const result = rankOpportunity(
      opportunity({ title: 'Academic Program', jobType: null, category: { slug: null, name: 'Other' } }),
      profile({ targetCountry: 'DE' }),
      new Date('2026-09-27T00:00:00.000Z')
    );
    expect(isNearMatch(result)).toBe(result.score >= 40);
    if (result.score < 56) expect(isRecommendation(result)).toBe(false);
  });
});
