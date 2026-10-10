/** Detail summaries use complete source sentences, never card/SEO truncation. */
export interface SummaryContent {
  summary?: string | null;
  description?: string | null;
  requirements?: string | null;
  eligibility?: string | null;
  benefits?: string | null;
  responsibilities?: string | null;
  guidelines?: string | null;
}
export interface SummaryBlock { text: string; labelKey?: string }

export function summaryPlainText(raw: string): string {
  return raw
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?\s*>|<\/\s*(?:p|li|h[1-6]|div|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => { const code = Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''; })
    .replace(/[\t \r]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const clipped = (text: string) => /(?:\.{3}|…)\s*$/.test(text);
const boilerplateHeading = /^(?:about (?:the )?(?:company|organization|opportunity|job|program)|job description|description|requirements|responsibilities|eligibility|benefits|submission guidelines|هدف وظیفه|شرایط استخدام|شرح وظیفه|مسئولیت های وظیفه|د دندې موخه)\s*[:：]?$/i;

/** A soft word budget: complete sentences/lines may exceed it. Never add ellipses. */
function sourceExcerpt(raw: string, targetWords: number): string {
  const text = summaryPlainText(raw);
  const pieces: string[] = [];
  for (const line of text.split(/\n+/)) {
    const clean = line.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '').trim();
    if (!clean || boilerplateHeading.test(clean) || /^https?:\/\/\S+$/i.test(clean)) continue;
    // A boundary needs whitespace: decimals, domain names and email addresses
    // must not be split by their dots. Also supports Dari and Pashto punctuation.
    pieces.push(...clean.split(/(?<=[.!?؟۔])\s+(?!\d)/u));
  }
  const selected: string[] = [];
  for (const piece of pieces) {
    if (!piece.trim() || clipped(piece)) continue;
    selected.push(piece.trim());
    if (words(selected.join(' ')) >= targetWords) break;
  }
  return selected.join(' ').trim();
}

/** Preserve complete authored summaries; repair legacy snippets from source. */
export function buildDetailSummary(content: SummaryContent): SummaryBlock[] {
  const stored = summaryPlainText(content.summary || '');
  const description = summaryPlainText(content.description || '');
  const usableStored = !!stored && !/^https?:\/\/\S+$/i.test(stored);
  const needsRepair = !usableStored || clipped(stored) ||
    (words(stored) < 70 && words([description, content.requirements, content.eligibility, content.benefits, content.responsibilities, content.guidelines].filter(Boolean).join(' ')) > words(stored) + 25);
  if (usableStored && !needsRepair) return [{ text: stored }];

  const blocks: SummaryBlock[] = [];
  const seen = new Set<string>();
  const add = (raw: string | null | undefined, budget: number, labelKey?: string) => {
    const text = sourceExcerpt(raw || '', budget);
    const key = text.toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
    if (!key || seen.has(key) || blocks.some(b => b.text.includes(text))) return;
    seen.add(key); blocks.push({ text, ...(labelKey ? { labelKey } : {}) });
  };
  add(content.description, 75);
  add(content.requirements || content.eligibility, 55, content.requirements ? 'opportunities.requirements' : 'opportunities.eligibility');
  add(content.benefits || content.responsibilities, 45, content.benefits ? 'opportunities.benefits' : 'opportunities.responsibilities');
  add(content.guidelines, 40, 'detail.howToApply');
  // Short source material should remain short rather than invented or padded.
  return blocks.length ? blocks : usableStored ? [{ text: stored }] : [];
}

/** Used when providers are unavailable: a real overview, separate from SEO. */
export function buildSourceSummary(content: Omit<SummaryContent, 'summary'>): string {
  return buildDetailSummary(content).map(b => b.text).join('\n\n');
}
