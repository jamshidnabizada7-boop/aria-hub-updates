import { describe, expect, test } from 'bun:test';
import { buildOpportunityFacts, publicFactSources, translateFactValue, localizeLocation, materializeFactTranslations, factNeedsTranslation } from '../src/lib/opportunity-facts';

const metadata = {
  wpPostId: 42361, jobId: '834bc83e-1624-466d-8b1d-c82e3d163f49',
  terms: 'Leadership Programs, Opportunities', slug: 'private-import-slug', adapter: 'jobs',
  gender: 'Male', languages: ['Dari', 'English', 'Pashto'], workType: 'Full Time',
  vacancies: 1, reference: 'NDC-1405-072', extendable: 'Yes', travelRequired: 'No',
  contractType: 'Contractor', contractDuration: 'One Year', probationPeriod: 'Three Months',
  functionalAreas: ['Engineering', 'Mechanical Engineering'], submission: 'Link',
};

describe('public opportunity facts', () => {
  test('internal metadata never becomes a label or translation input', () => {
    const keys = publicFactSources(metadata).map(f => f.key);
    for (const key of ['wpPostId', 'jobId', 'terms', 'slug', 'adapter']) expect(keys).not.toContain(key);
    expect(buildOpportunityFacts({ extractedData: metadata }, 'en').map(f => f.value).join(' ')).not.toContain('834bc83e');
  });

  test('aliases and structured fields produce one fact per meaning', () => {
    const facts = buildOpportunityFacts({ country: 'Germany', jobType: 'scholarship', extractedData: {
      Country: 'Germany', HostCountry: 'Germany', OpportunityButton: 'scholarship',
      'No. of Jobs': 2, NoofJob: 2, 'Closing Date': '31 October 2026',
    } }, 'fa', { deadline: '۳۱ اکتوبر ۲۰۲۶' });
    expect(facts.filter(f => f.key === 'location')).toHaveLength(1);
    expect(facts.filter(f => f.key === 'jobType')).toHaveLength(1);
    expect(facts.find(f => f.key === 'location')?.value).toBe('آلمان');
    expect(facts.find(f => f.key === 'jobType')?.value).toBe('بورسیه');
    expect(facts.find(f => f.key === 'vacancies')?.value).toBe('۲');
    expect(facts.find(f => f.key === 'deadline')?.value).toBe('۳۱ اکتوبر ۲۰۲۶');
  });

  test('the reported engineering listing is localized in Dari and Pashto', () => {
    for (const lang of ['fa', 'ps'] as const) {
      const facts = buildOpportunityFacts({ jobType: 'job', salary: 'As Per Company Scale', educationReq: 'Bachelor', experience: '5+ years', country: 'Afghanistan', extractedData: metadata }, lang, { location: 'Kabul, Afghanistan' });
      expect(facts.every(f => !f.original)).toBe(true);
      expect(facts.find(f => f.key === 'reference')?.value).toBe('NDC-1405-072');
      expect(facts.find(f => f.key === 'languages')?.value).not.toContain('English');
      expect(facts.find(f => f.key === 'location')?.value).toBe('کابل، افغانستان');
      expect(facts.find(f => f.key === 'jobType')?.label).not.toContain('نوع کار');
      // Equal values for different facts must not discard useful information.
      expect(facts.some(f => f.key === 'extendable')).toBe(true);
      expect(facts.some(f => f.key === 'travelRequired')).toBe(true);
    }
  });

  test('manual variants win, stale automatic variants do not', () => {
    const row = { extractedData: { Gender: 'Male' }, extractedDataI18n: { fa: { Gender: 'ترجمه اختصاصی' } } };
    expect(buildOpportunityFacts(row, 'fa')[0].value).toBe('ترجمه اختصاصی');
    const stale = { extractedData: { gender: 'Female' }, extractedDataI18n: { fa: { gender: 'مرد' }, ps: { gender: 'نارینه' }, _sources: { fa: { gender: 'Male' }, ps: { gender: 'Male' } } } };
    const next = materializeFactTranslations(stale.extractedData, stale.extractedDataI18n);
    expect(buildOpportunityFacts({ ...stale, extractedDataI18n: next }, 'fa')[0].value).toBe('زن');
    expect(buildOpportunityFacts({ ...stale, extractedDataI18n: next }, 'ps')[0].value).toBe('ښځینه');
    expect(materializeFactTranslations(stale.extractedData, next)).toBeNull();
  });

  test('stored translations also serve matching core facts', () => {
    const facts = buildOpportunityFacts({ experience: 'At least five years in project design', experienceI18n: { en: 'At least five years in project design' }, extractedData: { Experience: 'At least five years in project design' }, extractedDataI18n: { fa: { Experience: 'حداقل پنج سال تجربه در طراحی پروژه' } } }, 'fa');
    expect(facts[0].value).toBe('حداقل پنج سال تجربه در طراحی پروژه');
  });

  test('empty values, objects, UUIDs and zero vacancies are omitted', () => {
    expect(publicFactSources({ salary: 'N/A', languages: {}, gender: '-', vacancies: 0, reference: '834bc83e-1624-466d-8b1d-c82e3d163f49', submission: 'https://example.com' })).toEqual([]);
  });

  test('ranges and durations retain all numbers', () => {
    expect(translateFactValue('3-5 years', 'fa')).toBe('۳-۵ سال');
    expect(translateFactValue('Three Months', 'fa')).toBe('۳ ماه');
    expect(translateFactValue('One Year', 'ps')).toBe('۱ کال');
    expect(localizeLocation('Germany', 'ps')).not.toBe('Germany');
  });

  test('unknown prose stays honest and is eligible for automatic translation', () => {
    const row = { extractedData: { duration: 'Until the final research project is completed' } };
    expect(buildOpportunityFacts(row, 'fa')[0].original).toBe(true);
    expect(factNeedsTranslation(publicFactSources(row.extractedData)[0], null, 'fa', 'en')).toBe(true);
    expect(factNeedsTranslation(publicFactSources({ gender: 'Male' })[0], null, 'ps', 'en')).toBe(false);
  });
});
