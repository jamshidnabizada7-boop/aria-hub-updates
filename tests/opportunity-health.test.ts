import { describe, expect, test } from 'bun:test';
import { matchesHealthIssue, opportunityHealth, type HealthOpportunity } from '../src/lib/opportunity-health';
import { WpApiScraper } from '../src/lib/import/scrapers/wp-api';
import { shouldHealApplyLink } from '../src/lib/apply';

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
