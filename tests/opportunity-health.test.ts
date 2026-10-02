import { describe, expect, test } from 'bun:test';
import { matchesHealthIssue, opportunityHealth, type HealthOpportunity } from '../src/lib/opportunity-health';
import { WpApiScraper } from '../src/lib/import/scrapers/wp-api';
import { AcbarScraper } from '../src/lib/import/scrapers/acbar';
import { normalizeApplyUrl, shouldHealApplyLink } from '../src/lib/apply';

const base: HealthOpportunity = {
  id: 'one', title: 'A scholarship', sourceName: 'WordPress feed',
  sourceUrl: 'https://feed.example/post', originalUrl: 'https://feed.example/post',
  applyUrl: 'https://feed.example/post', categoryId: null, country: null,
  eligibility: null, educationReq: null, experience: null, requirements: null,
  extractedData: { wpPostId: 42, terms: ['Scholarships'] }, faStatus: null, psStatus: null,
};

describe('opportunity health', () => {
  test('source article is not a usable apply link and feed metadata is not eligibility evidence', () => {
    const quality = opportunityHealth(base);
    expect(quality.hasRealApply).toBe(false);
    expect(quality.evidenceCount).toBe(0);
    expect(matchesHealthIssue(base, 'apply')).toBe(true);
    expect(matchesHealthIssue(base, 'core')).toBe(true);
    expect(matchesHealthIssue(base, 'evidence')).toBe(true);
  });

  test('explicit facts resolve the matching issues without inventing a translation', () => {
    const fixed = { ...base, applyUrl: 'mailto:apply@university.example', categoryId: 'scholarship', country: 'Canada', eligibility: 'Open to graduates' };
    expect(matchesHealthIssue(fixed, 'apply')).toBe(false);
    expect(matchesHealthIssue(fixed, 'core')).toBe(false);
    expect(matchesHealthIssue(fixed, 'evidence')).toBe(false);
    expect(matchesHealthIssue(fixed, 'translation')).toBe(true);
  });
});

describe('WordPress application anchors', () => {
  const scraper = new WpApiScraper({ id: 'test', name: 'Feed', type: 'scholarship', scraperKey: 'wpApi', baseUrl: 'https://feed.example', config: {} } as never);
  const map = (html: string) => (scraper as unknown as { mapPost: (post: unknown, include: string[]) => { applyUrl: string; description: string } }).mapPost({
    link: 'https://feed.example/post', title: { rendered: 'A scholarship' },
    content: { rendered: `<p>Details of the scholarship and how students can apply for funding.</p>${html}` },
  }, []);

  test('retains an explicit external application href stripped from description', () => {
    const row = map('<a href="https://university.example/application">Apply now</a>');
    expect(row.applyUrl).toBe('https://university.example/application');
  });

  test('does not promote a source article link to an application', () => {
    const row = map('<a href="/another-story">Apply now</a>');
    expect(row.applyUrl).toBe('https://feed.example/post');
  });
});

test('a new real link can repair an unchanged imported article without replacing a valid admin link', () => {
  const source = 'https://feed.example/post';
  const destination = 'https://university.example/apply';
  expect(shouldHealApplyLink(source, source, source, destination, source, source)).toBe(true);
  expect(shouldHealApplyLink('mailto:admin@university.example', source, source, destination, source, source)).toBe(false);
  expect(shouldHealApplyLink(source, source, source, source, source, source)).toBe(false);
});

test('a form-looking source article is still a fallback', () => {
  const source = 'https://feed.example/application-form-guide';
  expect(shouldHealApplyLink(source, source, source, source, source, source)).toBe(false);
  expect(shouldHealApplyLink(source, source, source, 'https://forms.example/apply', source, source)).toBe(true);
});

test('a verified plain email is a usable link in health and public rendering', () => {
  const raw = 'albironikabul7@gmail.com';
  expect(normalizeApplyUrl(raw)).toBe(`mailto:${raw}`);
  expect(matchesHealthIssue({ ...base, applyUrl: raw }, 'apply')).toBe(false);
});

test('ACBAR reads an application email outside its guideline rich text', async () => {
  const scraper = new AcbarScraper({ id: 'test', name: 'ACBAR', type: 'job', scraperKey: 'acbar', baseUrl: 'https://www.acbar.org', config: {} } as never);
  (scraper as unknown as { fetchText: () => Promise<string> }).fetchText = async () => `
    <h1 class="acbar-jd__title">Chemistry Teacher</h1>
    <article class="acbar-jd__card"><h2 class="acbar-jd__card-title">Submission Guideline</h2>
    <div class="acbar-jd__rich"><p>Send your CV to the following email address:</p></div>
    <p class="acbar-jd__email"><strong>Email / Application Form:</strong><span dir="ltr">albironikabul7@gmail.com</span></p></article>`;
  const row = await scraper.parseDetail({ title: 'Teacher', sourceUrl: 'https://www.acbar.org/en/jobs/details/145635/x', sourceName: 'ACBAR' });
  expect(row.applyUrl).toBe('mailto:albironikabul7@gmail.com');
});

test('ACBAR reads a plain form URL under submission instructions', async () => {
  const scraper = new AcbarScraper({ id: 'test', name: 'ACBAR', type: 'job', scraperKey: 'acbar', baseUrl: 'https://www.acbar.org', config: {} } as never);
  (scraper as unknown as { fetchText: () => Promise<string> }).fetchText = async () => `
    <article class="acbar-jd__card"><h2 class="acbar-jd__card-title">Submission Guideline</h2>
    <div class="acbar-jd__rich"><p>Please submit your CV using the link below.</p><p>https://ee.kobotoolbox.org/x/9o4C0Qie</p></div>
    <p class="acbar-jd__email"><strong>Email / Application Form:</strong><span>-----------</span></p></article>`;
  const row = await scraper.parseDetail({ title: 'Surveyor', sourceUrl: 'https://www.acbar.org/en/jobs/details/145791/x', sourceName: 'ACBAR' });
  expect(row.applyUrl).toBe('https://ee.kobotoolbox.org/x/9o4C0Qie');
});

test('ACBAR ignores an empty address element and a policy URL before the real portal', async () => {
  const scraper = new AcbarScraper({ id: 'test', name: 'ACBAR', type: 'job', scraperKey: 'acbar', baseUrl: 'https://www.acbar.org', config: {} } as never);
  (scraper as unknown as { fetchText: () => Promise<string> }).fetchText = async () => `
    <article class="acbar-jd__card"><h2 class="acbar-jd__card-title">Submission Guideline</h2>
    <div class="acbar-jd__rich"><p>Apply using our application form. Key policies: https://www.peopleinneed.net/key-policies-4142gp</p><p class="acbar-jd__email"> </p></div>
    <p class="acbar-jd__email"><span>https://career.peopleinneed.net/?pos=1116</span></p></article>`;
  const row = await scraper.parseDetail({ title: 'Coordinator', sourceUrl: 'https://www.acbar.org/en/jobs/details/145937/x', sourceName: 'ACBAR' });
  expect(row.applyUrl).toBe('https://career.peopleinneed.net/?pos=1116');
});

test('WordPress section headings fill eligibility and country only with labeled source evidence', () => {
  const scraper = new WpApiScraper({ id: 'test', name: 'Feed', type: 'scholarship', scraperKey: 'wpApi', baseUrl: 'https://feed.example', config: {} } as never);
  const map = (html: string) => (scraper as unknown as { mapPost: (post: unknown, include: string[]) => { eligibility: string | null; benefits: string | null; country: string | null; applyUrl: string } }).mapPost({
    link: 'https://feed.example/post', title: { rendered: 'Oxford scholarship' }, content: { rendered: html },
  }, []);
  const rich = map('<h2>Who can Apply?</h2><p>Early career researchers with a degree.</p><h2>Benefits</h2><p>Tuition and stipend.</p><h2>Where will the Scholarship be Taken?</h2><p>Oxford, UK</p><h2>How to Apply</h2><p>Email apply@university.example</p>');
  expect(rich.eligibility).toContain('Early career researchers');
  expect(rich.benefits).toContain('Tuition and stipend');
  expect(rich.country).toBe('United Kingdom');
  expect(rich.applyUrl).toBe('mailto:apply@university.example');
  expect(map('<p>Open worldwide. Details of the program and application process are provided by the host.</p>').country).toBeNull();
});
