import { describe, expect, test } from 'bun:test';
import { extractApplyLink } from '../src/lib/ai/pipeline';

describe('exact application link policy', () => {
  test('never uses the scraped source article itself as Apply', () => {
    const sourceUrl = 'https://opportunitydesk.org/2026/example-scholarship/';
    expect(extractApplyLink({
      title: 'Scholarship',
      sourceUrl,
      originalUrl: sourceUrl,
      applyUrl: sourceUrl,
      sourceName: 'Opportunity Desk',
      description: 'Read the details and apply according to the announcement.',
    })).toBeNull();
  });

  test('accepts a direct application form on another host', () => {
    const direct = 'https://docs.google.com/forms/d/e/example/viewform';
    expect(extractApplyLink({
      title: 'Job',
      sourceUrl: 'https://example.org/jobs/1',
      sourceName: 'Example',
      description: 'Apply here: ' + direct,
    })).toBe(direct);
  });

  test('accepts same-host URLs only when they are application endpoints', () => {
    expect(extractApplyLink({
      title: 'Job',
      sourceUrl: 'https://jobs.example.org/jobs/1',
      sourceName: 'Example',
      applyUrl: 'https://jobs.example.org/jobs/apply/1',
      description: 'Job details',
    })).toBe('https://jobs.example.org/jobs/apply/1');
  });

  test('prefers a real application email over source links', () => {
    expect(extractApplyLink({
      title: 'Job',
      sourceUrl: 'https://example.org/jobs/1',
      sourceName: 'Example',
      applyUrl: 'https://example.org/jobs/1',
      guidelines: 'Send your CV to careers@company.org',
      description: 'Full description',
    })).toBe('mailto:careers@company.org');
  });
});
