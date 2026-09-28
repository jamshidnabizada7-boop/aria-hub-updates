import { describe, expect, test } from 'bun:test';
import { normalizeLinkedInAuthorUrn } from '../src/lib/social/channels';

describe('LinkedIn author identifier normalization', () => {
  test('accepts a full organization URN', () => {
    expect(normalizeLinkedInAuthorUrn('urn:li:organization:123456')).toBe('urn:li:organization:123456');
  });

  test('accepts a full person URN', () => {
    expect(normalizeLinkedInAuthorUrn('urn:li:person:abc_123')).toBe('urn:li:person:abc_123');
  });

  test('converts a bare numeric organization id', () => {
    expect(normalizeLinkedInAuthorUrn('987654')).toBe('urn:li:organization:987654');
  });

  test('rejects company URL slugs instead of inventing an organization URN', () => {
    expect(normalizeLinkedInAuthorUrn('https://www.linkedin.com/company/aria-hub')).toBeNull();
    expect(normalizeLinkedInAuthorUrn('aria-hub')).toBeNull();
  });
});
