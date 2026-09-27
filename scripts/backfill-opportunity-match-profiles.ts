/**
 * Backfill normalized OpportunityMatchProfile rows from explicit existing
 * extractedData keys. DRY RUN by default; pass --write to persist.
 *
 * This intentionally does not ask an LLM to guess eligibility. A value is
 * promoted only when an existing structured key clearly identifies it.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const WRITE = process.argv.includes('--write');

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return asStringArray(parsed);
    } catch {}
    return trimmed.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function asInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== 'string') return null;
  const match = value.match(/\d{1,3}/);
  return match ? Number(match[0]) : null;
}

interface FoundValue {
  value: unknown;
  key: string;
}

function findExplicit(data: unknown, keyMatchers: RegExp[]): FoundValue | null {
  if (!data || typeof data !== 'object') return null;
  const queue: Array<{ value: unknown; path: string }> = [{ value: data, path: 'extractedData' }];

  while (queue.length) {
    const current = queue.shift()!;
    if (!current.value || typeof current.value !== 'object' || Array.isArray(current.value)) continue;
    for (const [key, value] of Object.entries(current.value as Record<string, unknown>)) {
      const normalized = normalizeKey(key);
      const path = `${current.path}.${key}`;
      if (keyMatchers.some((matcher) => matcher.test(normalized))) {
        return { value, key: path };
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        queue.push({ value, path });
      }
    }
  }
  return null;
}

const EDUCATION_MAP: Array<[RegExp, string]> = [
  [/high\s*school|secondary|grade\s*12/i, 'high_school'],
  [/bachelor|undergraduate|\bbs\b|\bbsc\b/i, 'bachelors'],
  [/master|postgraduate|\bms\b|\bmsc\b/i, 'masters'],
  [/phd|doctoral|doctorate/i, 'phd'],
];

const FIELD_MAP: Array<[RegExp, string]> = [
  [/computer|software|technology|information technology|data|cyber|artificial intelligence|\bai\b/i, 'technology'],
  [/engineering|mechanical|electrical|civil|chemical/i, 'engineering'],
  [/business|management|finance|economics|accounting|marketing|entrepreneur/i, 'business'],
  [/health|medicine|medical|nursing|public health|pharmacy|clinical/i, 'health'],
  [/education|teaching|teacher|pedagogy/i, 'education'],
  [/sociology|psychology|development studies|international relations|social science/i, 'social_sciences'],
  [/\blaw\b|legal|policy|governance|public administration/i, 'law_policy'],
  [/biology|chemistry|physics|mathematics|biotech|natural science/i, 'natural_sciences'],
  [/environment|climate|agriculture|sustainability|forestry/i, 'environment_agriculture'],
  [/arts|humanities|history|literature|language|design|media|journalism/i, 'arts_humanities'],
];

function mapCanonical(values: string[], mapping: Array<[RegExp, string]>): string[] {
  const result = new Set<string>();
  for (const raw of values) {
    for (const [pattern, canonical] of mapping) {
      if (pattern.test(raw)) result.add(canonical);
    }
  }
  return [...result];
}

async function main() {
  const opportunities = await db.opportunity.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      tags: true,
      extractedData: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  let candidates = 0;
  let written = 0;

  for (const opportunity of opportunities) {
    const data = opportunity.extractedData;
    const provenance: Record<string, unknown> = {};
    const confidence: Record<string, string> = {};
    const facts: Record<string, unknown> = {};

    const nationalities = findExplicit(data, [/nationalit/, /citizenship/, /eligiblecountr/]);
    if (nationalities) {
      const values = asStringArray(nationalities.value);
      if (values.length) {
        facts.eligibleNationalities = values;
        provenance.eligibleNationalities = { source: nationalities.key };
        confidence.eligibleNationalities = 'high';
      }
    }

    const education = findExplicit(data, [/studylevel/, /targetdegree/, /programlevel/, /degreeoffered/]);
    if (education) {
      const values = mapCanonical(asStringArray(education.value), EDUCATION_MAP);
      if (values.length) {
        facts.educationLevels = values;
        provenance.educationLevels = { source: education.key };
        confidence.educationLevels = 'high';
      }
    }

    const fields = findExplicit(data, [/fieldofstudy/, /studyfield/, /discipline/, /subjectarea/]);
    if (fields) {
      const values = mapCanonical(asStringArray(fields.value), FIELD_MAP);
      if (values.length) {
        facts.fieldAreas = values;
        provenance.fieldAreas = { source: fields.key };
        confidence.fieldAreas = 'high';
      }
    }

    const experience = findExplicit(data, [/yearsofexperience/, /minimumexperience/, /minexperience/]);
    if (experience) {
      const value = asInteger(experience.value);
      if (value != null && value <= 60) {
        facts.minExperienceYears = value;
        provenance.minExperienceYears = { source: experience.key };
        confidence.minExperienceYears = 'high';
      }
    }

    const minAge = findExplicit(data, [/minimumage/, /minage/]);
    if (minAge) {
      const value = asInteger(minAge.value);
      if (value != null && value <= 100) {
        facts.minAge = value;
        provenance.minAge = { source: minAge.key };
        confidence.minAge = 'high';
      }
    }

    const maxAge = findExplicit(data, [/maximumage/, /maxage/, /agelimit/]);
    if (maxAge) {
      const value = asInteger(maxAge.value);
      if (value != null && value <= 100) {
        facts.maxAge = value;
        provenance.maxAge = { source: maxAge.key };
        confidence.maxAge = 'high';
      }
    }

    const languages = findExplicit(data, [/languagerequirement/, /requiredlanguage/, /languageofinstruction/]);
    if (languages) {
      const values = asStringArray(languages.value);
      if (values.length) {
        facts.languages = values;
        provenance.languages = { source: languages.key };
        confidence.languages = 'high';
      }
    }

    const funding = findExplicit(data, [/fundingtype/, /funding/]);
    if (funding && typeof funding.value === 'string' && funding.value.trim()) {
      facts.fundingType = funding.value.trim().slice(0, 120);
      provenance.fundingType = { source: funding.key };
      confidence.fundingType = 'high';
    }

    const locationType = findExplicit(data, [/locationtype/, /workmode/, /remoteonsite/]);
    if (locationType && typeof locationType.value === 'string' && locationType.value.trim()) {
      facts.locationType = locationType.value.trim().slice(0, 80);
      provenance.locationType = { source: locationType.key };
      confidence.locationType = 'high';
    }

    const visa = findExplicit(data, [/visasponsorship/, /sponsorshipavailable/]);
    if (visa) {
      const raw = String(visa.value).toLowerCase();
      if (/^(true|yes|available|provided|1)$/.test(raw)) facts.visaSponsorship = true;
      else if (/^(false|no|not available|0)$/.test(raw)) facts.visaSponsorship = false;
      if ('visaSponsorship' in facts) {
        provenance.visaSponsorship = { source: visa.key };
        confidence.visaSponsorship = 'high';
      }
    }

    if (Object.keys(facts).length === 0) continue;
    candidates++;

    if (!WRITE) {
      console.log(`[dry-run] ${opportunity.slug}: ${JSON.stringify(facts)}`);
      continue;
    }

    await db.opportunityMatchProfile.upsert({
      where: { opportunityId: opportunity.id },
      update: {
        ...facts,
        provenance,
        confidence,
        extractionVersion: 'explicit-keys-v1',
      },
      create: {
        opportunityId: opportunity.id,
        ...facts,
        provenance,
        confidence,
        extractionVersion: 'explicit-keys-v1',
      },
    });
    written++;
  }

  console.log(`matcher match-profile backfill: opportunities=${opportunities.length} candidates=${candidates} written=${written} mode=${WRITE ? 'WRITE' : 'DRY RUN'}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
