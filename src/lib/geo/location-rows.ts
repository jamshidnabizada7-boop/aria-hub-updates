/**
 * Pure RawListing → structured-location derivation.
 *
 * Used by the import orchestrator (live imports) and the location backfill
 * script (existing rows) so both produce identical OpportunityLocation rows.
 * Deterministic only — a province is never invented.
 */
import {
  AFGHANISTAN,
  normalizeCountry,
  normalizeProvince,
  parseLocationString,
} from './provinces';

/** Minimal shape of a listing needed here (avoids importing import/types). */
export interface LocationListingLike {
  location?: string | null;
  provinces?: string[] | null;
  country?: string | null;
}

/**
 * `country` must stay a country — never a province or city. Returns the
 * normalized country, or Afghanistan when a known Afghan province was fed
 * into the country slot (it belongs to locations, but the record is still an
 * Afghan opportunity), or null when nothing country-like is known.
 */
export function resolveCountry(listing: LocationListingLike): string | null {
  const normalized = normalizeCountry(listing.country);
  if (normalized) return normalized;
  if (listing.country && parseLocationString(listing.country).provinces.length) return AFGHANISTAN;
  return null;
}

/** One structured location row derived from a listing. */
export interface LocationRowInput {
  country: string | null;
  countryCode: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  rawLabel: string;
  source: string;
  confidence: number;
}

const COUNTRY_CODES: Record<string, string> = { afghanistan: 'AF' };

function countryCodeFor(country: string | null): string | null {
  if (!country) return null;
  return COUNTRY_CODES[country.toLowerCase()] ?? null;
}

/**
 * Structured locations from a listing. Provinces from `listing.provinces`
 * (structured source field), then parsed out of `listing.location`, then a
 * province that wrongly arrived in `listing.country`. Unknown free-text
 * places are kept as city-level rows — a province is NEVER invented.
 */
export function buildLocationRows(listing: LocationListingLike): LocationRowInput[] {
  const country = resolveCountry(listing);
  const rows: LocationRowInput[] = [];
  const push = (
    province: string | null,
    city: string | null,
    rawLabel: string,
    source: string,
    confidence: number,
  ) => {
    const key = `${(province || '').toLowerCase()}|${(city || '').toLowerCase()}`;
    if (!province && !city) return;
    if (rows.some((r) => `${(r.province || '').toLowerCase()}|${(r.city || '').toLowerCase()}` === key)) return;
    rows.push({
      country,
      countryCode: countryCodeFor(country),
      province,
      city: city || null,
      district: null,
      rawLabel: rawLabel.slice(0, 300),
      source,
      confidence,
    });
  };

  for (const p of listing.provinces || []) {
    const canonical = normalizeProvince(p);
    if (canonical) push(canonical, null, p, 'scraper', 1);
  }

  if (listing.location) {
    const parsed = parseLocationString(listing.location);
    if (parsed.provinces.length) {
      for (const p of parsed.provinces) push(p, parsed.city, listing.location, 'scraper', 1);
    } else if (parsed.city && parsed.city.length <= 80) {
      // Unknown place name (e.g. "Mazar-i-Sharif") — keep as city, never guess a province.
      push(null, parsed.city, listing.location, 'scraper', 0.7);
    }
  }

  const provinceInCountry = listing.country
    ? parseLocationString(listing.country).provinces
    : [];
  for (const p of provinceInCountry) {
    push(p, null, listing.country as string, 'scraper', 1);
  }

  return rows;
}
