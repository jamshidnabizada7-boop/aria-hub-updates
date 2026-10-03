/**
 * Professional employer job fields (Phase 14).
 *
 * Brings employer submissions up to professional Afghanistan job-board
 * quality. Everything maps onto EXISTING structures — no duplicated fields:
 *
 *   submitted field            → storage
 *   ─────────────────────────────────────────────────────────────────────
 *   vacancy number             → extractedData.vacancyNumber  (powers the
 *                                canonical resolver's Level-A matching)
 *   number of vacancies        → extractedData.numberOfVacancies
 *   contract type / duration   → extractedData.contractType/.contractDuration
 *   gender requirement         → extractedData.genderRequirement
 *   nationality requirement    → extractedData.nationalityRequirement
 *   salary grade               → extractedData.salaryGrade
 *   province / city / district → OpportunityLocation row (province strictly
 *                                whitelist-validated — never invented)
 *   education / experience     → educationReq / experience columns
 *   responsibilities etc.      → responsibilities / requirements / guidelines
 *   salary                     → salary column (already existed)
 *
 * The whole bundle travels through OpportunitySubmission.professional (JSON)
 * and is applied to the real Opportunity on admin approval.
 */
import { normalizeProvince } from '@/lib/geo/provinces';

export interface ProfessionalFields {
  vacancyNumber?: string;
  numberOfVacancies?: number;
  contractType?: string;
  contractDuration?: string;
  genderRequirement?: string;
  nationalityRequirement?: string;
  salaryGrade?: string;
  province?: string;
  city?: string;
  district?: string;
  responsibilities?: string;
  requirements?: string;
  guidelines?: string;
  education?: string;
  experience?: string;
}

export interface ParsedProfessional {
  professional: ProfessionalFields;
  /** whitelist-validated province, or null — never guessed */
  province: string | null;
  city: string | null;
  district: string | null;
}

const clean = (value: unknown, max: number): string | undefined => {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s.slice(0, max) : undefined;
};

/**
 * Validate + normalize the professional bundle from a submission body.
 * Unknown fields are ignored; everything is length-capped; the province is
 * accepted ONLY when it hits the 34-province whitelist (user-provided
 * city/district stay as free text — a province is never invented from them).
 */
export function parseProfessionalFields(body: Record<string, unknown>): ParsedProfessional {
  const vacancyNumber = clean(body.vacancyNumber, 60);
  const rawVacancies = body.numberOfVacancies;
  const rawVacancyCount = rawVacancies != null && String(rawVacancies).trim() !== '' ? Number(rawVacancies) : NaN;
  const numberOfVacancies = Number.isFinite(rawVacancyCount)
    ? Math.max(1, Math.min(999, Math.floor(rawVacancyCount)))
    : undefined;
  const contractType = clean(body.contractType, 60);
  const contractDuration = clean(body.contractDuration, 60);
  const genderRequirement = clean(body.genderRequirement, 60);
  const nationalityRequirement = clean(body.nationalityRequirement, 80);
  const salaryGrade = clean(body.salaryGrade, 60);

  const city = clean(body.city, 80);
  const district = clean(body.district, 80);
  const provinceRaw = clean(body.province, 60);
  const province = provinceRaw ? normalizeProvince(provinceRaw) : null;

  const responsibilities = clean(body.responsibilities, 8000);
  const requirements = clean(body.requirements, 8000);
  const guidelines = clean(body.guidelines, 4000);
  const education = clean(body.education, 2000);
  const experience = clean(body.experience, 2000);

  const professional: ProfessionalFields = {};
  if (vacancyNumber) professional.vacancyNumber = vacancyNumber;
  if (numberOfVacancies) professional.numberOfVacancies = numberOfVacancies;
  if (contractType) professional.contractType = contractType;
  if (contractDuration) professional.contractDuration = contractDuration;
  if (genderRequirement) professional.genderRequirement = genderRequirement;
  if (nationalityRequirement) professional.nationalityRequirement = nationalityRequirement;
  if (salaryGrade) professional.salaryGrade = salaryGrade;
  if (province) professional.province = province;
  if (city) professional.city = city;
  if (district) professional.district = district;
  if (responsibilities) professional.responsibilities = responsibilities;
  if (requirements) professional.requirements = requirements;
  if (guidelines) professional.guidelines = guidelines;
  if (education) professional.education = education;
  if (experience) professional.experience = experience;

  return { professional, province: province ?? null, city: city ?? null, district: district ?? null };
}

/** The extractedData keys the canonical resolver and detail pages consume. */
export function professionalToExtractedData(p: ProfessionalFields): Record<string, unknown> {
  const data: Record<string, unknown> = { sourceForm: 'employer-professional' };
  if (p.vacancyNumber) data.vacancyNumber = p.vacancyNumber;
  if (p.numberOfVacancies) data.numberOfVacancies = p.numberOfVacancies;
  if (p.contractType) data.contractType = p.contractType;
  if (p.contractDuration) data.contractDuration = p.contractDuration;
  if (p.genderRequirement) data.genderRequirement = p.genderRequirement;
  if (p.nationalityRequirement) data.nationalityRequirement = p.nationalityRequirement;
  if (p.salaryGrade) data.salaryGrade = p.salaryGrade;
  return data;
}

/** The professional fields that map onto plain Opportunity columns. */
export function professionalToColumns(p: ProfessionalFields): Record<string, string> {
  const data: Record<string, string> = {};
  if (p.responsibilities) data.responsibilities = p.responsibilities;
  if (p.requirements) data.requirements = p.requirements;
  if (p.guidelines) data.guidelines = p.guidelines;
  if (p.education) data.educationReq = p.education;
  if (p.experience) data.experience = p.experience;
  return data;
}

/** One OpportunityLocation row from the employer's own location answer. */
export function professionalLocationRow(p: ProfessionalFields): {
  country: string; countryCode: string; province: string | null;
  city: string | null; district: string | null; rawLabel: string;
  source: string; confidence: number;
} | null {
  if (!p.province && !p.city && !p.district) return null;
  return {
    country: 'Afghanistan',
    countryCode: 'AF',
    province: p.province ?? null, // whitelist-validated at parse time
    city: p.city ?? null,
    district: p.district ?? null,
    rawLabel: [p.province, p.city, p.district].filter((v): v is string => Boolean(v)).join(', ') || 'employer provided',
    source: 'employer',
    confidence: 1.0, // user-declared, deterministic
  };
}
