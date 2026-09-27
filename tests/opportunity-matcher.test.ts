import { describe, expect, test } from 'bun:test';
import {
  MatcherProfileSchema,
  rankOpportunity,
  rankOpportunities,
  type MatcherOpportunity,
  type MatcherProfile,
} from '@/lib/opportunity-matcher';

const baseProfile: MatcherProfile = {
  intents: ['scholarship'],
  education: 'bachelors',
  targetEducation: 'masters',
  nationality: 'Afghanistan',
  residence: 'Pakistan',
  destinations: ['Germany'],
  fieldArea: 'technology',
  lang: 'en',
};

function opportunity(overrides: Partial<MatcherOpportunity> = {}): MatcherOpportunity {
  return {
    id: 'opp-1',
    slug: 'test-scholarship',
    title: 'Computer Science Masters Scholarship',
    organization: 'Example University',
    country: 'Germany',
    deadline: new Date(Date.now() + 30 * 86_400_000),
    categorySlug: 'scholarships',
    categoryName: 'Scholarships',
    jobType: 'scholarship',
    educationReq: "Bachelor's degree required for Master's study",
    experience: null,
    eligibility: 'Applicants from Afghanistan are eligible.',
    requirements: 'Bachelor degree and academic records',
    benefits: 'Fully funded',
    tags: JSON.stringify(['computer science', 'masters']),
    extractedData: { nationality: 'Afghanistan', studyLevel: 'Masters' },
    sourceName: 'Official University',
    lastChecked: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Opportunity Matcher canonical contract', () => {
  test('accepts canonical education values independently of display language', () => {
    for (const lang of ['en', 'fa', 'ps'] as const) {
      const parsed = MatcherProfileSchema.parse({ ...baseProfile, lang });
      expect(parsed.education).toBe('bachelors');
      expect(parsed.targetEducation).toBe('masters');
      expect(parsed.intents).toEqual(['scholarship']);
    }
  });

  test('rejects translated display labels as domain identifiers', () => {
    const parsed = MatcherProfileSchema.safeParse({ ...baseProfile, education: 'فوق لیسانس' });
    expect(parsed.success).toBe(false);
  });

  test('wrong opportunity type is not recommended even when country matches', () => {
    const result = rankOpportunity(
      baseProfile,
      opportunity({ categorySlug: 'jobs', categoryName: 'Jobs', jobType: 'job', title: 'Software Engineer' })
    );
    expect(result).toBeNull();
  });

  test('matching is invariant across UI languages', () => {
    const rows = [
      opportunity(),
      opportunity({ id: 'opp-2', slug: 'other-scholarship', country: 'France', title: 'General Scholarship', tags: '[]' }),
    ];

    const signatures = (['en', 'fa', 'ps'] as const).map((lang) =>
      rankOpportunities({ ...baseProfile, lang }, rows).map((item) => ({
        id: item.opportunity.id,
        rankScore: item.rankScore,
        matchStrength: item.matchStrength,
        eligibilityStatus: item.eligibilityStatus,
      }))
    );

    expect(signatures[0]).toEqual(signatures[1]);
    expect(signatures[1]).toEqual(signatures[2]);
  });

  test('returns honest no-match when only type matches without compatibility evidence', () => {
    const weak = opportunity({
      country: 'Japan',
      educationReq: null,
      eligibility: null,
      requirements: null,
      extractedData: null,
      tags: null,
      sourceName: null,
      lastChecked: null,
      title: 'Scholarship announcement',
    });
    expect(rankOpportunities(baseProfile, [weak])).toHaveLength(0);
  });

  test('never emits acceptance probability fields', () => {
    const result = rankOpportunity(baseProfile, opportunity());
    expect(result).not.toBeNull();
    const json = JSON.stringify(result);
    expect(json).not.toContain('chanceOfAcceptance');
    expect(json).not.toContain('"match":');
  });

  test('explicit structured nationality restriction produces a potential conflict', () => {
    const result = rankOpportunity(
      baseProfile,
      opportunity({
        extractedData: { eligibleNationalities: ['Pakistan', 'India'] },
        eligibility: 'Only listed nationalities are eligible.',
      })
    );
    expect(result).not.toBeNull();
    expect(result?.eligibilityStatus).toBe('potential_conflict');
    expect(result?.evidence.conflicts).toContain('nationality');
  });

  test('normalized nationality facts take precedence and detect conflict', () => {
    const result = rankOpportunity(
      baseProfile,
      opportunity({
        eligibility: null,
        extractedData: null,
        structuredFacts: {
          eligibleNationalities: ['Pakistan', 'India'],
          educationLevels: ['masters'],
          fieldAreas: ['technology'],
          reviewed: true,
        },
      })
    );
    expect(result).not.toBeNull();
    expect(result?.eligibilityStatus).toBe('potential_conflict');
    expect(result?.evidence.conflicts).toContain('nationality');
  });

  test('normalized education and field facts are used as evidence', () => {
    const result = rankOpportunity(
      baseProfile,
      opportunity({
        title: 'International Scholarship Programme',
        educationReq: null,
        requirements: null,
        tags: null,
        structuredFacts: {
          eligibleNationalities: ['Afghanistan'],
          educationLevels: ['masters'],
          fieldAreas: ['technology'],
          reviewed: true,
        },
      })
    );
    expect(result).not.toBeNull();
    expect(result?.evidence.verified).not.toContain('education');
    expect(result?.evidence.verified).toContain('nationality');
    expect(result?.evidence.reasons).toContain('target_level');
    expect(result?.evidence.reasons).toContain('field');
  });

  test('common geography aliases match canonically', () => {
    const result = rankOpportunity(
      { ...baseProfile, destinations: ['Türkiye'] },
      opportunity({ country: 'Turkey' })
    );
    expect(result).not.toBeNull();
    expect(result?.evidence.reasons).toContain('destination');
  });

  test('any selected destination may satisfy a multi-destination profile', () => {
    const result = rankOpportunity(
      { ...baseProfile, destinations: ['France', 'Germany'] },
      opportunity({ country: 'Germany' })
    );
    expect(result).not.toBeNull();
    expect(result?.evidence.reasons).toContain('destination');
  });

  test('known minimum experience can produce an explicit conflict', () => {
    const result = rankOpportunity(
      { ...baseProfile, experienceYears: 1 },
      opportunity({
        structuredFacts: {
          eligibleNationalities: ['Afghanistan'],
          educationLevels: ['masters'],
          fieldAreas: ['technology'],
          minExperienceYears: 3,
          reviewed: true,
        },
      })
    );
    expect(result).not.toBeNull();
    expect(result?.eligibilityStatus).toBe('potential_conflict');
    expect(result?.evidence.conflicts).toContain('experience');
  });

  test('same-day active opportunity is not rejected by ranking', () => {
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    const result = rankOpportunity(baseProfile, opportunity({ deadline: today }));
    expect(result).not.toBeNull();
  });
});
