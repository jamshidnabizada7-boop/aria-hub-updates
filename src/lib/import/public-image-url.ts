import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
  ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['192.0.2.0', 24], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['::', 128], ['::1', 128],
  ['::', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48],
  ['100::', 64], ['2001::', 23], ['2002::', 16], ['3fff::', 20],
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
  signal = AbortSignal.any([signal, AbortSignal.timeout(30000)]);
  let url = raw;
  for (let hop = 0; hop < 5; hop++) {
    if (!isPublicImageUrlSyntax(url)) throw new Error('unsafe image URL');
    const hostname = new URL(url).hostname.replace(/^\[|\]$/g, '');
    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some((entry) => !isPublicImageAddress(entry.address))) {
      throw new Error('image host resolved to a non-public address');
    }

    // Pin the validated addresses into the connection itself. A separate fetch
    // would resolve DNS again and allow rebinding between check and connect.
    const parsed = new URL(url);
    const request = parsed.protocol === 'https:' ? httpsRequest : httpRequest;
    const response = await new Promise<Response>((resolve, reject) => {
      const req = request(parsed, {
        signal,
        agent: false,
        headers: { 'User-Agent': 'ARIAHubImportBot/1.0' },
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        },
      }, (res) => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
          else if (value !== undefined) headers.set(key, value);
        }
        const status = res.statusCode ?? 502;
        const body = [204, 205, 304].includes(status) ? null : Readable.toWeb(res) as unknown as ReadableStream<Uint8Array>;
        resolve(new Response(body, { status, headers }));
      });
      req.on('error', reject);
      req.end();
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) throw new Error('image redirect lacked a location');
    url = new URL(location, url).href;
  }
  throw new Error('too many image redirects');
}

export async function readPublicImage(raw: string, maxBytes = 5 * 1024 * 1024): Promise<{ bytes: Buffer; contentType: string }> {
  const response = await fetchPublicImage(raw, AbortSignal.timeout(30000));
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.startsWith('image/') || Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new Error('Image response invalid or too large');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Image response empty');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error('Image response too large');
    }
    chunks.push(item.value);
  }
  return { bytes: Buffer.concat(chunks), contentType };
}
