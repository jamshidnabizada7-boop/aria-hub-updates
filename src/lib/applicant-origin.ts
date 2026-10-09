/**
 * Reject cross-origin form writes. Behind Cloudflare/Caddy, req.url may use
 * an internal origin; Host is validated by the origin proxy. In production
 * require HTTPS and one of our explicitly recognized public hostnames.
 */
export function applicantSameOrigin(req: Request): boolean {
  const raw = req.headers.get('origin');
  if (!raw) return false;
  try {
    const origin = new URL(raw);
    const host = req.headers.get('host')?.toLowerCase();
    const known = new Set(['www.myariahub.com','myariahub.com']);
    const configured = process.env.APPLICANT_ALLOWED_HOSTS?.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean) ?? [];
    for (const value of configured) known.add(value);
    if (process.env.NODE_ENV === 'production')
      return origin.protocol === 'https:' && Boolean(host) && origin.host.toLowerCase() === host && known.has(host!);
    return Boolean(host) && origin.host.toLowerCase() === host;
  } catch { return false; }
}
