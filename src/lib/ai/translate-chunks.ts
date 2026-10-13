/**
 * Pure building blocks of the translation engine — chunking, reply parsing,
 * validation. No DB/provider imports so tests (bun) can exercise them
 * without a database or network.
 */

/** Public fields that must be translated whenever the source text exists. */
export const FIELD_ORDER = [
  'title', 'description', 'summary', 'eligibility', 'benefits',
  'responsibilities', 'requirements', 'guidelines', 'jobType', 'salary',
  'educationReq', 'experience',
] as const;
export type FieldKey = (typeof FIELD_ORDER)[number];

/** Long fields are split into chunks of this size (a chunk SIZE, not a cap). */
export const CHUNK_SIZE = 900;

/**
 * Classic (ASCII) whitespace trim, shared with the SQL twin of this algorithm
 * (aria_tgw_chunk_text). Unicode-aware .trim() is deliberately NOT used: JS
 * and Postgres disagree on the whitespace class, and the chunk hashes must be
 * byte-identical across both implementations (tgw-hash-parity test).
 */
const TRIM_CHARS_RE = /^[ \t\r\n\v\f]+|[ \t\r\n\v\f]+$/g;
export function trimClassic(s: string): string {
  return s.replace(TRIM_CHARS_RE, '');
}

/**
 * Split text into ordered chunks on paragraph/line boundaries.
 *
 * Operates on UNICODE CODEPOINTS (Array.from), not UTF-16 units: emoji/astral
 * characters count as one unit here exactly as in char_length() on the
 * Postgres side. The SQL implementation aria_tgw_chunk_text is a byte-exact
 * twin — changing one without the other invalidates every stored chunk hash.
 */
export function chunkText(text: string, maxLen = CHUNK_SIZE): string[] {
  const clean = trimClassic(text.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n'));
  if (!clean) return [];
  if (Array.from(clean).length <= maxLen) return [clean];
  const chunks: string[] = [];
  let current = '';
  for (const para of clean.split('\n')) {
    const cand = current ? `${current}\n${para}` : para;
    // Candidate length is measured AFTER trimming (classic set) — this matches
    // the original engine and the SQL twin aria_tgw_chunk_text.
    if (Array.from(trimClassic(cand)).length > maxLen && current) {
      chunks.push(trimClassic(current));
      current = para;
    } else {
      current = cand;
    }
    // Single oversized line — hard split on spaces so nothing is lost.
    while (Array.from(current).length > maxLen * 1.6) {
      const cps = Array.from(current);
      // last ' ' at codepoint index <= maxLen (String.lastIndexOf semantics)
      let cut = -1;
      for (let i = Math.min(maxLen, cps.length - 1); i >= 0; i--) {
        if (cps[i] === ' ') { cut = i; break; }
      }
      const pushLen = cut > 0 ? cut : maxLen;
      chunks.push(trimClassic(cps.slice(0, pushLen).join('')));
      current = trimClassic(cps.slice(pushLen).join(''));
    }
  }
  const rest = trimClassic(current);
  if (rest) chunks.push(rest);
  return chunks;
}

/** Values with no letters at all ("$500/month") need no translation. */
export function isSymbolic(text: string): boolean {
  return !/\p{L}/u.test(text);
}

/** Some models ignore the JSON contract and answer in plain prose. */
export function parseChunkReply(raw: string): string | null {
  if (!raw) return null;
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as { t?: unknown };
      if (typeof parsed.t === 'string') return parsed.t.trim() || null;
    } catch { /* fall through */ }
  }
  // A broken JSON-shaped response is never a usable translation. Treating
  // it as prose could publish raw protocol text as the public translation.
  if (/^(?:\{|\[)/.test(text)) return null;
  if (text && text.length > 1 && !/^null$/i.test(text)) return text;
  return null;
}


/** Persian (۰-۹) and Arabic-Indic (٠-٩) digits → ASCII, for integrity checks. */
export function normalizeDigits(s: string): string {
  // Currency/percent punctuation that legitimately localizes in RTL output:
  // Arabic percent sign, Arabic decimal separator, Arabic thousands separator.
  // Unicode space variants fold to ASCII space so the regex boundaries match
  // the SQL twin (aria_tgw_normalize_digits) byte for byte.
  s = s.replace(/٪/g, '%').replace(/٫/g, '.').replace(/،/g, ',');
  s = s.replace(/[\u00a0\u202f\u2002\u2003\u2007\u2009]/g, ' ');
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const i = fa.indexOf(d);
    return String(i >= 0 ? i : ar.indexOf(d));
  });
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/**
 * Numbers that carry meaning: money, percentages, ages, years, vacancy-style
 * ids and single-digit requirements. Compared as exact numeric tokens so
 * localized punctuation (۱۰,۰۰۰ / ۵۰٪) never triggers a false rejection.
 * A lost or changed number rejects the translation for retry — it never
 * reaches the public fields.
 */
const CRITICAL_NUMBER_RE = /\d+(?:[.,]\d+)*/g;

export function validateIntegrity(source: string, result: string): string[] {
  const problems: string[] = [];
  const src = normalizeDigits(source);
  const out = normalizeDigits(result);

  const srcUrls = (src.match(URL_RE) || []).map((u) => u.replace(/[.,)]+$/, ''));
  const outUrls = (out.match(URL_RE) || []).map((u) => u.replace(/[.,)]+$/, ''));
  for (const u of srcUrls) {
    if (!outUrls.includes(u)) problems.push(`URL lost/changed: ${u}`);
  }
  const srcEmails = src.match(EMAIL_RE) || [];
  for (const e of srcEmails) {
    if (!out.includes(e)) problems.push(`email lost/changed: ${e}`);
  }
  // Compare numbers on separator/currency-stripped forms: translators
  // legitimately localize "$10,000" as "۱۰,۰۰۰ دالر" — the AMOUNT must
  // survive, not the ASCII punctuation.
  const stripNum = (x: string) => x.replace(/,/g, '');
  const outNums = new Set((out.match(CRITICAL_NUMBER_RE) || []).map(stripNum));
  const srcNums = (src.match(CRITICAL_NUMBER_RE) || []).map(stripNum);
  for (const n of new Set(srcNums)) {
    if (!outNums.has(n)) {
      problems.push(`critical number lost/changed: ${n}`);
    }
  }
  return problems;
}

/** Sanity-check a translation: non-empty, letter-bearing, sane length ratio. */
export function validateTranslation(source: string, result: string): boolean {
  const out = result.trim();
  if (!out) return false;
  if (!/\p{L}/u.test(out)) return false;
  if (out.toLowerCase() === source.trim().toLowerCase() && source.length > 40) return false;
  const ratio = out.length / Math.max(1, source.trim().length);
  if (source.trim().length > 200) {
    // Persian/Pashto is typically 0.35–0.9× the English length.
    if (ratio < 0.18) return false;
    if (ratio > 4) return false;
  } else if (source.trim().length > 40) {
    if (ratio < 0.25 || ratio > 5) return false;
  }
  return true;
}
