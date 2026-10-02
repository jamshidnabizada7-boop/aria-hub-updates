import { describe, expect, test } from 'bun:test';
import { JobsAfScraper } from '../src/lib/import/scrapers/jobs-af';
import { classifyApplyUrl } from '../src/lib/apply';
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
});
