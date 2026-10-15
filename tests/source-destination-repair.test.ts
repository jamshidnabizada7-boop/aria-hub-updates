import { expect, test } from 'bun:test';
import { applicationDestination } from '../src/lib/import/application-destination';
import { WazifahaScraper } from '../src/lib/import/scrapers/wazifaha';
import { JobsAfScraper } from '../src/lib/import/scrapers/jobs-af';
import { afghanEligibilityEvidence, extractWpHtmlFacts, explicitHostCountry } from '../src/lib/import/scrapers/wp-api';

const source = { id: 'fixture', name: 'Wazifaha Jobs', type: 'job', scraperKey: 'wazifaha', baseUrl: 'https://www.wazifaha.org', config: {} };
const url = 'https://www.wazifaha.org/jobs/31794/program-manager';

test('Wazifaha reads the real portal in Submission Email instead of its redirect wrapper', async () => {
  const scraper = new WazifahaScraper(source);
  scraper.fetchText = async () => `<h1 class="wz-hero-title">Program Manager</h1>
    <div class="wz-apply-email">https://employer.zapier.app/application-1</div>
    <a href="/jobs/apply/31794/program-manager">Apply</a>
    <footer><a href="https://forms.gle/newsletter">Apply for updates</a></footer>`;
  const listing = await scraper.parseDetail({ title: 'Program Manager', sourceUrl: url, sourceName: source.name, applyUrl: url });
  expect(listing.applyUrl).toBe('https://employer.zapier.app/application-1');
  expect(listing.guidelines).toContain('https://employer.zapier.app/application-1');
});

test('Wazifaha captures a dedicated email but preserves a reviewed destination', async () => {
  const scraper = new WazifahaScraper(source);
  scraper.fetchText = async () => '<h1 class="wz-hero-title">Teacher</h1><div class="wz-apply-email">recruitment@school.example</div>';
  expect((await scraper.parseDetail({ title: 'Teacher', sourceUrl: url, sourceName: source.name })).applyUrl).toBe('mailto:recruitment@school.example');
  expect((await scraper.parseDetail({ title: 'Teacher', sourceUrl: url, sourceName: source.name, applyUrl: 'https://school.example/reviewed' })).applyUrl).toBe('https://school.example/reviewed');
});

test('Wazifaha prefers the exact employer vacancy to its generic jobs directory', async () => {
  const scraper = new WazifahaScraper(source);
  scraper.fetchText = async () => `<h1 class="wz-hero-title">Officer</h1><div class="wz-content-section"><h2 class="wz-section-heading">Submission Guidelines</h2><div class="wz-section-body"><p>Visit the announcement and click Apply Now:</p><a href="https://employer.example/en/opportunities/officer">https://employer.example/en/opportunities/officer</a></div></div><div class="wz-apply-email">https://employer.example/en/opportunities/jobs</div>`;
  expect((await scraper.parseDetail({ title: 'Officer', sourceUrl: url, sourceName: source.name })).applyUrl).toBe('https://employer.example/en/opportunities/officer');
});

test('Wazifaha scopes fallback anchors to submission content and never promotes closed wrappers', async () => {
  const scraper = new WazifahaScraper(source);
  scraper.fetchText = async () => `<h1 class="wz-hero-title">Officer</h1><div class="wz-content-section"><h2 class="wz-section-heading">Submission Guidelines</h2><div class="wz-section-body"><p>Complete the form:</p><a href="https://forms.office.com/r/fixture">here</a></div></div><a href="/jobs/apply/1">Apply</a>`;
  expect((await scraper.parseDetail({ title: 'Officer', sourceUrl: url, sourceName: source.name })).applyUrl).toBe('https://forms.office.com/r/fixture');
  scraper.fetchText = async () => '<h1 class="wz-hero-title">Closed job</h1><div class="wz-apply-expired">Applications closed.</div><footer><a href="https://forms.gle/newsletter">Apply</a></footer>';
  expect((await scraper.parseDetail({ title: 'Closed job', sourceUrl: url, sourceName: source.name })).applyUrl).toBe(url);
});

test('Jobs.af preserves a form href hidden behind a generic anchor label', async () => {
  const scraper = new JobsAfScraper({ ...source, name: 'Jobs.af', scraperKey: 'jobsaf', baseUrl: 'https://www.jobs.af' });
  scraper.fetchJson = async () => ({ data: { slug: 'test-job', title: 'Officer', submissionGuidelines: '<p>Apply using <a href="https://forms.gle/job-form">this form</a>.</p>' } as never, headers: new Headers() });
  const listing = await scraper.parseDetail({ title: 'Officer', sourceUrl: 'https://www.jobs.af/jobs/test-job', sourceName: 'Jobs.af' });
  expect(listing.applyUrl).toBe('https://forms.gle/job-form');
  expect(listing.guidelines).toContain('https://forms.gle/job-form');
});

test('application extraction rejects source emails, unsafe schemes and footer links', () => {
  for (const html of ['info@wazifaha.org', 'http://127.0.0.1/private', '<a href="javascript:alert(1)">Apply</a>', '<footer><a href="https://forms.gle/list">Apply</a></footer>']) {
    expect(applicationDestination(html, url)).toBeNull();
  }
});

test('WordPress facts stop at unknown headings and capture Scholarship funding', () => {
  const facts = extractWpHtmlFacts('<p><strong>Scholarship</strong></p><p>Annual funding of 25,000 Swiss francs.</p><p><strong>Eligibility</strong></p><ul><li>Open exclusively to Afghan women.</li></ul><h2>Selection timeline</h2><p>Do not treat this as eligibility.</p><h2>Application</h2><p>Submit your diploma and CV.</p>');
  expect(facts.benefits).toBe('Annual funding of 25,000 Swiss francs.');
  expect(facts.eligibility).toBe('Open exclusively to Afghan women.');
  expect(facts.guidelines).toBe('Submit your diploma and CV.');
  expect(facts.country).toBeNull();
  expect(afghanEligibilityEvidence(facts.eligibility)?.scope).toBe('afghan');
});

test('Afghan relevance is positive eligibility evidence, not a host-country guess', () => {
  expect(afghanEligibilityEvidence('Open to students worldwide.')?.scope).toBe('worldwide');
  for (const text of ['Open to African citizens only.', 'Not open to Afghan applicants.', 'Afghanistan has educational challenges.', 'Open worldwide except Afghanistan.']) expect(afghanEligibilityEvidence(text)).toBeNull();
  expect(explicitHostCountry('The programme will be held in Switzerland.')).toBe('Switzerland');
  expect(explicitHostCountry('Applicants from Afghanistan can study abroad.')).toBeNull();
  expect(explicitHostCountry('Held in Canada. Another meeting is held in Germany.')).toBeNull();
});
