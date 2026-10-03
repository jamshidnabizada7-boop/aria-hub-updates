/**
 * URL guard (Phase 22) — one validator for every admin/source-provided URL:
 * source URLs, careers pages, websites, logo URLs, suggestion evidence.
 *
 * Blocks: non-http(s) schemes, embedded credentials, localhost/*.local
 * hosts, private/link-local/CGNAT/documentation/multicast IP ranges and
 * cloud metadata endpoints (SSRF), and hostname-less URLs. Mirrors the
 * public-image-url.ts blocklist so image and page fetches share one policy.
 */
import { BlockList } from 'node:net';

const blocked = new BlockList();
for (const subnetSpec of [
  '127.0.0.0/8', // loopback
  '10.0.0.0/8', // RFC1918
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16', // link-local / cloud metadata
  '100.64.0.0/10', // CGNAT
  '192.0.2.0/24', // documentation ranges
  '198.51.100.0/24',
  '203.0.113.0/24',
  '0.0.0.0/8', // "this network"
  '224.0.0.0/4', // multicast
  '240.0.0.0/4', // reserved
]) {
  const [ip, prefix] = subnetSpec.split('/');
  blocked.addSubnet(ip, Number(prefix));
}
// IPv6 literal hosts are rejected outright below (host.startsWith(':')) —
// bun's node:net BlockList polyfill does not accept IPv6 subnets.

const BAD_HOST_SUFFIXES = ['.local', '.internal', '.test', '.invalid', '.localhost', '.home.arpa'];
const BAD_HOSTS = new Set(['localhost', 'metadata.google.internal', '169.254.169.254']);

export interface SafeUrlOptions {
  /** allow mailto: (apply destinations accept email destinations) */
  allowMailto?: boolean;
}

/**
 * True when the URL is a well-formed http(s) (or optionally mailto:) URL
 * pointing at a public host. This is a SYNTACTIC + host-policy check; DNS
 * rebinding is handled by the fetch layer (public-image-url.ts pins resolved
 * addresses for media). Page fetches should call this at config/entry time.
 */
export function isSafePublicUrl(url: string | null | undefined, opts: SafeUrlOptions = {}): boolean {
  const raw = String(url ?? '').trim();
  if (!raw) return false;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  const scheme = parsed.protocol.replace(':', '').toLowerCase();
  if (opts.allowMailto && scheme === 'mailto') return true;
  if (scheme !== 'http' && scheme !== 'https') return false;
  if (parsed.username || parsed.password) return false; // embedded credentials
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || !host.includes('.')) return false;
  if (BAD_HOSTS.has(host)) return false;
  if (BAD_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false;
  // ::ffff: mapped IPv4 (host keeps the colons) — reject outright
  if (host.startsWith(':')) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    try {
      if (blocked.check(host)) return false;
    } catch {
      return false; // unparseable address → reject
    }
  }
  return true;
}
