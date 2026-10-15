/** Reimports refresh source content without erasing reviewed repairs or translations. */
export function preserveRepairsAndTranslations(
  incoming: Record<string, unknown>, existing: Record<string, unknown>, repairedFields: string[],
): Record<string, unknown> {
  const data = { ...incoming };
  const sourceFields = ['title','description','responsibilities','requirements','guidelines','eligibility','benefits','salary','educationReq','experience','jobType'];
  for (const key of repairedFields) {
    if (sourceFields.includes(key) || ['country','categoryId'].includes(key)) data[key] = existing[key];
  }
  for (const key of Object.keys(data).filter(key => key.endsWith('I18n'))) {
    const old = existing[key]; const next = data[key];
    if (old && typeof old === 'object' && !Array.isArray(old) && next && typeof next === 'object' && !Array.isArray(next)) {
      data[key] = { ...next, ...old, ...('en' in next ? { en: next.en } : {}) };
    }
  }
  for (const key of repairedFields) {
    if (existing[`${key}I18n`]) data[`${key}I18n`] = existing[`${key}I18n`];
  }
  const changed = sourceFields.some(key => key in data && data[key] !== existing[key]);
  if (changed) {
    data.faStatus = 'pending'; data.psStatus = 'pending';
    const origin = existing.translationOrigin && typeof existing.translationOrigin === 'object' ? existing.translationOrigin as Record<string, unknown> : {};
    data.translationOrigin = { ...origin, ...(origin.fa === 'MANUAL' ? { fa: 'MANUAL_STALE' } : {}), ...(origin.ps === 'MANUAL' ? { ps: 'MANUAL_STALE' } : {}) };
  }
  return data;
}
