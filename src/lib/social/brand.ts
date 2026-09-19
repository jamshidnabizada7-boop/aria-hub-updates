/**
 * ARIA HUB — Brand Studio design tokens & shared helpers.
 *
 * The whole social automation is CODE-DRIVEN (no LLM image prompts): every
 * graphic is rendered from deterministic React templates that all share the
 * same brand chrome, so any post is recognisably ARIA HUB at a glance — the
 * same way world-class brands keep one visual signature across thousands of
 * posts (Coca-Cola's fixed palette, Netflix's recurring series formats,
 * Canva-style template production, Avanegar's signature accent-word headline).
 *
 * Brand pattern (extracted from the real logo + the reference pages):
 *  - deep navy canvas + cream-gold accents (extracted from logo-mark.png)
 *  - fixed header lockup: logo mark + "ARIA HUB" wordmark + tagline
 *  - ONE keyword per headline highlighted in gold (the signature move)
 *  - kicker chip naming the series (Deadline / Tip / Quote / Promo / …)
 *  - fixed gold CTA band with myariahub.com + QR
 *  - top hairline + bottom strip gold framing, dot-grid ambience
 */

export type PostTemplate =
  | 'spotlight'
  | 'deadline'
  | 'tip'
  | 'quote'
  | 'promo'
  | 'news'
  | 'stat'
  | 'story'
  | 'packages'
  | 'teaser'
  | 'greeting'
  | 'hiring'
  | 'follow'
  | 'pick'
  | 'day';

/** Palette — extracted from the real ARIA HUB logo mark (single source of truth). */
export const BRAND = {
  bgTop: '#141F3D',
  bgMid: '#283868',
  bgBottom: '#16223F',
  navyDeep: '#1B2440',
  gold: '#F8D898',
  goldSoft: 'rgba(248,216,152,0.80)',
  goldLine: 'rgba(248,216,152,0.42)',
  goldFaint: 'rgba(248,216,152,0.13)',
  white: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.72)',
  logoSrc: '/images/logo-mark.png',
  site: 'myariahub.com',
} as const;

/** Template registry — display keys (i18n) + which content pool feeds each. */
export const TEMPLATE_DEFS: {
  key: PostTemplate;
  labelKey: string; // admin.studio.type.*
  pool: 'opportunity' | 'closingSoon' | 'idea:tip' | 'idea:quote' | 'idea:promo' | 'news' | 'stat' | 'story';
}[] = [
  { key: 'spotlight', labelKey: 'admin.studio.type.spotlight', pool: 'opportunity' },
  { key: 'deadline', labelKey: 'admin.studio.type.deadline', pool: 'closingSoon' },
  { key: 'tip', labelKey: 'admin.studio.type.tip', pool: 'idea:tip' },
  { key: 'quote', labelKey: 'admin.studio.type.quote', pool: 'idea:quote' },
  { key: 'promo', labelKey: 'admin.studio.type.promo', pool: 'idea:promo' },
  { key: 'news', labelKey: 'admin.studio.type.news', pool: 'news' },
  { key: 'stat', labelKey: 'admin.studio.type.stat', pool: 'stat' },
  { key: 'story', labelKey: 'admin.studio.type.story', pool: 'story' },
  // Studio-exclusive showcase formats (not in the automation weekday mix).
  { key: 'packages', labelKey: 'admin.studio.type.packages', pool: 'stat' },
  { key: 'teaser', labelKey: 'admin.studio.type.teaser', pool: 'idea:promo' },
  { key: 'greeting', labelKey: 'admin.studio.type.greeting', pool: 'idea:quote' },
  { key: 'hiring', labelKey: 'admin.studio.type.hiring', pool: 'news' },
  { key: 'follow', labelKey: 'admin.studio.type.follow', pool: 'idea:promo' },
  { key: 'pick', labelKey: 'admin.studio.type.pick', pool: 'idea:promo' },
  { key: 'day', labelKey: 'admin.studio.type.day', pool: 'idea:quote' },
];

const STOP = new Set([
  // en
  'the', 'and', 'for', 'with', 'your', 'you', 'are', 'our', 'this', 'that', 'from', 'have', 'how', 'why', 'what', 'every', 'never', 'will', 'into', 'about', 'apply', 'get', 'one', 'all', 'not', 'out', 'new',
  // fa / ps (short function words)
  'برای', 'همه', 'شما', 'ما', 'این', 'که', 'را', 'از', 'با', 'یک', 'تا', 'در', 'به', 'است', 'هست', 'و', 'هر', 'خود', 'دهید', 'کنید', 'شوید',
  'د', 'چې', 'ته', 'مو', 'دا', 'هغه', 'او', 'په', 'له', 'تر', 'یو', 'هر', 'خپل', 'کړه', 'کوي', 'دي', 'لپاره',
]);

/**
 * The Avanegar signature move, encoded: split a headline so exactly ONE word
 * renders in gold. Deterministic — the longest meaningful word wins (ties go
 * to the earliest), falling back to the last word. Same input = same output,
 * so the brand highlight never depends on an LLM.
 */
export function splitAccent(
  text: string,
  _lang: string,
): { before: string; accent: string; after: string } {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { before: '', accent: text, after: '' };

  let best = -1;
  let bestLen = 0;
  words.forEach((w, i) => {
    const clean = w.replace(/[^\p{L}\p{N}]/gu, '');
    const score = clean.length >= 5 && !STOP.has(clean.toLowerCase()) ? clean.length : 0;
    if (score > bestLen) {
      bestLen = score;
      best = i;
    }
  });
  if (best < 0) best = words.length - 1;

  return {
    before: words.slice(0, best).join(' ') + (best > 0 ? ' ' : ''),
    accent: words[best],
    after: best < words.length - 1 ? ' ' + words.slice(best + 1).join(' ') : '',
  };
}

/** Headline font size that survives short and long copy. */
export function headlineSize(text: string, base = 84): number {
  const n = text.length;
  if (n > 130) return base - 34;
  if (n > 100) return base - 24;
  if (n > 72) return base - 12;
  if (n > 44) return base - 4;
  return base;
}

/** Deterministic day index (UTC) — the planner rotates content by this. */
export function dayIndex(d: Date = new Date()): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);
}
