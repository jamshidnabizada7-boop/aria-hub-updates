/**
 * Phase 22 — security hardening: URL guard (SSRF), shared rate limiter,
 * and the admin-add-source guard. Employer ownership is covered by
 * tests/employer-jobs.test.ts (the cross-org wall).
 */
import { describe, test, expect } from 'bun:test';

const { isSafePublicUrl } = await import('../src/lib/security/url-guard');
const { checkRateLimit, rateLimitKey } = await import('../src/lib/security/rate-limit');

describe('isSafePublicUrl (SSRF wall)', () => {
  test('public https URLs pass', () => {
    expect(isSafePublicUrl('https://www.acted.org/en/jobs/')).toBe(true);
    expect(isSafePublicUrl('http://example.org/feed.xml')).toBe(true);
    expect(isSafePublicUrl('https://192.0.2.0')).toBe(false); // documentation range is blocked, not public
  });

  test('localhost, internal hosts, and IP-literals targeting internals fail', () => {
    expect(isSafePublicUrl('http://localhost:3000/api')).toBe(false);
    expect(isSafePublicUrl('http://127.0.0.1/admin')).toBe(false);
    expect(isSafePublicUrl('http://10.0.0.4/internal')).toBe(false);
    expect(isSafePublicUrl('http://192.168.1.10/router')).toBe(false);
    expect(isSafePublicUrl('http://169.254.169.254/latest/meta-data/')).toBe(false); // cloud metadata
    expect(isSafePublicUrl('http://[::1]/x')).toBe(false);
    expect(isSafePublicUrl('http://service.internal/health')).toBe(false);
    expect(isSafePublicUrl('http://printer.local')).toBe(false);
    expect(isSafePublicUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(false);
  });

  test('credentials, non-http schemes, and junk fail', () => {
    expect(isSafePublicUrl('https://user:pass@acted.org/x')).toBe(false);
    expect(isSafePublicUrl('file:///etc/passwd')).toBe(false);
    expect(isSafePublicUrl('ftp://example.org/x')).toBe(false);
    expect(isSafePublicUrl('javascript:alert(1)')).toBe(false);
    expect(isSafePublicUrl('not a url')).toBe(false);
    expect(isSafePublicUrl('')).toBe(false);
    expect(isSafePublicUrl(null)).toBe(false);
  });

  test('mailto allowed only when explicitly requested', () => {
    expect(isSafePublicUrl('mailto:jobs@acted.org')).toBe(false);
    expect(isSafePublicUrl('mailto:jobs@acted.org', { allowMailto: true })).toBe(true);
  });
});

describe('shared rate limiter', () => {
  test('allows up to the limit, then blocks, then recovers after the window', () => {
    const key = rateLimitKey('test', 'user', 'ip');
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 1000, 100 * i)).toBe(true);
    }
    expect(checkRateLimit(key, 5, 1000, 500)).toBe(false); // all 5 still inside the window
    // window (1s) passed → allowed again
    expect(checkRateLimit(key, 5, 1000, 1200)).toBe(true);
  });

  test('keys are namespaced', () => {
    expect(checkRateLimit(rateLimitKey('ns-a', 'u1'), 1, 1000, 0)).toBe(true);
    expect(checkRateLimit(rateLimitKey('ns-b', 'u1'), 1, 1000, 0)).toBe(true); // different namespace
    expect(checkRateLimit(rateLimitKey('ns-a', 'u1'), 1, 1000, 0)).toBe(false);
  });
});
