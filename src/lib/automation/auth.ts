import { createHash, timingSafeEqual } from 'node:crypto';

export function matchesSecret(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

export function socialRenderBaseUrl(): string {
  const url = new URL(process.env.SOCIAL_RENDER_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com');
  if (url.username || url.password || (url.protocol !== 'https:' &&
      !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('Invalid social render URL');
  }
  return url.origin;
}
