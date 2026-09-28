/** Media that Chromium may load while rendering an administrator's design. */
export function isAllowedStudioMediaUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value || /[\\\x00-\x1f]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) {
    return !value.split('/').includes('..');
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
      return false;
    }
    const host = url.hostname.toLowerCase();
    return host === 'myariahub.com' ||
      host === 'www.myariahub.com' ||
      host.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export function hasUnsafeStudioMedia(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (typeof data.visualUrl === 'string' && !isAllowedStudioMediaUrl(data.visualUrl)) return true;
  if (!data.media || typeof data.media !== 'object') return false;
  return Object.values(data.media).some((layer) => {
    if (!layer || typeof layer !== 'object') return false;
    const url = (layer as Record<string, unknown>).url;
    return url != null && url !== '' && !isAllowedStudioMediaUrl(url);
  });
}
