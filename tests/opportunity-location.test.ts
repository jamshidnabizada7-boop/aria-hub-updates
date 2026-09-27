import { describe, expect, test } from 'bun:test';
import {
  displayOpportunityLocation,
  normalizeAfghanistanProvince,
  parseOpportunityLocations,
} from '../src/lib/opportunity-location';

describe('opportunity locations', () => {
  test('normalizes common Afghanistan aliases', () => {
    expect(normalizeAfghanistanProvince('Ghowr')).toBe('Ghor');
    expect(normalizeAfghanistanProvince('Oruzgan')).toBe('Uruzgan');
    expect(normalizeAfghanistanProvince('Panjsher')).toBe('Panjshir');
    expect(normalizeAfghanistanProvince('Wardak')).toBe('Maidan Wardak');
  });

  test('keeps all provinces on multi-province opportunities', () => {
    const rows = parseOpportunityLocations('Balkh, Herat, Kabul', 'Afghanistan');
    expect(rows.map((row) => row.province)).toEqual(['Balkh', 'Herat', 'Kabul']);
  });

  test('does not invent a province for unknown labels', () => {
    const rows = parseOpportunityLocations('Remote', 'Afghanistan');
    expect(rows).toHaveLength(1);
    expect(rows[0].province).toBeNull();
    expect(rows[0].city).toBe('Remote');
  });

  test('renders province before country when known', () => {
    expect(displayOpportunityLocation('Afghanistan', [{ province: 'Kabul' }]))
      .toBe('Kabul — Afghanistan');
    expect(displayOpportunityLocation('Afghanistan', [])).toBe('Afghanistan');
  });
});
