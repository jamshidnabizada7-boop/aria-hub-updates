import type { PrismaClient } from '@prisma/client';
import type { RawListing } from '@/lib/import/types';

const AFGHAN_PROVINCES = [
  'Badakhshan','Badghis','Baghlan','Balkh','Bamyan','Daykundi','Farah','Faryab',
  'Ghazni','Ghor','Helmand','Herat','Jawzjan','Kabul','Kandahar','Kapisa','Khost',
  'Kunar','Kunduz','Laghman','Logar','Maidan Wardak','Nangarhar','Nimruz','Nuristan',
  'Paktia','Paktika','Panjshir','Parwan','Samangan','Sar-e Pol','Takhar','Uruzgan','Zabul',
] as const;

const AFGHAN_ALIAS = new Map<string, string>([
  ['badakshan','Badakhshan'],['badghis','Badghis'],['baghlan','Baghlan'],['balkh','Balkh'],
  ['bamian','Bamyan'],['bamyan','Bamyan'],['daikundi','Daykundi'],['daykundi','Daykundi'],
  ['farah','Farah'],['faryab','Faryab'],['ghazni','Ghazni'],['ghor','Ghor'],['ghowr','Ghor'],
  ['helmand','Helmand'],['herat','Herat'],['jawzjan','Jawzjan'],['jowzjan','Jawzjan'],
  ['kabul','Kabul'],['kandahar','Kandahar'],['kapisa','Kapisa'],['khost','Khost'],
  ['kunar','Kunar'],['kunduz','Kunduz'],['lghman','Laghman'],['laghman','Laghman'],
  ['logar','Logar'],['maidan wardak','Maidan Wardak'],['wardak','Maidan Wardak'],
  ['nangarhar','Nangarhar'],['nimroz','Nimruz'],['nimruz','Nimruz'],['nuristan','Nuristan'],
  ['paktia','Paktia'],['paktya','Paktia'],['paktika','Paktika'],['panjshir','Panjshir'],
  ['panjsher','Panjshir'],['parwan','Parwan'],['samangan','Samangan'],['sar-e pol','Sar-e Pol'],
  ['sar e pol','Sar-e Pol'],['sar-e-pul','Sar-e Pol'],['sar e pul','Sar-e Pol'],['takhar','Takhar'],
  ['uruzgan','Uruzgan'],['urozgan','Uruzgan'],['oruzgan','Uruzgan'],['zabul','Zabul'],
]);

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/\bprovince\b/g, '')
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[-,\s]+|[-,\s]+$/g, '')
    .trim();
}

export function normalizeAfghanProvince(input: string | null | undefined): string | null {
  if (!input) return null;
  return AFGHAN_ALIAS.get(normalizeKey(input)) ?? null;
}

export function afghanProvinceNames(): readonly string[] {
  return AFGHAN_PROVINCES;
}

export function inferCountryFromLocation(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const pieces = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (pieces.some((p) => normalizeAfghanProvince(p))) return 'Afghanistan';
  const last = pieces.at(-1) || '';
  if (/^afghanistan$/i.test(last)) return 'Afghanistan';
  return null;
}

export interface NormalizedOpportunityLocation {
  country: string;
  countryCode: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  rawLabel: string | null;
  provenance: 'source' | 'deterministic' | 'admin' | 'inferred';
  confidence: number;
}

function uniqueLocations(rows: NormalizedOpportunityLocation[]): NormalizedOpportunityLocation[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [row.country,row.province || '',row.city || '',row.district || ''].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function locationsFromListing(listing: RawListing): NormalizedOpportunityLocation[] {
  const country = (listing.country || inferCountryFromLocation(listing.location) || '').trim();
  const raw = (listing.location || '').trim();

  if (!country && !raw) return [];

  if (/^afghanistan$/i.test(country)) {
    const pieces = raw
      .replace(/,?\s*Afghanistan\s*$/i, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const provinces = pieces
      .map((piece) => ({ raw: piece, province: normalizeAfghanProvince(piece) }))
      .filter((x): x is { raw: string; province: string } => Boolean(x.province));

    if (provinces.length) {
      return uniqueLocations(provinces.map((p) => ({
        country: 'Afghanistan',
        countryCode: 'AF',
        province: p.province,
        city: null,
        district: null,
        rawLabel: raw || p.raw,
        provenance: 'source',
        confidence: 1,
      })));
    }

    return [{
      country: 'Afghanistan',
      countryCode: 'AF',
      province: null,
      city: null,
      district: null,
      rawLabel: raw || null,
      provenance: raw ? 'source' : 'deterministic',
      confidence: raw ? 0.9 : 1,
    }];
  }

  return [{
    country: country || raw,
    countryCode: null,
    province: null,
    city: raw && raw.toLowerCase() !== country.toLowerCase() ? raw : null,
    district: null,
    rawLabel: raw || null,
    provenance: 'source',
    confidence: 1,
  }];
}

export async function syncOpportunityLocations(
  db: PrismaClient,
  opportunityId: string,
  listing: RawListing,
): Promise<void> {
  const rows = locationsFromListing(listing);
  if (!rows.length) return;

  await db.$transaction(async (tx) => {
    await tx.opportunityLocation.deleteMany({
      where: { opportunityId, provenance: { not: 'admin' } },
    });
    await tx.opportunityLocation.createMany({
      data: rows.map((row) => ({ opportunityId, ...row })),
    });
  });
}

export function formatOpportunityLocation(
  locations: Array<{ country: string; province: string | null; city?: string | null }>,
  fallbackCountry?: string | null,
): string {
  if (!locations.length) return fallbackCountry || '';

  const countries = [...new Set(locations.map((l) => l.country).filter(Boolean))];
  const provinces = [...new Set(locations.map((l) => l.province).filter((v): v is string => Boolean(v)))];

  if (countries.length === 1 && countries[0] === 'Afghanistan' && provinces.length) {
    return provinces.join(', ') + ', Afghanistan';
  }

  if (locations.length === 1) {
    const l = locations[0];
    return [l.city, l.province, l.country].filter(Boolean).join(', ');
  }

  return countries.join(', ') || fallbackCountry || '';
}
