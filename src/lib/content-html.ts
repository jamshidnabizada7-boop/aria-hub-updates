/**
 * Listing content rendering — turns raw scraped HTML (or plain text) into
 * clean, safe, professional structured markup for detail pages.
 *
 * Design goals (owner requirements):
 *  - Bold section titles / sub-headings preserved (never a flat text blob)
 *  - No "Sponsored links", ad scripts, share widgets, source-site footers
 *  - No unnecessary blank space (empty <p>, runs of <br>, &nbsp; padding)
 *  - Users must never receive working off-site links inside listing bodies
 *    (the ONLY outgoing link a user sees is the verified applyUrl CTA)
 *  - Works for both legacy plain-text rows and HTML rows
 */

import { stripHtml, stripTextJunk, stripThemeBoilerplate } from './import/utils';

/** Tags kept in listing bodies — everything else is unwrapped. */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 'mark', 'sub', 'sup',
  'h2', 'h3', 'h4', 'h5',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

/** Inline tags that should simply be unwrapped (keep inner text). */
const UNWRAP_QUIETLY = new Set(['a', 'span', 'font', 'small', 'abbr', 'time']);

interface TextState {
  out: string[];
  para: string[];
  list: string[] | null;
}

function flushPara(st: TextState): void {
  if (st.para.length) {
    const text = st.para.join(' ').replace(/\s+/g, ' ').trim();
    if (text) st.out.push(`<p>${escapeHtml(text)}</p>`);
    st.para = [];
  }
}

function flushList(st: TextState): void {
  if (st.list && st.list.length) {
    st.out.push(`<ul>${st.list.map((li) => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`);
  }
  st.list = null;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert plain text (already junk-stripped) into simple semantic HTML:
 *  - short heading-like lines become <h4> (bold sub-titles)
 *  - bullet lines (•, -, *, ‣, ·, numbered.) become <ul><li>
 *  - everything else becomes <p>
 */
export function textToStructuredHtml(text: string): string {
  const clean = stripTextJunk(text);
  if (!clean.trim()) return '';
  const lines = clean.split('\n');
  const st: TextState = { out: [], para: [], list: null };

  const BULLET_RE = /^\s*([•‣·▪◦*\-–—]|\(?\d{1,2}[.)]|[a-z][.)])\s+(.{2,})$/i;
  // Heading-like: short, no terminal punctuation, no bullet, title-ish
  const isHeadingLike = (l: string): boolean => {
    if (l.length > 90 || l.length < 2) return false;
    if (BULLET_RE.test(l)) return false;
    if (/[.,;:!؟]$/.test(l.trim()) && !/:$/.test(l.trim())) return false;
    const words = l.trim().split(/\s+/).length;
    return words <= 14;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) {
      flushList(st);
      flushPara(st);
      continue;
    }
    const bullet = line.match(BULLET_RE);
    if (bullet) {
      flushPara(st);
      if (!st.list) st.list = [];
      st.list.push(bullet[2].trim());
      continue;
    }
    flushList(st);
    if (isHeadingLike(line)) {
      flushPara(st);
      st.out.push(`<h4>${escapeHtml(line.replace(/:$/, ''))}</h4>`);
      continue;
    }
    st.para.push(line);
  }
  flushList(st);
  flushPara(st);
  return st.out.join('\n');
}

/**
 * Sanitize scraped HTML:
 *  - strips scripts/styles/iframes/ins + junk blocks (ads, share kits, footers)
 *  - unwraps ALL <a> tags (users never leave via in-content links)
 *  - drops every attribute (classes/styles/handlers gone)
 *  - removes empty paragraphs, collapses <br> runs, trims whitespace
 */
export function sanitizeListingHtml(html: string): string {
  if (!html) return '';
  let s = stripThemeBoilerplate(html);

  // Strip non-renderable blocks entirely
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<(ins|svg|form|input|button|select|textarea)[\s\S]*?<\/\1>/gi, '')
    .replace(/<ins[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Unwrap anchors — keep the text (apply links live in the Apply card only)
  s = s.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');

  // Tag whitelist pass
  s = s.replace(/<\/?([a-zA-Z0-9]+)((?:\s+[^>]*)?)>/g, (match, tag: string) => {
    const lower = tag.toLowerCase();
    if (ALLOWED_TAGS.has(lower)) {
      if (lower === 'b') return match.startsWith('</') ? '</strong>' : '<strong>';
      if (lower === 'i') return match.startsWith('</') ? '</em>' : '<em>';
      // Self-closing forms normalized
      if (lower === 'br') return '<br>';
      if (lower === 'hr') return '<hr>';
      return match.startsWith('</') ? `</${lower}>` : `<${lower}>`;
    }
    if (UNWRAP_QUIETLY.has(lower)) return '';
    // Unknown block tag — unwrap as well
    return '';
  });

  // Remove empty containers and runs of <br>
  for (let pass = 0; pass < 2; pass++) {
    s = s
      .replace(/<(p|h2|h3|h4|h5|li|td|th)>\s*(?:&nbsp;|<br\s*\/?>|&#8203;|\s)*<\/\1>/gi, '')
      .replace(/<ul>\s*(?:<li>\s*<\/li>\s*)+<\/ul>/gi, '');
  }
  s = s
    .replace(/(?:\s*<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .replace(/<p>\s+/g, '<p>')
    .replace(/\s+<\/p>/g, '</p>')
    .replace(/<h4>\s+/g, '<h4>')
    .replace(/\s+<\/h4>/g, '</h4>')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return s;
}

/**
 * Render entry point: HTML in → sanitized HTML out; plain text in →
 * structured HTML out. Empty/whitespace-only → ''.
 */
export function renderListingContent(body: string | null | undefined): string {
  if (!body || !body.trim()) return '';
  const looksLikeHtml = /<\/?(p|div|ul|ol|li|h[1-6]|br|table|strong|em|b|i|span|a)\b[^>]*>/i.test(body);
  if (looksLikeHtml) {
    const html = sanitizeListingHtml(body);
    // If sanitizing reduced it to nothing but the raw text had content,
    // fall back to structured text rendering.
    if (html.replace(/<[^>]+>/g, '').trim()) return html;
  }
  return textToStructuredHtml(stripHtml(body));
}

/**
 * Remove a leading repetition of the listing title inside the description
 * (very common in o4af/scholarships.af scrapes: the theme prints the title
 * above the body, and the scraper captures it again).
 */
export function removeLeadingTitle(html: string, title: string | null | undefined): string {
  if (!html || !title) return html;
  const normTitle = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (normTitle.length < 12) return html;

  const textOnly = stripHtml(html);
  const lines = textOnly.split('\n');
  let cut = 0;
  // Skip up to first 3 leading lines that are (mostly) the title repeated
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const normLine = lines[i].toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (!normLine) { cut = i + 1; continue; }
    if (normLine.includes(normTitle) || normTitle.includes(normLine) || similarity(normLine, normTitle) > 0.72) {
      cut = i + 1;
      continue;
    }
    break;
  }
  if (cut === 0) return html;
  const rest = lines.slice(cut).join('\n').trim();
  return rest || textOnly;
}

/** Cheap trigram similarity for title-duplication detection. */
function similarity(a: string, b: string): number {
  const gram = (s: string): Set<string> => {
    const set = new Set<string>();
    const t = `  ${s} `;
    for (let i = 0; i < t.length - 2; i++) set.add(t.slice(i, i + 3));
    return set;
  };
  const ga = gram(a); const gb = gram(b);
  if (!ga.size || !gb.size) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return (2 * inter) / (ga.size + gb.size);
}
