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

/** Split text into ordered chunks on paragraph/line boundaries. */
export function chunkText(text: string, maxLen = CHUNK_SIZE): string[] {
  const clean = text.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= maxLen) return clean ? [clean] : [];
  const chunks: string[] = [];
  let current = '';
  for (const para of clean.split('\n')) {
    if ((current + '\n' + para).trim().length > maxLen && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n${para}` : para;
    }
    // Single oversized line — hard split on spaces so nothing is lost.
    while (current.length > maxLen * 1.6) {
      const cut = current.lastIndexOf(' ', maxLen);
      chunks.push(current.slice(0, cut > 0 ? cut : maxLen).trim());
      current = current.slice(cut > 0 ? cut : maxLen).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());
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
