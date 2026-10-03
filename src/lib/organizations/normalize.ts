/**
 * Conservative organization-name normalization (Phase 2).
 *
 * Design rules, in priority order:
 *  1. NEVER merge two names unless their normalized keys are EXACTLY equal or
 *     an explicit OrganizationAlias row says they are the same organization.
 *  2. Normalization is for MATCHING only — canonical display names are never
 *     rewritten (the first-seen verbatim name stays the Organization.name).
 *  3. Only high-precision transforms are applied: case, diacritics,
 *     punctuation, whitespace, parenthetical content, trailing legal-entity
 *     suffixes. In particular "CARE" and "CARE International" normalize
 *     DIFFERENTLY and stay different groups — such pairs are reported for
 *     admin review instead of merged.
 */

/** Trailing legal-entity suffixes removed for matching only (no display change). */
const LEGAL_SUFFIXES = new Set([
  'inc', 'incorporated', 'ltd', 'limited', 'llc', 'llp', 'lp', 'gmbh', 'plc',
  'corp', 'corporation', 'co', 'company', 'pvt', 'pte', 'pty', 'sarl', 'sarlu',
  'bv', 'nv', 'oy', 'ab', 'aps', 'kk', 'kg', 'ag', 'sa', 'sas', 'spa', 'srl',
]);

/** Tokens that never count as an acronym by themselves. */
const NON_ACRONYMS = new Set(['AND', 'THE', 'FOR', 'OF', 'NGO', 'ORG']);

/**
 * Conservative matching key for an organization name.
 * "  Norwegian Refugee Council (NRC) " → "norwegian refugee council"
 * "Watan-" + Co. Ltd." style suffixes are dropped; everything else survives.
 */
export function normalizeOrgName(raw?: string | null): string {
  if (!raw) return '';
  let s = String(raw)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/&/g, ' and ')
    // drop parenthetical/bracketed content: "(IRC)", "(Intl)", "[2026]" —
    // the parenthetical text is handled separately by extractAliasCandidates
    .replace(/[(\[{][^)\]}]*[)\]}]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  // strip trailing legal-entity suffixes, repeatedly ("Foo Co. Ltd." → "foo")
  for (let i = 0; i < 4; i++) {
    const tokens = s.split(' ');
    const last = tokens[tokens.length - 1];
    if (tokens.length > 1 && LEGAL_SUFFIXES.has(last)) {
      tokens.pop();
      s = tokens.join(' ').trim();
    } else {
      break;
    }
  }
  return s;
}

/** All-caps acronym shape: "IRC", "UNICEF", "AIHRC", "USAID", "DRC". */
export function isLikelyAcronym(s?: string | null): boolean {
  const t = String(s ?? '').trim().replace(/\./g, '');
  if (!t || t.length < 2 || t.length > 10) return false;
  if (NON_ACRONYMS.has(t.toUpperCase())) return false;
  return /^[A-Z][A-Z0-9&-]*$/.test(t) && /[A-Z]/.test(t) && t === t.toUpperCase();
}

/**
 * Alias candidates hidden inside a display name — REPORT-ONLY evidence, never
 * an automatic merge: the parenthetical of "International Rescue Committee
 * (IRC)" yields "IRC"; the parenthetical of "CARE (Cooperative for Assistance
 * and Relief Everywhere)" yields the expanded name as its own key.
 */
export function extractAliasCandidates(raw?: string | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const s = String(raw);
  const parenRe = /[(\[{]([^)\]}]+)[)\]}]/g;
  // key of the name with all parentheticals removed — computed ONCE with its
  // own regex instance: reusing parenRe for replace() would reset the exec
  // loop's lastIndex and hang forever on non-acronym parentheticals.
  const outerKey = normalizeOrgName(s.replace(/[(\[{][^)\]}]*[)\]}]/g, ' '));
  let m: RegExpExecArray | null;
  while ((m = parenRe.exec(s)) !== null) {
    const inner = m[1].trim();
    if (!inner) continue;
    if (isLikelyAcronym(inner)) {
      out.push(inner.toUpperCase());
    } else {
      const key = normalizeOrgName(inner);
      // only useful when the expansion differs from the outer name's key
      if (key && key !== outerKey) out.push(key);
    }
  }
  return Array.from(new Set(out));
}

/** Token set of a normalized key (for containment heuristics). */
export function tokensOf(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}

const GENERIC_SINGLETONS = new Set([
  'un', 'ngo', 'org', 'foundation', 'group', 'office', 'agency', 'ministry',
  'afghanistan', 'kabul', 'international', 'organization', 'organisation',
]);

/**
 * Heuristic REVIEW-ONLY pairing of two distinct normalized keys.
 * Deliberately narrow: token containment ("care" ⊂ "care international") or
 * an acronym candidate match ("irc" appears in the other group's aliases).
 */
export function isAmbiguousPair(
  keyA: string,
  keyB: string,
  aliasKeysA: string[],
  aliasKeysB: string[],
): 'token-containment' | 'acronym-match' | null {
  if (!keyA || !keyB || keyA === keyB) return null;
  const a = tokensOf(keyA);
  const b = tokensOf(keyB);
  if (aliasKeysA.includes(keyB) || aliasKeysB.includes(keyA)) return 'acronym-match';
  const [small, large] = a.length <= b.length ? [a, b] : [b, a];
  if (small.length >= 1 && small.every((t) => large.includes(t))) {
    // a single generic token tells us nothing ("UN" ⊂ "UN Women" is NOT evidence)
    if (small.length === 1 && GENERIC_SINGLETONS.has(small[0])) return null;
    return 'token-containment';
  }
  return null;
}
