/**
 * Small helpers shared by scrapers and the orchestrator.
 * Pure functions, no I/O — easy to unit test.
 */

import { URL } from 'url';

/** Realistic browser User-Agent so source sites respond with full markup. */
export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 ARIAHubImportBot/1.0';

/**
 * Strip HTML to clean, readable text. Collapses whitespace, decodes common
 * entities, and converts block elements to line breaks for readability.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  let s = html;
  // Convert <br>, </p>, </li>, </h*>, </div> to newlines
  s = s.replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/tr)\s*>/gi, '\n');
  // Drop script/style entirely
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  // Remove all remaining tags
  s = s.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
  // Collapse whitespace per line, trim, and collapse 3+ newlines to 2
  s = s
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s;
}

/**
 * Clean up HTML to remove excessive multiple line spaces / empty paragraphs.
 */
export function cleanHtmlWhitespace(html: string): string {
  if (!html) return '';
  let s = html;
  // Remove empty paragraphs or paragraphs only containing whitespace/&nbsp;/<br>
  s = s.replace(/<p>\s*(?:&nbsp;|<br\s*\/?>|&#8203;|\s)*<\/p>/gi, '');
  // Remove empty divs
  s = s.replace(/<div[^>]*>\s*(?:&nbsp;|<br\s*\/?>|&#8203;|\s)*<\/div>/gi, '');
  // Replace multiple <br> tags (2 or more) with just one
  s = s.replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br>');
  // Replace multiple newlines with single newline
  s = s.replace(/\n{2,}/g, '\n');
  return s.trim();
}

/**
 * Collapse HTML to a single-spaced plain-text summary (no line breaks),
 * useful for short excerpts and hashing.
 */
export function htmlToExcerpt(html: string, max = 500): string {
  const text = stripHtml(html).replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/**
 * Resolve a possibly-relative URL against a base. Returns null on failure.
 */
export function resolveUrl(maybeRelative: string | null | undefined, base: string): string | null {
  if (!maybeRelative) return null;
  const v = maybeRelative.trim();
  if (!v) return null;
  try {
    return new URL(v, base).toString();
  } catch {
    return null;
  }
}

/**
 * Try to parse a date string into ISO `YYYY-MM-DD`. Returns null if unknown.
 * Handles common formats from Afghan job/scholarship sites.
 */
export function parseDate(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  // Already ISO-ish?
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // Try Date.parse for a broad range of formats
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    if (d.getFullYear() > 1990 && d.getFullYear() < 2200) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    }
  }
  return null;
}

/**
 * Generate a URL-safe slug from arbitrary text. Handles Latin, Cyrillic, and
 * strips/ transliterates other scripts to keep slugs ASCII-safe.
 */
export function slugify(input: string, maxLen = 70): string {
  const s = (input || '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')     // non-alphanumeric → dash
    .replace(/^-+|-+$/g, '')          // trim leading/trailing dashes
    .replace(/-{2,}/g, '-')           // collapse dashes
    .slice(0, maxLen)
    .replace(/-+$/, '');
  return s || 'opportunity';
}

/** sha256 hex of a string, using the Web Crypto API (available in Node 18+). */
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Promise-based sleep. */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Best-effort string normalization for fuzzy comparison of titles/orgs.
 * Lowercases, strips punctuation and diacritics, collapses whitespace.
 */
export function normalizeForCompare(s?: string | null): string {
  if (!s) return '';
  return s
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove secrets / internal paths / overly long stack traces from an error
 * message before persisting it in logs shown in the admin panel.
 */
export function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  return raw
    .replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*\S+/gi, '$1=***')
    .replace(/file:\/\/\/[^\s"]+/g, 'file:///...')
    .slice(0, 1000);
}

// ─── Source-site theme boilerplate removal ──────────────────────────────────

/**
 * Inline text junk that source themes inject into scraped content
 * (o4af.com / scholarships.af AddToAny share widgets, "Sponsored links"
 * ad slots, site footers, social-follow blocks). Matched line-wise so it
 * works on plain-text fields too (requirements, guidelines, summaries).
 */
const TEXT_JUNK_LINES: RegExp[] = [
  /^\s*sponsored (links?|ads?)\s*[.:]?\s*$/i,
  /^\s*(share (this|with your friends?)|share with your friends?)\s*[.!]?\s*$/i,
  /^\s*follow us:?\s*$/i,
  /^\s*(facebook|youtube|telegram|instagram|whatsapp|twitter|x)\s*$/i,
  /^\s*scholarship for afghanistan\s*[—–-]\s*making education accessible to all\s*$/i,
  /^\s*(scholarships\.af|o4af\.com)\s*(·|\|)?\s*(scholarships\.af|o4af\.com)?\s*$/i,
  /^\s*share\s*$/i,
  // AdSense payload that leaked into text content (scraper captured scripts as text)
  /^\s*\(?\s*(?:window\.)?adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]?\s*$/i,
  /^\s*\)?\s*\.push\(\s*\{\s*\}\s*\)\s*;?\s*$/i,
  /^\s*\(\s*adsbygoogle\s*=\s*window\.adsbygoogle.*$/i,
  /^\s*\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\s*\{[\s\S]*?\);?\s*$/i,
  // o4af breadcrumb fragments that leak into titles/bodies
  /^\s*top (cities|countries|universities|opportunities)\s*$/i,
  // Theme ad blocks and SEO keyword injections (o4af / wazifaha)
  /^\s*advertisements?\s*[.:]?\s*$/i,
  /^\s*discover more\s*$/i,
  /^\s*sponsored links\s*$/i,
  /^\s*grants?,\s*scholarships\s*&?\s*(and\s+)?financial aid\s*$/i,
  /^\s*health foundations? (&|and)?\s*medical research\s*$/i,
  /^\s*colleges? (&|and)?\s*universities\s*$/i,
  /^\s*student visa assistance\s*$/i,
  /^\s*grant writing services\s*$/i,
  /^\s*educational resources\s*$/i,
  /^\s*sign in for ai assistant\s*$/i,
  /^\s*apply now\s*[.:]?\s*$/i,
];

/**
 * Sanitize a scraped HTML fragment for storage: drop scripts/styles/comments,
 * on* handlers, and presentation attributes (class/style/id/data-*) that leak
 * source-theme internals into the database, then remove the empty wrappers
 * they leave behind. Semantic tags (p, ul, li, strong, h3…) are preserved.
 */
export function sanitizeListingFragment(html: string): string {
  if (!html) return '';
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/\s(?:class|style|id|data-[a-z-]+)\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\s(?:class|style|id|data-[a-z-]+)\s*=\s*'[^']*'/gi, '');
  // Unwrap empty containers left behind (a few passes handle nesting).
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s.replace(/<(div|span|section|article|figure)[^>]*>\s*(?:&nbsp;|<br\s*\/?>|\s)*<\/\1>/gi, '');
    if (s === before) break;
  }
  return s;
}

/** Remove text-level junk lines and standalone branding fragments. */
export function stripTextJunk(text: string): string {
  if (!text) return text;
  let s = text;
  for (const re of TEXT_JUNK_LINES) {
    s = s.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'gm'), '');
  }
  // Branding fragment that may appear mid-text (e.g. after an <hr>)
  s = s
    .replace(/scholarship for afghanistan\s*[—–-]\s*making education accessible to all/gi, '')
    .replace(/\bscholarships\.af\b\s*·\s*\bo4af\.com\b/gi, '');
  // Collapse the whitespace the removals left behind
  s = s
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return s;
}

/**
 * Strip source-theme boilerplate from scraped HTML:
 *  - AdSense/Advanced Ads blocks (`advads-*`, `adsbygoogle`, `<script>`)
 *  - AddToAny share kits (`a2a_*` / `addtoany_*` classes / addtoany.com links)
 *  - o4af/scholarships.af site footers (`.footer-note`, `.s4af-social`)
 *  - WordPress sharedaddy / related-posts blocks
 * plus a text-level sweep for inline junk lines.
 *
 * Block removal is ITERATIVE (up to 3 passes) because the theme nests one
 * level deep (e.g. `advads-bottom-content` > `advads-adlabel`, or
 * `addtoany_share_save_container` > `addtoany_header`): each pass removes
 * the innermost leaf, the next pass takes the now-empty wrapper.
 *
 * Used by scrapers (before persisting) and cleanup scripts (after the fact).
 */
export function stripThemeBoilerplate(html: string): string {
  if (!html) return html;
  // 1. Scripts and styles first — ad payloads and inline junk CSS.
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<ins[^>]*class="[^"]*adsbygoogle[^"]*"[^>]*>[\s\S]*?<\/ins>/gi, '');

  // 2. Iterative junk-block removal (handles one level of nesting).
  for (let pass = 0; pass < 3; pass++) {
    const before = s;
    s = s.replace(
      /<div[^>]*(?:class|id)="[^"]*(?:footer-note|s4af-social|a2a_kit|addtoany|advads|sharedaddy|sharing-hidden|jp-relatedposts|related-posts|a2a_share|sponsored)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      '',
    );
    s = s.replace(/<a[^>]*(?:addtoany\.com|class="[^"]*a2a_[^"]*")[^>]*>[\s\S]*?<\/a>/gi, '');
    s = s.replace(/<a[^>]*class="[^"]*s4af-[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
    if (s === before) break;
  }

  // 3. Leftovers: empty wrappers, stray <hr> at block ends.
  s = s.replace(/<div[^>]*>\s*(?:&nbsp;|<br\s*\/?>|\s)*<\/div>/gi, '');
  s = s.replace(/<hr\s*\/?>\s*(?=<\/div>|$)/gi, '');

  // 4. Text-level sweep for anything that leaked as plain text.
  s = stripTextJunk(s);

  // 5. Tidy whitespace artifacts of removal.
  s = s.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br>').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

// ─── Title cleanup ───────────────────────────────────────────────────────────

/**
 * Breadcrumb/site fragments that leak into scraped TITLES (usually as
 * trailing junk, e.g. "…Summer School Top cities"). Applied line-fragment
 * wise so it works on base titles and their translations alike.
 */
const TITLE_JUNK_FRAGMENTS: RegExp[] = [
  /\s*[-–—|·]\s*o4af\.com\s*$/i,
  /\s*[-–—|·]\s*scholarships\.af\s*$/i,
  /\s*[-–—|·]\s*acbar\.org\s*$/i,
  /\s*[-–—|·]\s*wazifaha(\.org)?\s*$/i,
  /\s+top\s+(cities|countries|universities|opportunities)\s*$/i,
  /\s+apply\s+(now|here|before)\s*:?\s*$/i,
  /\s*\(?(adsbygoogle)[^)]*\)?\s*$/i,
];

/** Clean a scraped title: junk fragments, stray separators, whitespace. */
export function cleanTitleJunk(title: string): string {
  if (!title) return title;
  let s = title;
  for (const re of TITLE_JUNK_FRAGMENTS) {
    s = s.replace(new RegExp(re.source, 'gi'), '');
  }
  return s
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[-–—|·]\s*$/, '')
    .trim();
}
/** Date-only deadlines remain open through their stated UTC day. */
export function isExpiredListingDeadline(input: string | null | undefined, now = new Date()): boolean {
  if (!input) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input < now.toISOString().slice(0, 10);
  const deadline = new Date(input);
  return !Number.isNaN(deadline.getTime()) && deadline.getTime() < now.getTime();
}
