import { describe, expect, test } from 'bun:test';
import { hasUnsafeStudioMedia, isAllowedStudioMediaUrl } from '../src/lib/social/studio/media-url';

describe('Studio media URL safety', () => {
  test('accepts built-in and durable public Blob assets', () => {
    expect(isAllowedStudioMediaUrl('/images/studio/premium/global-portal.png')).toBe(true);
    expect(isAllowedStudioMediaUrl('https://store.public.blob.vercel-storage.com/post.png')).toBe(true);
  });

  test('rejects internal hosts, credentials, and protocol-relative URLs', () => {
    for (const url of ['http://127.0.0.1/admin', 'https://localhost/admin', '//127.0.0.1/x',
      'https://user:pass@myariahub.com/x', '/images/../secret']) {
      expect(isAllowedStudioMediaUrl(url)).toBe(false);
    }
  });

  test('rejects unsafe saved media layers', () => {
    expect(hasUnsafeStudioMedia({ media: { hero: { url: 'http://169.254.169.254/latest' } } })).toBe(true);
    expect(hasUnsafeStudioMedia({ media: { hero: { url: '/images/studio/premium/global-portal.png' } } })).toBe(false);
  });
});
