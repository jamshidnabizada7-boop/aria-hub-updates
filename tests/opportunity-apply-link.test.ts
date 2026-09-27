import { describe, expect, test } from 'bun:test';
import { extractApplyLink } from '../src/lib/ai/pipeline';
import type { RawListing } from '../src/lib/import/types';

function listing(overrides: Partial<RawListing> = {}): RawListing {
  return {
    title: 'Example opportunity',
    description: 'Apply according to the instructions in this announcement.',
    sourceUrl: 'https://example-source.org/posts/example-opportunity',
    originalUrl: 'https://example-source.org/posts/example-opportunity',
    sourceName: 'Example Source',
    sourceLanguage: 'en',
    ...overrides,
  };
}

describe('opportunity application destination safety', () => {
  test('never treats the scraped source article as the application destination', () => {
    expect(extractApplyLink(listing({
      applyUrl: 'https://example-source.org/posts/example-opportunity',
    }))).toBeNull();
  });

  test('accepts a distinct same-site application endpoint', () => {
    expect(extractApplyLink(listing({
      applyUrl: 'https://example-source.org/jobs/apply/123',
    }))).toBe('https://example-source.org/jobs/apply/123');
  });

  test('prefers an application email from guidelines', () => {
    expect(extractApplyLink(listing({
      guidelines: 'Send the complete application to careers@ngo.example by the deadline.',
      applyUrl: 'https://example-source.org/posts/example-opportunity',
    }))).toBe('mailto:careers@ngo.example');
  });

  test('accepts an explicit external application form', () => {
    expect(extractApplyLink(listing({
      description: 'Apply here: https://forms.gle/AbCdEf123',
    }))).toBe('https://forms.gle/AbCdEf123');
  });
});
