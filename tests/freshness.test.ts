/**
 * Phase 16 — freshness & update detection.
 * Pure logic: no db, no network.
 */
import { describe, test, expect } from 'bun:test';

const { detectChanges, explicitCloseStatus } = await import('../src/lib/import/freshness');
import type { RawListing } from '../src/lib/import/types';

const base: RawListing = {
  title: 'Programme Officer', sourceName: 'Acted Vacancies',
  sourceUrl: 'https://www.acted.org/en/jobs/po/', description: 'Original description.',
};

describe('explicitCloseStatus', () => {
  test('honors ONLY the machine signal in extractedData.listingStatus', () => {
    expect(explicitCloseStatus({ ...base, extractedData: { listingStatus: 'closed' } })).toBe('expired');
    expect(explicitCloseStatus({ ...base, extractedData: { listingStatus: 'Expired' } })).toBe('expired');
    expect(explicitCloseStatus({ ...base, extractedData: { listingStatus: 'inactive' } })).toBe('expired');
    expect(explicitCloseStatus({ ...base, extractedData: { listingStatus: 'open' } })).toBeNull();
    expect(explicitCloseStatus({ ...base })).toBeNull();
  });

  test('deadline text like "application deadline expired?" never closes', () => {
    // the signal must come from the structured field, not prose
    expect(explicitCloseStatus({ ...base, description: 'The application deadline has expired.' })).toBeNull();
  });
});

describe('detectChanges', () => {
  const existing = {
    title: 'Programme Officer',
    description: 'Original description.',
    deadline: new Date('2026-12-31T00:00:00Z'),
    applyUrl: 'https://www.acted.org/en/jobs/po/',
    salary: '1000 USD',
    country: 'Afghanistan',
    requirements: 'Three years of experience.',
  };

  test('unchanged listing produces no changes', () => {
    expect(detectChanges(existing, { ...base, deadline: '2026-12-31', applyUrl: existing.applyUrl, salary: '1000 USD', country: 'Afghanistan', requirements: 'Three years of experience.' })).toEqual([]);
  });

  test('deadline extension is named distinctly from a deadline change', () => {
    const extended = detectChanges(existing, { ...base, deadline: '2027-01-31' });
    expect(extended).toContain('deadline-extended');
    expect(extended).not.toContain('deadline-changed');

    const moved = detectChanges(existing, { ...base, deadline: '2026-12-15' });
    expect(moved).toContain('deadline-changed');
    expect(moved).not.toContain('deadline-extended');
  });

  test('apply URL change (normalized), salary, requirements and description changes detected', () => {
    const unchanged: RawListing = {
      ...base, deadline: '2026-12-31', applyUrl: existing.applyUrl, salary: '1000 USD',
      country: 'Afghanistan', requirements: 'Three years of experience.',
    };
    // tracking params are normalized away → NOT a change
    expect(detectChanges(existing, { ...unchanged, applyUrl: 'https://www.acted.org/en/jobs/po/?utm_source=x' })).toEqual([]);

    const real = detectChanges(existing, {
      ...unchanged, applyUrl: 'mailto:jobs@acted.org', salary: '1200 USD',
      requirements: 'Five years of experience.', description: 'Updated description.',
    });
    expect(real).toContain('apply-url-changed');
    expect(real).toContain('salary-changed');
    expect(real).toContain('requirements-changed');
    expect(real).toContain('description-updated');
  });

  test('title change detected (normalized comparison)', () => {
    const changes = detectChanges(existing, { ...base, title: 'programme  officer!' });
    expect(changes).not.toContain('title-changed'); // same normalized
    expect(detectChanges(existing, { ...base, title: 'Senior Programme Officer' })).toContain('title-changed');
  });
});
