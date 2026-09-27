import { describe, expect, test } from 'bun:test';
import {
  formatOpportunityLocation,
  inferCountryFromLocation,
  locationsFromListing,
  normalizeAfghanProvince,
} from '../src/lib/opportunity-location';

describe('opportunity location normalization', () => {
  test('normalizes common Afghanistan province aliases', () => {
    expect(normalizeAfghanProvince('Ghowr')).toBe('Ghor');
    expect(normalizeAfghanProvince('Oruzgan')).toBe('Uruzgan');
    expect(normalizeAfghanProvince('Panjsher')).toBe('Panjshir');
    expect(normalizeAfghanProvince('Wardak')).toBe('Maidan Wardak');
    expect(normalizeAfghanProvince('Sar-e-Pul')).toBe('Sar-e Pol');
  });

  test('persists a multi-province Afghanistan listing as separate rows', () => {
    const rows = locationsFromListing({
      title: 'Example',
      sourceUrl: 'https://example.com/1',
      sourceName: 'Example',
      country: 'Afghanistan',
      location: 'Balkh, Herat, Kabul',
    });
    expect(rows.map((r) => r.province)).toEqual(['Balkh', 'Herat', 'Kabul']);
    expect(rows.every((r) => r.country === 'Afghanistan')).toBe(true);
  });

  test('infers Afghanistan only from deterministic province evidence', () => {
    expect(inferCountryFromLocation('Kabul')).toBe('Afghanistan');
    expect(inferCountryFromLocation('Somewhere Unknown')).toBeNull();
  });

  test('formats province-aware public labels', () => {
    expect(formatOpportunityLocation([
      { country: 'Afghanistan', province: 'Balkh' },
      { country: 'Afghanistan', province: 'Herat' },
    ], 'Afghanistan')).toBe('Balkh, Herat, Afghanistan');
  });
});
