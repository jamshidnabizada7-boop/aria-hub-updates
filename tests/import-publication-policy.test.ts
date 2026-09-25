import { describe, expect, test } from 'bun:test';
import { resolveImportedOpportunityStatus } from '../src/lib/import/publication-policy';

describe('import opportunity publication policy', () => {
  test('new trusted-source rows publish when autoPublish is enabled', () => {
    expect(resolveImportedOpportunityStatus(null, true)).toBe('published');
  });

  test('new review-source rows stay draft when autoPublish is disabled', () => {
    expect(resolveImportedOpportunityStatus(null, false)).toBe('draft');
  });

  test('an existing published opportunity is never demoted by a scraper refresh', () => {
    expect(resolveImportedOpportunityStatus('published', false)).toBe('published');
  });

  test('existing editorial states remain authoritative', () => {
    expect(resolveImportedOpportunityStatus('draft', true)).toBe('draft');
    expect(resolveImportedOpportunityStatus('expired', true)).toBe('expired');
    expect(resolveImportedOpportunityStatus('archived', true)).toBe('archived');
  });
});
