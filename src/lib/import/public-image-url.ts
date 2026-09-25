import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
  ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['::', 128], ['::1', 128],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32],
] as const) blocked.addSubnet(address, prefix, 'ipv6');

export function isPublicImageAddress(address: string): boolean {
  if (address.toLowerCase().startsWith('::ffff:')) return false;
  const family = isIP(address);
  return Boolean(family) && !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

export function isPublicImageUrlSyntax(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return false;
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!host || /\.(?:local|localhost|internal|test|invalid)$/.test(host) || host === 'localhost') return false;
    return isIP(host) ? isPublicImageAddress(host) : host.includes('.');
  } catch {
    return false;
  }
}

/** Validate every redirect target and resolved address before importing media. */
export async function fetchPublicImage(raw: string, signal: AbortSignal): Promise<Response> {
  let url = raw;
  for (let hop = 0; hop < 5; hop++) {
    if (!isPublicImageUrlSyntax(url)) throw new Error('unsafe image URL');
    const hostname = new URL(url).hostname.replace(/^\[|\]$/g, '');
    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some((entry) => !isPublicImageAddress(entry.address))) {
      throw new Error('image host resolved to a non-public address');
    }
    const response = await fetch(url, {
      signal,
      headers: { 'User-Agent': 'ARIAHubImportBot/1.0' },
      redirect: 'manual',
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) throw new Error('image redirect lacked a location');
    url = new URL(location, url).href;
  }
  throw new Error('too many image redirects');
}
