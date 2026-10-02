/**
 * Deterministic Afghanistan geography normalization.
 *
 * Scrapers send free-text locations ("Kabul", "Nangarhar, Nuristan",
 * "Sar-e-Pul", "Ghowr"). This module is the single canonical source of truth:
 * 34 provinces + documented aliases. NO LLM involvement — normalization must
 * never guess. Anything that does not match the whitelist stays unparsed and
 * is preserved verbatim as rawLabel.
 */

export interface ParsedLocation {
  provinces: string[]; // canonical province names, in source order, deduped
  city: string | null;
  rawLabel: string; // original string, for auditability
}

/** The 34 provinces of Afghanistan, canonical spellings. */
export const AF_PROVINCES = [
  'Badakhshan', 'Badghis', 'Baghlan', 'Balkh', 'Bamyan', 'Daykundi',
  'Farah', 'Faryab', 'Ghazni', 'Ghor', 'Helmand', 'Herat', 'Jowzjan',
  'Kabul', 'Kandahar', 'Kapisa', 'Khost', 'Kunar', 'Kunduz', 'Laghman',
  'Logar', 'Maidan Wardak', 'Nangarhar', 'Nimruz', 'Nuristan', 'Paktia',
  'Paktika', 'Panjshir', 'Parwan', 'Samangan', 'Sar-e Pol', 'Takhar',
  'Uruzgan', 'Zabul',
] as const;

export type AfghanProvince = (typeof AF_PROVINCES)[number];

const PROVINCE_SET = new Set<string>(AF_PROVINCES.map((p) => p.toLowerCase()));

/**
 * Alternate spellings seen in source feeds and historic data → canonical.
 * Keys are lowercase.
 */
const ALIASES: Record<string, AfghanProvince> = {
  'ghowr': 'Ghor',
  'ghur': 'Ghor',
  'oruzgan': 'Uruzgan',
  'uruzgan': 'Uruzgan',
  'panjsher': 'Panjshir',
  'panjshir': 'Panjshir',
  'panjsher valley': 'Panjshir',
  'wardak': 'Maidan Wardak',
  'maidan wardak': 'Maidan Wardak',
  'maidan wardag': 'Maidan Wardak',
  'wardag': 'Maidan Wardak',
  'sar-e pul': 'Sar-e Pol',
  'sar-e-pul': 'Sar-e Pol',
  'sare pol': 'Sar-e Pol',
  'sar-e pol': 'Sar-e Pol',
  'sari pul': 'Sar-e Pol',
  'saripul': 'Sar-e Pol',
  'sarepol': 'Sar-e Pol',
  'sar e pol': 'Sar-e Pol',
  'sar-e pol province': 'Sar-e Pol',
  'nangrahar': 'Nangarhar',
  'nangarhar': 'Nangarhar',
  'juzjan': 'Jowzjan',
  'jawzjan': 'Jowzjan',
  'jowzjan': 'Jowzjan',
  'daikundi': 'Daykundi',
  'daykundi': 'Daykundi',
  'daykundi province': 'Daykundi',
  'bamian': 'Bamyan',
  'bamyan': 'Bamyan',
  'bamiyan': 'Bamyan',
  'kapisa': 'Kapisa',
  'kapesa': 'Kapisa',
  'nimroz': 'Nimruz',
  'nimruz': 'Nimruz',
  'nemruz': 'Nimruz',
  'paktya': 'Paktia',
  'paktia': 'Paktia',
  'paktiya': 'Paktia',
  'paktika': 'Paktika',
  'khost': 'Khost',
  'kunar': 'Kunar',
  'kunarr': 'Kunar',
  'nooristan': 'Nuristan',
  'nurestan': 'Nuristan',
  'nuristan': 'Nuristan',
  'laghman': 'Laghman',
  'logar': 'Logar',
  'lowgar': 'Logar',
  'takhar': 'Takhar',
  'samangan': 'Samangan',
  'parwan': 'Parwan',
  'parvan': 'Parwan',
  'baghlan': 'Baghlan',
  'badghis': 'Badghis',
  'badakhshan': 'Badakhshan',
  'badakshan': 'Badakhshan',
  'farah': 'Farah',
  'faryab': 'Faryab',
  'ghazni': 'Ghazni',
  'helmand': 'Helmand',
  'helmund': 'Helmand',
  'herat': 'Herat',
  'kabul': 'Kabul',
  'kabul city': 'Kabul',
  'kandahar': 'Kandahar',
  'qandahar': 'Kandahar',
  'kunduz': 'Kunduz',
  'qunduz': 'Kunduz',
  'kunarha': 'Kunar',
  'zabul': 'Zabul',
  'khost province': 'Khost',
  'herat province': 'Herat',
  'kabul province': 'Kabul',
  'nangarhar province': 'Nangarhar',
  'balkh province': 'Balkh',
  'kandahar province': 'Kandahar',
};

/** Token prefixes that never indicate a province ("Kabul City" etc.). */
const NOISE_WORDS = new Set(['province', 'afghanistan', 'city', 'region']);

function canon(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Resolve one free-text token to a canonical province, or null. */
export function normalizeProvince(raw: string | null | undefined): AfghanProvince | null {
  if (!raw) return null;
  const key = canon(raw);
  if (!key) return null;
  if (ALIASES[key]) return ALIASES[key];
  if (PROVINCE_SET.has(key)) {
    // canonical key — map back to the canonical spelling
    return AF_PROVINCES.find((p) => p.toLowerCase() === key) ?? null;
  }
  // "X Province" / "Kabul City" patterns
  const stripped = key
    .split(' ')
    .filter((w) => !NOISE_WORDS.has(w))
    .join(' ')
    .trim();
  if (stripped && stripped !== key) return normalizeProvince(stripped);
  return null;
}

/**
 * Parse a free-text location string that may hold one province, several
 * ("Kabul, Logar"), or "city, country" shapes. Returns canonical provinces in
 * source order plus a possible city (the first token that is not a province
 * and not a country name).
 */
export function parseLocationString(raw: string | null | undefined): ParsedLocation {
  const rawLabel = (raw || '').trim();
  const out: ParsedLocation = { provinces: [], city: null, rawLabel };
  if (!rawLabel) return out;

  const tokens = rawLabel
    .split(/[,;&/]| and /i)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const province = normalizeProvince(token);
    if (province) {
      if (!out.provinces.includes(province)) out.provinces.push(province);
      continue;
    }
    // Non-province, non-country token that looks like a place name (e.g. a
    // city like "Mazar-i-Sharif" or "Jalalabad") — record the first one only.
    const bare = canon(token);
    if (
      !out.city &&
      bare.length >= 3 &&
      bare !== 'afghanistan' &&
      !isKnownCountry(token) &&
      !NOISE_WORDS.has(bare) &&
      !/^\d/.test(bare)
    ) {
      out.city = token.replace(/\s+/g, ' ').trim();
    }
  }
  return out;
}

/**
 * Small known-country list used as a guard: `country` must stay a country.
 * Deliberately compact — the main catalog is Afghanistan-centric.
 */
const KNOWN_COUNTRIES = new Set(
  [
    'afghanistan', 'united states', 'usa', 'united kingdom', 'canada',
    'germany', 'turkey', 'türkiye', 'iran', 'pakistan', 'india', 'china',
    'japan', 'australia', 'france', 'netherlands', 'belgium', 'sweden',
    'norway', 'denmark', 'finland', 'switzerland', 'austria', 'italy',
    'spain', 'portugal', 'poland', 'czech republic', 'romania', 'hungary',
    'russia', 'ukraine', 'kazakhstan', 'uzbekistan', 'tajikistan',
    'turkmenistan', 'kyrgyzstan', 'azerbaijan', 'georgia', 'armenia',
    'iraq', 'syria', 'jordan', 'lebanon', 'israel', 'saudi arabia',
    'united arab emirates', 'uae', 'qatar', 'kuwait', 'oman', 'bahrain',
    'yemen', 'egypt', 'morocco', 'tunisia', 'algeria', 'libya', 'sudan',
    'ethiopia', 'kenya', 'uganda', 'tanzania', 'nigeria', 'ghana',
    'south africa', 'brazil', 'argentina', 'chile', 'colombia', 'mexico',
    'indonesia', 'malaysia', 'singapore', 'philippines', 'thailand',
    'vietnam', 'bangladesh', 'sri lanka', 'nepal', 'bhutan', 'maldives',
    'south korea', 'korea', 'north korea', 'new zealand', 'ireland',
    'greece', 'bulgaria', 'serbia', 'croatia', 'slovakia', 'slovenia',
    'estonia', 'latvia', 'lithuania', 'moldova', 'belarus', 'albania',
    'bosnia and herzegovina', 'north macedonia', 'montenegro', 'kosovo',
    'malta', 'cyprus', 'luxembourg', 'iceland', 'monaco', 'andorra',
    'san marino', 'liechtenstein', 'vatican city', 'somalia', 'djibouti',
    'eritrea', 'rwanda', 'burundi', 'malawi', 'zambia', 'zimbabwe',
    'mozambique', 'botswana', 'namibia', 'angola', 'congo',
    'democratic republic of the congo', 'cameroon', 'chad', 'niger',
    'mali', 'mauritania', 'senegal', 'gambia', 'guinea', 'sierra leone',
    'liberia', 'cote divoire', "côte d'ivoire", 'burkina faso', 'togo',
    'benin', 'gabon', 'central african republic', 'south sudan',
  ].map((c) => c)
);

/** True when the value plausibly IS a country (or matches an alias of one). */
export function isKnownCountry(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const key = canon(raw);
  if (!key) return false;
  if (key === 'uk' || key === 'u.k.' || key === 'u.s.' || key === 'us') return true;
  if (KNOWN_COUNTRIES.has(key)) return true;
  // "Kabul, Afghanistan" style — last token decides
  const tokens = key.split(',').map((t) => t.trim());
  return tokens.length > 1 && (KNOWN_COUNTRIES.has(tokens[tokens.length - 1]) || ['uk', 'u.k.', 'us', 'u.s.'].includes(tokens[tokens.length - 1]));
}

/**
 * Guard used by the importer: returns a clean country value only when the
 * input really is a country; provinces/cities never leak into `country`.
 * If a known Afghan province arrives in the country slot, the caller should
 * treat it as a location instead (helper below).
 */
export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  if (!isKnownCountry(trimmed)) return null; // NOT a country — caller decides
  // "Kabul, Afghanistan" style — the country is the last comma segment.
  const segments = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  const value = segments[segments.length - 1] || trimmed;
  const key = canon(value);
  if (key === 'uk' || key === 'u.k.') return 'United Kingdom';
  if (key === 'us' || key === 'u.s.') return 'United States';
  if (key === 'usa') return 'United States';
  if (key === 'uae') return 'United Arab Emirates';
  if (key === 'türkiye') return 'Turkey';
  if (key === 'korea') return 'South Korea';
  if (key === 'united states of america') return 'United States';
  // Title-case multi-token countries ("united states" → "United States")
  return value
    .split(' ')
    .map((w) =>
      w.length <= 3 && /^(of|the|and)$/i.test(w)
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(' ');
}

export const AFGHANISTAN = 'Afghanistan';
