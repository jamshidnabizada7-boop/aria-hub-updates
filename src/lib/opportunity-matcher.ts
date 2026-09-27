import { z } from 'zod';

export const MATCHER_INTENTS = [
  'scholarship',
  'fellowship',
  'internship',
  'job',
  'training',
  'conference',
  'competition',
  'exchange_program',
  'volunteer',
] as const;

export const EDUCATION_LEVELS = [
  'high_school',
  'bachelors',
  'masters',
  'phd',
  'other',
] as const;

export type MatcherIntent = (typeof MATCHER_INTENTS)[number];
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export type MatchStrength = 'strong' | 'good' | 'possible';
export type EligibilityStatus = 'likely_eligible' | 'needs_check' | 'potential_conflict' | 'incomplete';
export type DataConfidence = 'high' | 'medium' | 'low';

export const MatcherProfileSchema = z.object({
  intents: z.array(z.enum(MATCHER_INTENTS)).min(1).max(3),
  education: z.enum(EDUCATION_LEVELS),
  nationality: z.string().trim().min(2).max(80),
  residence: z.string().trim().min(2).max(80),
  destinations: z.array(z.string().trim().min(2).max(80)).min(1).max(8),
  field: z.string().trim().max(80).optional().default(''),
  experienceYears: z.number().int().min(0).max(50).optional(),
  lang: z.enum(['fa', 'ps', 'en']).default('en'),
});

export type MatcherProfile = z.infer<typeof MatcherProfileSchema>;

export interface MatcherOpportunity {
  id: string;
  slug: string;
  title: string;
  organization: string | null;
  country: string | null;
  deadline: Date | null;
  categorySlug: string | null;
  categoryName: string | null;
  jobType: string | null;
  educationReq: string | null;
  experience: string | null;
  eligibility: string | null;
  requirements: string | null;
  benefits: string | null;
  tags: unknown;
  extractedData: unknown;
  sourceName: string | null;
  lastChecked: Date | null;
  updatedAt: Date;
}

export interface MatcherEvidence {
  reasons: string[];
  unknowns: string[];
  conflicts: string[];
  verified: string[];
}

export interface RankedOpportunity {
  opportunity: MatcherOpportunity;
  rankScore: number;
  matchStrength: MatchStrength;
  eligibilityStatus: EligibilityStatus;
  dataConfidence: DataConfidence;
  evidence: MatcherEvidence;
}

const INTENT_SLUGS: Record<MatcherIntent, string[]> = {
  scholarship: ['scholarships', 'scholarship'],
  fellowship: ['fellowships', 'fellowship'],
  internship: ['internships', 'internship'],
  job: ['jobs', 'job'],
  training: ['training', 'trainings'],
  conference: ['conferences', 'conference'],
  competition: ['competitions', 'competition'],
  exchange_program: ['exchange-programs', 'exchange', 'exchange-program'],
  volunteer: ['volunteer', 'volunteering'],
};

const INTENT_TERMS: Record<MatcherIntent, string[]> = {
  scholarship: ['scholarship', 'scholarships'],
  fellowship: ['fellowship', 'fellowships'],
  internship: ['internship', 'intern'],
  job: ['job', 'vacancy', 'position', 'career'],
  training: ['training', 'course', 'bootcamp'],
  conference: ['conference', 'summit', 'forum'],
  competition: ['competition', 'contest', 'challenge', 'hackathon'],
  exchange_program: ['exchange', 'exchange program'],
  volunteer: ['volunteer', 'volunteering'],
};

const EDUCATION_TERMS: Record<EducationLevel, string[]> = {
  high_school: ['high school', 'secondary school', 'grade 12', '12th grade', 'school graduate'],
  bachelors: ['bachelor', 'undergraduate', 'bsc', 'bs ', 'ba '],
  masters: ['master', 'postgraduate', 'msc', 'ms ', 'ma '],
  phd: ['phd', 'doctoral', 'doctorate'],
  other: [],
};

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[_–—\\/-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function flattenJson(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(flattenJson).join(' ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${key} ${flattenJson(val)}`)
      .join(' ');
  }
  return '';
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function categoryMatches(profile: MatcherProfile, opportunity: MatcherOpportunity): boolean {
  const slug = normalize(opportunity.categorySlug);
  const haystack = normalize(`${opportunity.categoryName ?? ''} ${opportunity.jobType ?? ''} ${opportunity.title}`);
  return profile.intents.some((intent) => {
    if (INTENT_SLUGS[intent].some((candidate) => slug === candidate)) return true;
    return includesAny(haystack, INTENT_TERMS[intent]);
  });
}

function countryMatches(profile: MatcherProfile, opportunity: MatcherOpportunity): boolean {
  if (profile.destinations.some((d) => normalize(d) === 'anywhere')) return true;
  const country = normalize(opportunity.country);
  if (!country) return false;
  return profile.destinations.some((destination) => {
    const d = normalize(destination);
    return d === country || country.includes(d) || d.includes(country);
  });
}

function extractNationalityRule(extractedData: unknown, eligibilityText: string): string {
  const extracted = normalize(flattenJson(extractedData));
  const text = `${extracted} ${normalize(eligibilityText)}`;
  const markers = ['nationality', 'citizen', 'citizenship', 'eligible countries', 'eligible nationalities'];
  if (!markers.some((marker) => text.includes(marker))) return '';
  return text;
}

function educationEvidence(profile: MatcherProfile, text: string): 'match' | 'unknown' {
  const terms = EDUCATION_TERMS[profile.education];
  if (terms.length === 0) return 'unknown';
  return includesAny(text, terms) ? 'match' : 'unknown';
}

function confidenceFor(opportunity: MatcherOpportunity): DataConfidence {
  let points = 0;
  if (opportunity.eligibility?.trim()) points += 2;
  if (opportunity.educationReq?.trim()) points += 2;
  if (opportunity.requirements?.trim()) points += 1;
  if (opportunity.experience?.trim()) points += 1;
  if (opportunity.extractedData && flattenJson(opportunity.extractedData).trim()) points += 2;
  if (opportunity.sourceName?.trim()) points += 1;
  if (opportunity.lastChecked) points += 1;
  if (points >= 7) return 'high';
  if (points >= 4) return 'medium';
  return 'low';
}

export function categorySlugsForIntents(intents: readonly MatcherIntent[]): string[] {
  return Array.from(new Set(intents.flatMap((intent) => INTENT_SLUGS[intent])));
}

export function rankOpportunity(profile: MatcherProfile, opportunity: MatcherOpportunity): RankedOpportunity | null {
  const reasons: string[] = [];
  const verified: string[] = [];
  const unknowns: string[] = [];
  const conflicts: string[] = [];
  let score = 0;

  if (!categoryMatches(profile, opportunity)) return null;
  score += 50;
  reasons.push('opportunity_type');

  const destinationMatch = countryMatches(profile, opportunity);
  if (destinationMatch) {
    score += profile.destinations.some((d) => normalize(d) === 'anywhere') ? 5 : 20;
    reasons.push('destination');
  } else if (opportunity.country) {
    unknowns.push('destination');
  }

  const eligibilityText = normalize(
    `${opportunity.eligibility ?? ''} ${opportunity.requirements ?? ''} ${opportunity.educationReq ?? ''} ${flattenJson(opportunity.extractedData)}`
  );

  if (educationEvidence(profile, eligibilityText) === 'match') {
    score += 10;
    verified.push('education');
    reasons.push('education');
  } else {
    unknowns.push('education');
  }

  const field = normalize(profile.field);
  if (field) {
    const semanticText = normalize(
      `${opportunity.title} ${opportunity.jobType ?? ''} ${opportunity.requirements ?? ''} ${opportunity.eligibility ?? ''} ${flattenJson(opportunity.tags)}`
    );
    if (semanticText.includes(field)) {
      score += 12;
      reasons.push('field');
    } else {
      unknowns.push('field');
    }
  }

  const nationalityRule = extractNationalityRule(opportunity.extractedData, opportunity.eligibility ?? '');
  if (nationalityRule) {
    const nationality = normalize(profile.nationality);
    if (nationality && nationalityRule.includes(nationality)) {
      verified.push('nationality');
      score += 5;
    } else {
      unknowns.push('nationality');
    }
  } else {
    unknowns.push('nationality');
  }

  if (opportunity.deadline) {
    const days = Math.floor((opportunity.deadline.getTime() - Date.now()) / 86_400_000);
    if (days >= 7) {
      score += 3;
      reasons.push('deadline_practicality');
    }
    verified.push('open_deadline');
  } else {
    unknowns.push('deadline');
  }

  if (opportunity.lastChecked) {
    const ageDays = Math.floor((Date.now() - opportunity.lastChecked.getTime()) / 86_400_000);
    if (ageDays <= 30) score += 3;
  }

  const confidence = confidenceFor(opportunity);
  if (confidence === 'high') score += 2;

  const eligibilityStatus: EligibilityStatus =
    conflicts.length > 0
      ? 'potential_conflict'
      : verified.includes('education') && (verified.includes('nationality') || !nationalityRule)
        ? 'likely_eligible'
        : confidence === 'low'
          ? 'incomplete'
          : 'needs_check';

  const matchStrength: MatchStrength = score >= 75 ? 'strong' : score >= 58 ? 'good' : 'possible';

  // Intent match is mandatory, but a result must also have at least one
  // meaningful compatibility signal beyond type to be recommended.
  if (score < 55) return null;

  return {
    opportunity,
    rankScore: score,
    matchStrength,
    eligibilityStatus,
    dataConfidence: confidence,
    evidence: {
      reasons: Array.from(new Set(reasons)),
      unknowns: Array.from(new Set(unknowns)),
      conflicts: Array.from(new Set(conflicts)),
      verified: Array.from(new Set(verified)),
    },
  };
}

export function rankOpportunities(
  profile: MatcherProfile,
  opportunities: MatcherOpportunity[],
  limit = 6
): RankedOpportunity[] {
  return opportunities
    .map((opportunity) => rankOpportunity(profile, opportunity))
    .filter((item): item is RankedOpportunity => item !== null)
    .sort((a, b) => {
      if (a.eligibilityStatus !== b.eligibilityStatus) {
        const order: Record<EligibilityStatus, number> = {
          likely_eligible: 0,
          needs_check: 1,
          incomplete: 2,
          potential_conflict: 3,
        };
        return order[a.eligibilityStatus] - order[b.eligibilityStatus];
      }
      return b.rankScore - a.rankScore;
    })
    .slice(0, limit);
}
