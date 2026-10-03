import { describe, expect, test } from 'bun:test';
import { JobsAfScraper } from '../src/lib/import/scrapers/jobs-af';
import { classifyApplyUrl } from '../src/lib/apply';
import { preserveAdminFields } from '../src/lib/import/preserve-admin-fields';
import { computeHash } from '../src/lib/import/dedupe';
import type { RawListing } from '../src/lib/import/types';

const sourceUrl = 'https://www.jobs.af/jobs/motion-graphics-designer-and-video-editor-16';
const base: RawListing = {
  title: 'Motion Graphics Designer & Video Editor', sourceName: 'Jobs.af',
  sourceUrl, originalUrl: sourceUrl, applyUrl: sourceUrl,
  description: 'Short homepage card with job summary and location information.',
};

const detail = {
  id: '1aff65f2-1536-430c-938c-5986acf449e2',
  slug: 'motion-graphics-designer-and-video-editor-16',
  title: base.title,
  roleSummary: '<p>Speenkai seeks an experienced and creative video editor.</p>',
  jobRequirements: '<p>Creative vision and hands-on video production experience.</p>',
  dutiesAndResponsibilities: '<p>Produce motion graphics and edit video.</p>',
  submissionGuidelines: '<p>Please send your CV to <a href="mailto:hr@speenkai.com">hr@speenkai.com</a></p>',
  submissionEmail: 'hr@speenkai.com',
  submissionLink: null,
  submissionThroughout: 'email',
  minimumExperience: 5,
  country: { name: 'Afghanistan' },
  provinces: [{ province: { name: 'Kabul' } }],
};

function scraperWithApi(job: Record<string, unknown>) {
  const scraper = new JobsAfScraper({ id: 'test', name: 'Jobs.af', type: 'job', scraperKey: 'jobsaf', baseUrl: 'https://www.jobs.af', config: {} } as never);
  let requestedUrl = '';
  (scraper as unknown as { fetchJson: (url: string) => Promise<{ data: unknown; headers: Headers }> }).fetchJson = async (url) => {
    requestedUrl = url;
    return { data: job, headers: new Headers() };
  };
  return { scraper, requestedUrl: () => requestedUrl };
}

describe('Jobs.af public detail API', () => {
  test('promotes a submission email over the source-article fallback', async () => {
    const { scraper, requestedUrl } = scraperWithApi(detail);
    const row = await scraper.parseDetail({ ...base });
    expect(requestedUrl()).toBe('https://api.jobs.af/public/jobs/motion-graphics-designer-and-video-editor-16');
    expect(row.applyUrl).toBe('mailto:hr@speenkai.com');
    expect(classifyApplyUrl(row.applyUrl, row.sourceUrl, row.originalUrl)).toBe('application_email');
    expect(row.guidelines).toContain('Please send your CV');
    expect(row.requirements).toContain('hands-on video production');
    expect(row.experience).toBe('5+ years');
    expect(row.provinces).toEqual(['Kabul']);
  });

  test('accepts an explicit external form and preserves an admin-verified link', async () => {
    const { scraper } = scraperWithApi({ ...detail, submissionEmail: null, submissionLink: 'https://forms.gle/example' });
    expect((await scraper.parseDetail({ ...base })).applyUrl).toBe('https://forms.gle/example');
    expect((await scraper.parseDetail({ ...base, applyUrl: 'mailto:admin@employer.example' })).applyUrl).toBe('mailto:admin@employer.example');
  });

  test('captures the full public fact sheet and all prose sections', async () => {
    const { scraper } = scraperWithApi({
      ...detail,
      company: { name: 'Speenkai', profile: { logoUrl: 'https://example.com/logo.png' } },
      functionalAreas: [{ name: 'Video and Audio Editing' }],
      reference: '18', numberOfVacancies: 3,
      salaryType: 'as_per_company_scale', educationLevel: 'bachelor',
      workType: 'full_time', contractType: 'permanent', contractDuration: 'open_ended',
      probationPeriod: 'one_month', gender: 'male', nationality: 'national',
      language: ['dari', 'english', 'pashto'], travelRequired: true,
      announcementType: 'announcement', isExtendable: true,
      publishDate: '2026-09-30 16:18:33.562+00', expiryDate: '2026-10-14 00:00:00+00',
    });
    const row = await scraper.parseDetail({ ...base });
    expect(row.organization).toBe('Speenkai');
    expect(row.description).toContain('experienced and creative video editor');
    expect(row.requirements).toContain('hands-on video production');
    expect(row.responsibilities).toContain('Produce motion graphics');
    expect(row.guidelines).toContain('Please send your CV');
    expect(row.experience).toBe('5+ years');
    expect(row.salary).toBe('As Per Company Scale');
    expect(row.educationReq).toBe('Bachelor');
    expect(row.extractedData).toMatchObject({
      functionalAreas: ['Video and Audio Editing'], contractDuration: 'Open Ended',
      languages: ['Dari', 'English', 'Pashto'], nationality: 'National',
      travelRequired: 'Yes', vacancies: 3,
    });
    expect(row.publishedDate).toBeTruthy();
    expect(row.deadline).toBeTruthy();
  });

  test('a detail-only change changes the source hash', async () => {
    const first = { ...base, sourceName: 'Jobs.af', requirements: 'Bachelor degree' };
    expect(await computeHash(first)).not.toBe(await computeHash({ ...first, requirements: 'Master degree' }));
  });

  test('later imports fill missing fields without replacing manual content', () => {
    const result = preserveAdminFields({
      description: 'New source summary', requirements: 'Source qualifications',
      responsibilities: 'Source duties', salary: 'As Per Company Scale',
      extractedData: { vacancies: 3, contractDuration: 'Open Ended' },
      contentHash: 'new hash',
    }, {
      description: 'Admin corrected full description', responsibilities: 'Admin corrected duties',
      requirements: null, salary: null, extractedData: { vacancies: 4 },
    });
    expect(result.description).toBe('Admin corrected full description');
    expect(result.responsibilities).toBe('Admin corrected duties');
    expect(result.requirements).toBe('Source qualifications');
    expect(result.salary).toBe('As Per Company Scale');
    expect(result.extractedData).toMatchObject({ vacancies: 4, contractDuration: 'Open Ended' });
    expect(result.contentHash).toBe('new hash');
  });

  test('repairs qualifications accidentally saved as application instructions', () => {
    const result = preserveAdminFields({
      requirements: 'Strong video editing skills',
      guidelines: 'Please email your CV to hr@speenkai.com',
    }, {
      guidelines: 'Strong video editing skills',
      requirements: null,
    });
    expect(result.requirements).toBe('Strong video editing skills');
    expect(result.guidelines).toBe('Please email your CV to hr@speenkai.com');
  });
});
