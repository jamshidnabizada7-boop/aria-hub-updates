import { describe, expect, test } from 'bun:test';
import { publishToPlatform, isLinkedInUploadUrl, normalizeLinkedInAuthorUrn } from '../src/lib/social/channels';
import { classifySocialDeliveryError, isRetryableDeliveryError } from '../src/lib/social/delivery-policy';
import { matchesSecret } from '../src/lib/automation/auth';
import { fetchPublicImage } from '../src/lib/import/public-image-url';

describe('release platform safeguards', () => {
  test('Facebook image failures never create a text post and redact token echoes', async () => {
    const original = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      calls.push(String(url));
      return Response.json({ error: { message: 'permission denied test-private-token', code: 200 } }, { status: 403 });
    }) as unknown as typeof fetch;
    try {
      const result = await publishToPlatform('facebook', { pageId: '123', accessToken: 'test-private-token' }, { caption: 'Test', imageUrl: 'https://test.public.blob.vercel-storage.com/photo.jpg', requireImage: true });
      expect(result.ok).toBe(false);
      expect(result.error).not.toContain('test-private-token');
      expect(calls.length).toBe(1);
      expect(calls[0]).toContain('/photos');
      expect(classifySocialDeliveryError(result)).toBe('PERMISSION_MISSING');
    } finally { globalThis.fetch = original; }
  });

  test('Telegram required-image failure cannot fall back to sendMessage', async () => {
    const original = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      calls.push(String(url));
      return Response.json({ ok: false }, { status: 400 });
    }) as unknown as typeof fetch;
    try {
      const result = await publishToPlatform('telegram', { botToken: 'test-token', chatId: '123' }, { caption: 'Test', imageUrl: 'https://test.public.blob.vercel-storage.com/photo.jpg', requireImage: true });
      expect(result.ok).toBe(false);
      expect(calls.length).toBe(1);
      expect(calls[0]).toEndWith('/sendPhoto');
    } finally { globalThis.fetch = original; }
  });

  test('unknown outcomes are blocked rather than blindly repeated', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error('socket disconnected'); }) as unknown as typeof fetch;
    try {
      const result = await publishToPlatform('facebook', { pageId: '123', accessToken: 'test-token' }, { caption: 'Test', imageUrl: 'https://test.public.blob.vercel-storage.com/photo.jpg', requireImage: true });
      expect(result.ok).toBe(false);
      const code = classifySocialDeliveryError(result);
      expect(code).toBe('OUTCOME_UNKNOWN');
      expect(isRetryableDeliveryError(code)).toBe(false);
    } finally { globalThis.fetch = original; }
  });

  test('an HTTP success with no message identifier is not fabricated as success', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({})) as unknown as typeof fetch;
    try {
      const result = await publishToPlatform('x', { accessToken: 'test-token' }, { caption: 'Test' });
      expect(result.ok).toBe(false);
      expect(classifySocialDeliveryError(result)).toBe('OUTCOME_UNKNOWN');
    } finally { globalThis.fetch = original; }
  });

  test('LinkedIn posts use the REST API, supported header, and validated organization IDs', async () => {
    const original = globalThis.fetch;
    let request: { url: string; init?: RequestInit } | undefined;
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      request = { url: String(url), init };
      return new Response('', { status: 201, headers: { 'x-restli-id': 'urn:li:share:123' } });
    }) as unknown as typeof fetch;
    try {
      const result = await publishToPlatform('linkedin', { organizationId: '123', accessToken: 'test-token' }, { caption: 'Test' });
      expect(result.ok).toBe(true);
      expect(request?.url).toBe('https://api.linkedin.com/rest/posts');
      expect(new Headers(request?.init?.headers).get('LinkedIn-Version')).toBe('202609');
      expect(normalizeLinkedInAuthorUrn('urn:li:organization:company-slug')).toBeNull();
      expect(isLinkedInUploadUrl('https://www.linkedin.com/dms-uploads/test')).toBe(true);
      expect(isLinkedInUploadUrl('https://www.linkedin.com.evil.invalid/upload')).toBe(false);
    } finally { globalThis.fetch = original; }
  });

  test('unsupported WhatsApp modes and X images fail without network calls', async () => {
    const original = globalThis.fetch;
    const previous = process.env.WHATSAPP_GROUPS_API_ENABLED;
    delete process.env.WHATSAPP_GROUPS_API_ENABLED;
    let calls = 0;
    globalThis.fetch = (async () => { calls++; throw new Error('Unexpected external call'); }) as unknown as typeof fetch;
    try {
      for (const mode of ['channel', 'group']) {
        const result = await publishToPlatform('whatsapp', { mode, accessToken: 'test-token', phoneNumberId: '123', groupId: '456' }, { caption: 'Test' });
        expect(result.ok).toBe(false);
        expect(classifySocialDeliveryError(result)).toBe('UNSUPPORTED');
      }
      expect((await publishToPlatform('x', {}, { caption: 'Test', requireImage: true })).ok).toBe(false);
      expect((await publishToPlatform('instagram', { accessToken: 'test-token', igUserId: '123' }, { caption: 'Test', requireImage: true })).ok).toBe(false);
      expect(calls).toBe(0);
    } finally {
      globalThis.fetch = original;
      if (previous === undefined) delete process.env.WHATSAPP_GROUPS_API_ENABLED; else process.env.WHATSAPP_GROUPS_API_ENABLED = previous;
    }
  });

  test('cron/render secrets reject absent, unequal and prefix values', () => {
    expect(matchesSecret(null, 'secret')).toBe(false);
    expect(matchesSecret('secret', undefined)).toBe(false);
    expect(matchesSecret('sec', 'secret')).toBe(false);
    expect(matchesSecret('secret', 'secret')).toBe(true);
  });

  test('image requests reject private targets before opening a connection', async () => {
    for (const url of ['http://127.0.0.1/image', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]/image']) {
      await expect(fetchPublicImage(url, AbortSignal.timeout(1000))).rejects.toThrow('unsafe image URL');
    }
  });
});
