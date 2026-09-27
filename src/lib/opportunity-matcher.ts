export const MATCHER_INTENTS = [
  'scholarship',
  'fellowship',
  'internship',
  'job',
  'training',
  'conference',
  'competition',
  'exchange',
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

export interface MatcherProfile {
  intent: MatcherIntent;
  education: EducationLevel;
  nationality?: string | null;
  residence?: string | null;
  targetCountry: string;
  experienceYears?: number | null;
}

export interface MatcherOpportunity {
  id: string;
  slug: string;
  title: string;
  organization: string | null;
  country: string | null;
  deadline: Date | null;
  jobType: string | null;
  educationReq: string | null;
  experience: string | null;
  eligibility: string | null;
  requirements: string | null;
  sourceName: string | null;
  lastChecked: Date | null;
  extractedData: unknown;
  category: {
    slug: string | null;
    name: string | null;
  } | null;
}

export interface RankedOpportunity {
  row: MatcherOpportunity;
  score: number;
  strength: MatchStrength;
  eligibilityStatus: EligibilityStatus;
  dataConfidence: DataConfidence;
  reasons: string[];
  verified: string[];
  check: string[];
}

const INTENT_CONFIG: Record<MatcherIntent, { slugs: string[]; tokens: string[] }> = {
  scholarship: { slugs: ['scholarships'], tokens: ['scholarship', 'scholar'] },
  fellowship: { slugs: ['fellowships'], tokens: ['fellowship', 'fellow'] },
  internship: { slugs: ['internships'], tokens: ['internship', 'intern'] },
  job: { slugs: ['jobs'], tokens: ['job', 'vacancy', 'employment', 'career'] },
  training: { slugs: ['training'], tokens: ['training', 'course', 'workshop'] },
  conference: { slugs: ['conferences'], tokens: ['conference', 'summit', 'forum'] },
  competition: { slugs: ['competitions'], tokens: ['competition', 'contest', 'challenge', 'hackathon'] },
  exchange: { slugs: ['exchange-programs'], tokens: ['exchange', 'exchange program'] },
  volunteer: { slugs: ['volunteer'], tokens: ['volunteer', 'volunteering'] },
};

export function intentConfig(intent: MatcherIntent) {
  return INTENT_CONFIG[intent];
}

const COUNTRY_ALIASES: Record<string, string[]> = {
  AF: ['afghanistan', 'afghan'],
  PK: ['pakistan', 'pakistani'],
  IR: ['iran', 'iranian'],
  TR: ['turkiye', 'türkiye', 'turkey', 'turkish'],
  AE: ['united arab emirates', 'uae', 'emirates'],
  QA: ['qatar', 'qatari'],
  IN: ['india', 'indian'],
  DE: ['germany', 'german'],
  CA: ['canada', 'canadian'],
  US: ['united states', 'united states of america', 'usa', 'u.s.', 'american'],
  GB: ['united kingdom', 'uk', 'u.k.', 'britain', 'british', 'england'],
  AU: ['australia', 'australian'],
  FR: ['france', 'french'],
  NL: ['netherlands', 'dutch'],
  SE: ['sweden', 'swedish'],
  IT: ['italy', 'italian'],
  ES: ['spain', 'spanish'],
  JP: ['japan', 'japanese'],
  KR: ['south korea', 'korea', 'korean'],
  CN: ['china', 'chinese'],
  SA: ['saudi arabia', 'saudi'],
  MY: ['malaysia', 'malaysian'],
  ID: ['indonesia', 'indonesian'],
  SG: ['singapore', 'singaporean'],
  NZ: ['new zealand'],
  CH: ['switzerland', 'swiss'],
  AT: ['austria', 'austrian'],
  BE: ['belgium', 'belgian'],
  DK: ['denmark', 'danish'],
  NO: ['norway', 'norwegian'],
  FI: ['finland', 'finnish'],
  IE: ['ireland', 'irish'],
  PT: ['portugal', 'portuguese'],
  PL: ['poland', 'polish'],
  CZ: ['czechia', 'czech republic', 'czech'],
  HU: ['hungary', 'hungarian'],
  RO: ['romania', 'romanian'],
  GR: ['greece', 'greek'],
  RU: ['russia', 'russian'],
  KZ: ['kazakhstan', 'kazakh'],
  UZ: ['uzbekistan', 'uzbek'],
  TJ: ['tajikistan', 'tajik'],
  KG: ['kyrgyzstan', 'kyrgyz'],
  AZ: ['azerbaijan', 'azerbaijani'],
  GE: ['georgia', 'georgian'],
  EG: ['egypt', 'egyptian'],
  JO: ['jordan', 'jordanian'],
  LB: ['lebanon', 'lebanese'],
  IQ: ['iraq', 'iraqi'],
  BD: ['bangladesh', 'bangladeshi'],
  NP: ['nepal', 'nepali'],
  LK: ['sri lanka', 'sri lankan'],
};

const GLOBAL_TOKENS = [
  'global',
  'worldwide',
  'international',
  'multiple countries',
  'various countries',
  'remote',
  'online',
];

function clean(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function countryAliases(code: string): string[] {
  const normalized = code.toUpperCase();
  return COUNTRY_ALIASES[normalized] ?? [normalized.toLowerCase()];
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(clean(needle)));
}

function getExtractedStrings(extractedData: unknown): Record<string, string> {
  if (!extractedData || typeof extractedData !== 'object' || Array.isArray(extractedData)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(extractedData as Record<string, unknown>)) {
    if (typeof value === 'string') out[clean(key)] = clean(value);
    else if (Array.isArray(value)) {
      const strings = value.filter((v): v is string => typeof v === 'string');
      if (strings.length) out[clean(key)] = clean(strings.join(', '));
    }
  }
  return out;
}

function educationRank(level: EducationLevel): number | null {
  if (level === 'high_school') return 0;
  if (level === 'bachelors') return 1;
  if (level === 'masters') return 2;
  if (level === 'phd') return 3;
  return null;
}

function explicitMinimumEducation(text: string): EducationLevel | null {
  if (!text) return null;
  const t = clean(text);
  const explicit = /(required|requirement|minimum|at least|must have|must hold|should have|hold a|possess a)/;
  if (!explicit.test(t)) return null;

  if (/ph\.?d|doctorate|doctoral degree/.test(t)) return 'phd';
  if (/master'?s degree|master degree|postgraduate degree/.test(t)) return 'masters';
  if (/bachelor'?s degree|bachelor degree|undergraduate degree/.test(t)) return 'bachelors';
  if (/high school|secondary school|grade 12/.test(t)) return 'high_school';
  return null;
}

function parseExperienceYears(text: string): number | null {
  const t = clean(text);
  if (!t) return null;
  const match = t.match(/(?:minimum|at least|requires?|required)?\s*(\d{1,2})\+?\s*(?:years?|yrs?)\b/);
  if (!match) return null;
  const years = Number(match[1]);
  return Number.isFinite(years) && years >= 0 && years <= 40 ? years : null;
}

function classifyIntent(row: MatcherOpportunity, intent: MatcherIntent): { matched: boolean; evidence: string | null } {
  const cfg = INTENT_CONFIG[intent];
  const slug = clean(row.category?.slug);
  if (slug && cfg.slugs.includes(slug)) {
    return { matched: true, evidence: 'Canonical opportunity category matches your selected type.' };
  }

  const jobType = clean(row.jobType);
  if (jobType && containsAny(jobType, cfg.tokens)) {
    return { matched: true, evidence: 'Opportunity type matches your selected type.' };
  }

  const title = clean(row.title);
  if (containsAny(title, cfg.tokens)) {
    return { matched: true, evidence: 'Opportunity title strongly matches your selected type.' };
  }

  return { matched: false, evidence: null };
}

function geographyScore(row: MatcherOpportunity, targetCountry: string): { score: number; reason: string } {
  if (targetCountry === 'ANY') {
    return { score: 16, reason: 'You selected any destination.' };
  }

  const country = clean(row.country);
  if (!country) return { score: 4, reason: 'Location is not fully structured; verify destination details.' };

  if (containsAny(country, countryAliases(targetCountry))) {
    return { score: 20, reason: 'Destination matches your preference.' };
  }

  if (containsAny(country, GLOBAL_TOKENS)) {
    return { score: 14, reason: 'Opportunity appears global, international, online, or remote.' };
  }

  return { score: 0, reason: 'Destination differs from your preference.' };
}

function assessNationality(row: MatcherOpportunity, nationality?: string | null): {
  status: 'pass' | 'unknown' | 'conflict';
  message?: string;
} {
  if (!nationality) return { status: 'unknown' };

  const data = getExtractedStrings(row.extractedData);
  const nationalityText =
    data.nationality ||
    data.nationalities ||
    data['eligible nationalities'] ||
    data['eligible nationality'] ||
    data.citizenship ||
    '';

  if (!nationalityText) return { status: 'unknown' };
  if (/all nationalit|any nationalit|open to all|international applicants/.test(nationalityText)) {
    return { status: 'pass', message: 'Structured data indicates broad/international nationality eligibility.' };
  }

  if (containsAny(nationalityText, countryAliases(nationality))) {
    return { status: 'pass', message: 'Structured nationality information includes your nationality.' };
  }

  if (/(only|exclusively|citizens? of|nationals? of|eligible countries)/.test(nationalityText)) {
    return { status: 'conflict', message: 'Structured nationality information may exclude your nationality.' };
  }

  return { status: 'unknown', message: 'Nationality information exists but needs manual verification.' };
}

function assessEducation(row: MatcherOpportunity, education: EducationLevel): {
  status: 'pass' | 'unknown' | 'conflict';
  message?: string;
} {
  const explicit = explicitMinimumEducation(row.educationReq || '');
  if (!explicit) return { status: 'unknown' };

  const userRank = educationRank(education);
  const requiredRank = educationRank(explicit);
  if (userRank === null || requiredRank === null) return { status: 'unknown' };

  if (userRank >= requiredRank) {
    return { status: 'pass', message: 'Your education level meets the explicitly stated minimum education requirement.' };
  }

  return {
    status: 'conflict',
    message: 'Your selected education level appears below an explicitly stated minimum requirement.',
  };
}

function assessExperience(row: MatcherOpportunity, experienceYears?: number | null): {
  status: 'pass' | 'unknown' | 'conflict';
  message?: string;
} {
  const required = parseExperienceYears(row.experience || '');
  if (required === null || experienceYears === null || experienceYears === undefined) return { status: 'unknown' };
  if (experienceYears >= required) {
    return { status: 'pass', message: 'Your experience meets the stated minimum experience requirement.' };
  }
  return {
    status: 'conflict',
    message: `This opportunity appears to require at least ${required} years of experience.`,
  };
}

function confidenceFor(row: MatcherOpportunity): DataConfidence {
  const fields = [
    row.category?.slug,
    row.jobType,
    row.country,
    row.deadline,
    row.educationReq,
    row.eligibility,
    row.experience,
    row.requirements,
    row.sourceName,
    row.lastChecked,
  ];
  const populated = fields.filter(Boolean).length;
  if (populated >= 7) return 'high';
  if (populated >= 4) return 'medium';
  return 'low';
}

export function rankOpportunity(row: MatcherOpportunity, profile: MatcherProfile, today = new Date()): RankedOpportunity {
  let score = 0;
  const reasons: string[] = [];
  const verified: string[] = [];
  const check: string[] = [];

  const intent = classifyIntent(row, profile.intent);
  if (intent.matched) {
    score += 48;
    if (intent.evidence) reasons.push(intent.evidence);
  }

  const geo = geographyScore(row, profile.targetCountry);
  score += geo.score;
  if (geo.score >= 14) reasons.push(geo.reason);
  else check.push(geo.reason);

  const education = assessEducation(row, profile.education);
  const nationality = assessNationality(row, profile.nationality);
  const experience = assessExperience(row, profile.experienceYears);

  const assessments = [education, nationality, experience];
  for (const assessment of assessments) {
    if (assessment.status === 'pass' && assessment.message) {
      score += 8;
      verified.push(assessment.message);
    } else if (assessment.status === 'conflict' && assessment.message) {
      score -= 30;
      check.push(assessment.message);
    } else if (assessment.message) {
      check.push(assessment.message);
    }
  }

  if (row.deadline) {
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const deadlineUtc = Date.UTC(row.deadline.getUTCFullYear(), row.deadline.getUTCMonth(), row.deadline.getUTCDate());
    const days = Math.floor((deadlineUtc - todayUtc) / 86_400_000);
    if (days >= 14) score += 6;
    else if (days >= 3) score += 3;
    else if (days >= 0) check.push('Deadline is very close; review application requirements immediately.');
  } else {
    check.push('No structured deadline is available; confirm the current closing date.');
  }

  const confidence = confidenceFor(row);
  if (confidence === 'high') score += 8;
  else if (confidence === 'medium') score += 4;
  else check.push('ARIA HUB has limited structured eligibility data for this listing.');

  const hasConflict = assessments.some((a) => a.status === 'conflict');
  const knownPasses = assessments.filter((a) => a.status === 'pass').length;
  const unknowns = assessments.filter((a) => a.status === 'unknown').length;

  let eligibilityStatus: EligibilityStatus;
  if (hasConflict) eligibilityStatus = 'potential_conflict';
  else if (knownPasses >= 2) eligibilityStatus = 'likely_eligible';
  else if (unknowns >= 2) eligibilityStatus = 'incomplete';
  else eligibilityStatus = 'needs_check';

  score = Math.max(0, Math.min(100, score));
  const strength: MatchStrength = score >= 76 ? 'strong' : score >= 56 ? 'good' : 'possible';

  return {
    row,
    score,
    strength,
    eligibilityStatus,
    dataConfidence: confidence,
    reasons: reasons.slice(0, 4),
    verified: verified.slice(0, 4),
    check: check.slice(0, 4),
  };
}

export function rankOpportunities(rows: MatcherOpportunity[], profile: MatcherProfile, today = new Date()) {
  return rows
    .map((row) => rankOpportunity(row, profile, today))
    .sort((a, b) => {
      const conflictDelta = Number(a.eligibilityStatus === 'potential_conflict') - Number(b.eligibilityStatus === 'potential_conflict');
      if (conflictDelta !== 0) return conflictDelta;
      return b.score - a.score;
    });
}

export function isRecommendation(candidate: RankedOpportunity): boolean {
  return candidate.score >= 56 && candidate.eligibilityStatus !== 'potential_conflict';
}

export function isNearMatch(candidate: RankedOpportunity): boolean {
  return candidate.score >= 40;
}
