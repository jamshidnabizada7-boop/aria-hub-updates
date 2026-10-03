/** Jobs.af has historical admin repairs with no field-level edit history.
 * Keep populated fields on those records, while allowing newly scraped facts
 * to fill gaps. Future imports still refresh tracking and source metadata.
 */
const CURATED_FIELDS = [
  'title', 'titleI18n', 'organization', 'country', 'deadline',
  'description', 'descriptionI18n', 'responsibilities', 'responsibilitiesI18n',
  'requirements', 'requirementsI18n', 'guidelines', 'guidelinesI18n',
  'eligibility', 'eligibilityI18n', 'benefits', 'benefitsI18n',
  'salary', 'salaryI18n', 'educationReq', 'educationReqI18n',
  'experience', 'experienceI18n', 'categoryId', 'image',
  'seoTitle', 'seoDescription', 'seoTitleI18n', 'seoDescriptionI18n',
  'ogTitle', 'ogDescription', 'ogTitleI18n', 'ogDescriptionI18n',
] as const;

function hasValue(value: unknown): boolean {
  if (value == null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function sameText(a: unknown, b: unknown): boolean {
  return typeof a === 'string' && typeof b === 'string' &&
    a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
}

/** Merge source fields with a manually reviewed Jobs.af opportunity. */
export function preserveAdminFields(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...incoming };
  for (const field of CURATED_FIELDS) {
    // Some old edits put the qualification paragraph in the application
    // instructions box (or vice versa). Source equality makes that safe to
    // recognize without guessing about the administrator's wording.
    if (field === 'guidelines' && sameText(existing.guidelines, incoming.requirements) &&
        !sameText(incoming.guidelines, incoming.requirements)) continue;
    if (field === 'requirements' && sameText(existing.requirements, incoming.guidelines) &&
        !sameText(incoming.requirements, incoming.guidelines)) continue;
    if (hasValue(existing[field])) merged[field] = existing[field];
  }

  const oldFacts = existing.extractedData;
  const newFacts = incoming.extractedData;
  if (oldFacts && typeof oldFacts === 'object' && !Array.isArray(oldFacts) &&
      newFacts && typeof newFacts === 'object' && !Array.isArray(newFacts)) {
    const facts = { ...(newFacts as Record<string, unknown>) };
    for (const [key, value] of Object.entries(oldFacts)) {
      if (hasValue(value)) facts[key] = value;
    }
    merged.extractedData = facts;
    const oldI18n = existing.extractedDataI18n;
    const currentI18n = oldI18n && typeof oldI18n === 'object' && !Array.isArray(oldI18n)
      ? oldI18n as Record<string, unknown> : {};
    merged.extractedDataI18n = { ...currentI18n, en: facts };
  }
  return merged;
}
