import { describe, expect, test } from 'bun:test';
import { resolveImportedOpportunityStatus } from '../src/lib/import/publication-policy';

describe('import publication policy', () => {
  const now = new Date('2026-09-25T00:00:00.000Z');
  const future = new Date('2026-10-10T00:00:00.000Z');
  const past = new Date('2026-09-01T00:00:00.000Z');

  test('new trusted-source records publish automatically', () => {
    expect(resolveImportedOpportunityStatus({ autoPublish: true, deadline: future, now })).toBe('published');
  });

  test('new review-source records remain draft', () => {
    expect(resolveImportedOpportunityStatus({ autoPublish: false, deadline: future, now })).toBe('draft');
  });

  test('published records stay published when refreshed by a review source', () => {
    expect(resolveImportedOpportunityStatus({
      existingStatus: 'published',
      autoPublish: false,
      deadline: future,
      now,
    })).toBe('published');
  });

  test('draft moderation state is preserved even if source later becomes auto-publish', () => {
    expect(resolveImportedOpportunityStatus({
      existingStatus: 'draft',
      autoPublish: true,
      deadline: future,
      now,
    })).toBe('draft');
  });

  test('archived moderation state is never revived by scraper refreshes', () => {
    expect(resolveImportedOpportunityStatus({
      existingStatus: 'archived',
      autoPublish: true,
      deadline: future,
      now,
    })).toBe('archived');
  });

  test('expired record can reactivate when a trusted source extends its deadline', () => {
    expect(resolveImportedOpportunityStatus({
      existingStatus: 'expired',
      autoPublish: true,
      deadline: future,
      now,
    })).toBe('published');
  });

  test('expired record stays expired when source is review-only', () => {
    expect(resolveImportedOpportunityStatus({
      existingStatus: 'expired',
      autoPublish: false,
      deadline: future,
      now,
    })).toBe('expired');
  });

  test('a past deadline always resolves to expired', () => {
    expect(resolveImportedOpportunityStatus({
      existingStatus: 'published',
      autoPublish: true,
      deadline: past,
      now,
    })).toBe('expired');
  });
});
