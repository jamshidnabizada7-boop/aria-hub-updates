import type { PrismaClient } from '@prisma/client';
import type { RawListing } from '@/lib/import/types';

export const AFGHANISTAN_PROVINCES = [
  'Badakhshan','Badghis','Baghlan','Balkh','Bamyan','Daykundi','Farah','Faryab',
  'Ghazni','Ghor','Helmand','Herat','Jowzjan','Kabul','Kandahar','Kapisa','Khost',
  'Kunar','Kunduz','Laghman','Logar','Nangarhar','Nimruz','Nuristan','Paktia',
  'Paktika','Panjshir','Parwan','Samangan','Sar-e Pol','Takhar','Uruzgan',
  'Maidan Wardak','Zabul',
] as const;

const AFGHAN_PROVINCE_ALIASES: Record<string, string> = {
  'badakhshan':'Badakhshan','badghis':'Badghis','baghlan':'Baghlan','balkh':'Balkh',
  'bamian':'Bamyan','bamyan':'Bamyan','daikundi':'Daykundi','daykundi':'Daykundi',
  'farah':'Farah','faryab':'Faryab','ghazni':'Ghazni','ghor':'Ghor','ghowr':'Ghor',
  'helmand':'Helmand','herat':'Herat','jawzjan':'Jowzjan','jowzjan':'Jowzjan',
  'kabul':'Kabul','kandahar':'Kandahar','kapisa':'Kapisa','khost':'Khost',
  'kunar':'Kunar','kunduz':'Kunduz','laghman':'Laghman','logar':'Logar',
  'nangarhar':'Nangarhar','nimroz':'Nimruz','nimruz':'Nimruz','nuristan':'Nuristan',
  'paktia':'Paktia','paktya':'Paktia','paktika':'Paktika','panjshir':'Panjshir',
  'panjsher':'Panjshir','parwan':'Parwan','samangan':'Samangan','sar-e pol':'Sar-e Pol',
  'sar-e-pol':'Sar-e Pol','sar e pol':'Sar-e Pol','saripul':'Sar-e Pol',
  'takhar':'Takhar','uruzgan':'Uruzgan','oruzgan':'Uruzgan','urozgan':'Uruzgan',
  'wardak':'Maidan Wardak','maidan wardak':'Maidan Wardak','maydan wardak':'Maidan Wardak',
  'zabul':'Zabul',
};

function cleanPart(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[-–—•,;:\s]+|[-–—•,;:\s]+$/g, '').trim();
}

export function normalizeAfghanistanProvince(value: string | null | undefined): string | null {
  if (!value) return null;
  return AFGHAN_PROVINCE_ALIASES[cleanPart(value).toLowerCase()] || null;
}

export function inferOpportunityCountry(
  explicitCountry: string | null | undefined,
  rawLocation: string | null | undefined,
): string | null {
  if (explicitCountry?.trim()) return explicitCountry.trim();
  const raw = cleanPart(rawLocation || '');
  if (!raw) return null;
  if (raw.toLowerCase().includes('afghanistan')) return 'Afghanistan';
  const parts = raw.split(/[,;/|]+/).map(cleanPart).filter(Boolean);
  if (parts.some((part) => normalizeAfghanistanProvince(part))) return 'Afghanistan';
  return null;
}
export interface NormalizedOpportunityLocation {
  country: string | null;
  countryCode: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  rawLabel: string;
  source: string;
  confidence: number;
}

export function parseOpportunityLocations(
  rawLocation: string | null | undefined,
  explicitCountry: string | null | undefined,
  source = 'scraper',
): NormalizedOpportunityLocation[] {
  const raw = cleanPart(rawLocation || '');
  if (!raw) return [];
  const country = inferOpportunityCountry(explicitCountry, raw);
  const isAfghanistan = (country || '').toLowerCase() === 'afghanistan';
  const parts = raw.replace(/\bafghanistan\b/gi, '').split(/[,;/|]+/).map(cleanPart).filter(Boolean);

  const out = parts.map((part): NormalizedOpportunityLocation => {
    const province = isAfghanistan ? normalizeAfghanistanProvince(part) : null;
    return {
      country,
      countryCode: isAfghanistan ? 'AF' : null,
      province,
      city: province ? null : part || null,
      district: null,
      rawLabel: part,
      source,
      confidence: province ? 1 : country ? 0.9 : 0.7,
    };
  });

  const seen = new Set<string>();
  return out.filter((loc) => {
    const key = [loc.country, loc.province, loc.city, loc.rawLabel].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recoverRawLocation(listing: RawListing): { value: string | null; source: string } {
  if (listing.location?.trim()) return { value: listing.location.trim(), source: 'scraper-location' };

  const extracted = listing.extractedData && typeof listing.extractedData === 'object'
    ? listing.extractedData as Record<string, unknown>
    : {};
  for (const key of ['Location', 'location', 'Province', 'Provinces', 'province', 'provinces', 'City', 'city']) {
    const value = extracted[key];
    if (typeof value === 'string' && value.trim()) return { value: value.trim(), source: 'extractedData.' + key };
    if (Array.isArray(value)) {
      const joined = value.map(String).map(cleanPart).filter(Boolean).join(', ');
      if (joined) return { value: joined, source: 'extractedData.' + key };
    }
  }

  if ((listing.country || '').toLowerCase() === 'afghanistan') {
    const desc = (listing.description || '').replace(/<[^>]+>/g, ' ');
    const m = desc.match(/(?:^|\n)\s*Location\s*:\s*([^\n]+)/i);
    if (m?.[1]) return { value: m[1].trim(), source: 'description-location-line' };

    const lowerTitle = (listing.title || '').toLowerCase();
    for (const province of AFGHANISTAN_PROVINCES) {
      if (lowerTitle.includes(province.toLowerCase())) {
        return { value: province, source: 'title-province-whitelist' };
      }
    }
  }
  return { value: null, source: 'none' };
}

export async function syncOpportunityLocations(
  db: PrismaClient,
  opportunityId: string,
  listing: RawListing,
): Promise<void> {
  const recovered = recoverRawLocation(listing);
  if (!recovered.value) return;

  const normalized = parseOpportunityLocations(recovered.value, listing.country || null, recovered.source);
  await db.$transaction(async (tx) => {
    await tx.opportunityLocation.deleteMany({
      where: { opportunityId, source: { not: 'admin' } },
    });
    for (const loc of normalized) {
      await tx.opportunityLocation.upsert({
        where: {
          opportunityId_country_province_city_rawLabel: {
            opportunityId,
            country: loc.country || '',
            province: loc.province || '',
            city: loc.city || '',
            rawLabel: loc.rawLabel,
          },
        },
        create: {
          opportunityId,
          country: loc.country || '',
          countryCode: loc.countryCode,
          province: loc.province || '',
          city: loc.city || '',
          district: loc.district,
          rawLabel: loc.rawLabel,
          source: loc.source,
          confidence: loc.confidence,
        },
        update: {
          countryCode: loc.countryCode,
          district: loc.district,
          source: loc.source,
          confidence: loc.confidence,
        },
      });
    }
  });
}

export function displayOpportunityLocation(
  country: string | null | undefined,
  locations: Array<{ province?: string | null; city?: string | null }> | null | undefined,
): string {
  const labels = (locations || []).map((l) => l.province || l.city || '').map(cleanPart).filter(Boolean);
  const unique = [...new Set(labels)];
  if (unique.length && country) return unique.join(', ') + ' — ' + country;
  if (unique.length) return unique.join(', ');
  return country || '';
}
