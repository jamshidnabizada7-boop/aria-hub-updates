import type { Lang } from '@/lib/lang-route';
import { localizeLocation } from '@/lib/opportunity-facts';

export const ARIA_WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029Vb64Wf25q08koeYn8b3h';
export const ARIA_WHATSAPP_CONTACT = 'https://wa.me/93700876806';
const COPY = {
  en: { location: 'Opportunity location', map: 'View location', whatsapp: 'Follow ARIA HUB on WhatsApp', contact: 'Message ARIA HUB on WhatsApp', remote: 'Remote work' },
  fa: { location: 'موقعیت فرصت', map: 'مشاهدهٔ موقعیت', whatsapp: 'آریا هاب را در واتساپ دنبال کنید', contact: 'تماس با آریا هاب در واتساپ', remote: 'کار از راه دور' },
  ps: { location: 'د فرصت ځای', map: 'ځای په نقشه کې وګورئ', whatsapp: 'آریا هاب په واټساپ کې تعقیب کړئ', contact: 'په واټساپ کې له آریا هاب سره اړیکه', remote: 'له لرې کار' },
};
type Location = { country: string | null; province: string | null; city: string | null; confidence: number | null };
export function opportunityLocation(locations: Location[], country?: string | null): string {
  const verified = locations.filter(l => (l.confidence ?? 0) >= 0.75);
  const labels = [...new Set(verified.map(l => [...new Set([l.city, l.province, l.country].filter(Boolean))].join(', ')).filter(Boolean))];
  return (labels.length ? labels.join(' / ') : country || '').slice(0, 180);
}
export function postDetailLines(location: string, lang: Lang, remote = false): string[] {
  const copy = COPY[lang];
  const lines: string[] = [];
  if (remote) lines.push(`📍 ${copy.location}: ${copy.remote}`);
  else if (location) {
    lines.push(`📍 ${copy.location}: ${localizeLocation(location, lang)}`);
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1'); url.searchParams.set('query', location);
    lines.push(`🗺️ ${copy.map}: ${url}`);
  }
  lines.push(`💬 ${copy.whatsapp}: ${ARIA_WHATSAPP_CHANNEL}`);
  lines.push(`📲 ${copy.contact}: ${ARIA_WHATSAPP_CONTACT}`);
  return lines;
}
/** Reserve room for complete destination links. Never cut a link mid-URL. */
export function appendPostDetails(caption: string, lines: string[], maxLength: number): string {
  const additions = lines.filter(line => {
    const url = line.match(/https:\/\/\S+/)?.[0];
    return url ? !caption.includes(url) : !caption.includes(line);
  });
  if (!additions.length) return caption;
  const footer = additions.join('\n');
  const budget = maxLength - footer.length - 2;
  if (budget < 160) throw new Error('post_attachment_budget_too_small');
  let body = caption;
  if (body.length > budget) {
    const primary = caption.match(/🔗\s*(https:\/\/\S+)/)?.[1];
    const required = primary ? `\n\n🔗 ${primary}` : '';
    const blocks = caption.split('\n\n').filter(b => !primary || !b.includes(primary));
    body = '';
    for (const block of blocks) {
      const candidate = body ? `${body}\n\n${block}` : block;
      if (candidate.length + required.length > budget) break;
      body = candidate;
    }
    if (!body) {
      const headline = caption.split('\n')[0].replace(/https:\/\/\S+/g, '').trim();
      body = headline.slice(0, Math.max(0, budget - required.length - 1)).trimEnd() + '…';
    }
    body += required;
  }
  return `${body}\n\n${footer}`;
}
