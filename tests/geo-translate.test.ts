/**
 * Tests for the province/location normalization, apply-link classification,
 * and the translation chunk engine's pure logic.
 *
 * Run: bun test tests/geo-translate.test.ts
 */
import { describe, expect, test } from 'bun:test';

import {
  AF_PROVINCES,
  normalizeProvince,
  parseLocationString,
  normalizeCountry,
  isKnownCountry,
} from '../src/lib/geo/provinces';
import { buildLocationRows, resolveCountry } from '../src/lib/geo/location-rows';
import { classifyApplyUrl, isRealApplyLink } from '../src/lib/apply';
import { extractRealApplyLink } from '../src/lib/apply-extract';
import { chunkText, validateTranslation, parseChunkReply, isSymbolic } from '../src/lib/ai/translate-chunks';

// ─── provinces ───────────────────────────────────────────────────────────────

describe('normalizeProvince', () => {
  test('canonical 34 provinces resolve to themselves', () => {
    expect(AF_PROVINCES).toHaveLength(34);
    for (const p of AF_PROVINCES) {
      expect(normalizeProvince(p)).toBe(p);
    }
  });

  test('documented aliases map to canonical spellings', () => {
    expect(normalizeProvince('Ghowr')).toBe('Ghor');
    expect(normalizeProvince('Oruzgan')).toBe('Uruzgan');
    expect(normalizeProvince('Panjsher')).toBe('Panjshir');
    expect(normalizeProvince('Wardak')).toBe('Maidan Wardak');
    expect(normalizeProvince('Sar-e-Pul')).toBe('Sar-e Pol');
    expect(normalizeProvince('Sarepol')).toBe('Sar-e Pol');
    expect(normalizeProvince('Nangrahar')).toBe('Nangarhar');
    expect(normalizeProvince('Nimroz')).toBe('Nimruz');
    expect(normalizeProvince('paktya')).toBe('Paktia');
  });

  test('"X Province" / "Kabul City" decorations are stripped', () => {
    expect(normalizeProvince('Herat Province')).toBe('Herat');
    expect(normalizeProvince('kabul city')).toBe('Kabul');
  });

  test('unknown values never resolve — no invention', () => {
    expect(normalizeProvince('Atlantis')).toBeNull();
    expect(normalizeProvince('')).toBeNull();
    expect(normalizeProvince(null)).toBeNull();
    expect(normalizeProvince('London')).toBeNull();
  });
});

describe('parseLocationString', () => {
  test('multi-province strings produce every province in order', () => {
    const r = parseLocationString('Kabul, Logar');
    expect(r.provinces).toEqual(['Kabul', 'Logar']);
  });

  test('multi-province with aliases', () => {
    const r = parseLocationString('Ghowr, Panjsher');
    expect(r.provinces).toEqual(['Ghor', 'Panjshir']);
  });

  test('countries are not mistaken for cities', () => {
    const r = parseLocationString('China, China');
    expect(r.provinces).toEqual([]);
    expect(r.city).toBeNull();
  });

  test('unknown place names survive as city, never as a province', () => {
    const r = parseLocationString('Mazar-i-Sharif');
    expect(r.provinces).toEqual([]);
    expect(r.city).toBe('Mazar-i-Sharif');
  });
});

describe('country guards', () => {
  test('normalizeCountry accepts and normalizes countries', () => {
    expect(normalizeCountry('united states')).toBe('United States');
    expect(normalizeCountry('Afghanistan')).toBe('Afghanistan');
    expect(normalizeCountry('USA')).toBe('United States');
    expect(normalizeCountry('Kabul, Afghanistan')).toBe('Afghanistan');
  });

  test('normalizeCountry rejects provinces/cities', () => {
    expect(normalizeCountry('Kabul')).toBeNull();
    expect(normalizeCountry('Balkh, Herat')).toBeNull();
    expect(normalizeCountry(null)).toBeNull();
  });

  test('isKnownCountry', () => {
    expect(isKnownCountry('Canada')).toBe(true);
    expect(isKnownCountry('Kandahar')).toBe(false);
  });

  test('resolveCountry: province in the country slot becomes Afghanistan', () => {
    expect(resolveCountry({ country: 'Kabul' })).toBe('Afghanistan');
    expect(resolveCountry({ country: 'Afghanistan' })).toBe('Afghanistan');
    expect(resolveCountry({ country: 'Germany' })).toBe('Germany');
    expect(resolveCountry({ country: null, location: 'Herat' })).toBeNull();
  });
});

describe('buildLocationRows (scraper → structured locations)', () => {
  test('jobs.af-style structured provinces become rows', () => {
    const rows = buildLocationRows({
      country: 'Afghanistan',
      provinces: ['Kabul', 'Nangarhar'],
      location: 'Kabul, Nangarhar',
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.province)).toEqual(['Kabul', 'Nangarhar']);
    expect(rows.every((r) => r.country === 'Afghanistan' && r.countryCode === 'AF' && r.confidence === 1)).toBe(true);
  });

  test('free-text location with aliases parses', () => {
    const rows = buildLocationRows({ country: 'Afghanistan', location: 'Sar-e-Pul, Ghowr' });
    expect(rows.map((r) => r.province)).toEqual(['Sar-e Pol', 'Ghor']);
  });

  test('province in the country slot is moved out and country fixed', () => {
    const rows = buildLocationRows({ country: 'Kabul, Herat' });
    expect(rows.map((r) => r.province)).toEqual(['Kabul', 'Herat']);
    expect(rows.every((r) => r.country === 'Afghanistan')).toBe(true);
  });

  test('unknown location stays city-level with lower confidence', () => {
    const rows = buildLocationRows({ country: 'Afghanistan', location: 'Mazar-i-Sharif' });
    expect(rows).toHaveLength(1);
    expect(rows[0].province).toBeNull();
    expect(rows[0].city).toBe('Mazar-i-Sharif');
    expect(rows[0].confidence).toBeLessThan(1);
  });

  test('no location data → no rows (never invented)', () => {
    expect(buildLocationRows({ country: 'Afghanistan' })).toHaveLength(0);
  });
});

// ─── apply links ─────────────────────────────────────────────────────────────

describe('classifyApplyUrl', () => {
  test('mailto is an application email', () => {
    expect(classifyApplyUrl('mailto:hr@example.org', 'https://x.com/a')).toBe('application_email');
  });

  test('form URLs are application forms', () => {
    expect(classifyApplyUrl('https://docs.google.com/forms/d/e/1/viewform', 'https://x.com/a')).toBe('application_form');
    expect(classifyApplyUrl('https://ee.kobotoolbox.org/x/abc', 'https://x.com/a')).toBe('application_form');
  });

  test('a link to the scraped source itself is a fallback, never a real apply link', () => {
    expect(classifyApplyUrl('https://www.jobs.af/jobs/abc', 'https://www.jobs.af/jobs/abc')).toBe('source_article_fallback');
    expect(classifyApplyUrl('https://wazifaha.org/jobs/apply/1', 'https://wazifaha.org/jobs/1')).toBe('source_article_fallback');
    expect(isRealApplyLink('source_article_fallback')).toBe(false);
  });

  test('a different external host is a direct application', () => {
    expect(classifyApplyUrl('https://unicef.org/careers/123', 'https://www.jobs.af/jobs/abc')).toBe('direct_application');
    expect(isRealApplyLink('direct_application')).toBe(true);
    expect(isRealApplyLink('application_email')).toBe(true);
    expect(isRealApplyLink('application_form')).toBe(true);
  });
});

describe('extractRealApplyLink', () => {
  test('finds an email that is not the source site itself', () => {
    const link = extractRealApplyLink([
      'Submit your CV to careers@ngo-afg.org before the deadline.',
    ]);
    expect(link).toBe('mailto:careers@ngo-afg.org');
  });

  test('ignores source-site addresses', () => {
    expect(extractRealApplyLink(['Email info@acbar.org for questions.'])).toBeNull();
  });

  test('captures hyphenated multi-dot domains whole', () => {
    const link = extractRealApplyLink([
      'Submit applications to Intake@academy.rwth-aachen.de by March.',
    ]);
    expect(link).toBe('mailto:Intake@academy.rwth-aachen.de');
  });

  test('skips bounce-only no-reply addresses', () => {
    expect(extractRealApplyLink(['Applications: no-reply@email.zenginehq.com'])).toBeNull();
  });

  test('finds a form URL', () => {
    expect(extractRealApplyLink(['Apply via https://forms.gle/abc123 now.'])).toBe('https://forms.gle/abc123');
  });

  test('no real link → null (never fabricates)', () => {
    expect(extractRealApplyLink(['Apply through the original website.'])).toBeNull();
    expect(extractRealApplyLink([null, ''])).toBeNull();
  });
});

// ─── translation chunks ──────────────────────────────────────────────────────

describe('chunkText', () => {
  test('short text is a single chunk', () => {
    expect(chunkText('Hello world')).toEqual(['Hello world']);
  });

  test('NEVER loses source text — chunks cover the whole input, in order', () => {
    const para = (n: number) => `Paragraph ${n}: ${'Lorem ipsum dolor sit amet consectetur. '.repeat(12)}`;
    const text = Array.from({ length: 30 }, (_, i) => para(i)).join('\n');
    const chunks = chunkText(text, 900);
    expect(chunks.length).toBeGreaterThan(2);
    // Every chunk bounded (with the hard-split allowance)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(900 * 1.6);
    // Reassembly must contain every paragraph marker — nothing dropped
    const rejoined = chunks.join('\n');
    for (let i = 0; i < 30; i++) expect(rejoined).toContain(`Paragraph ${i}:`);
  });

  test('oversized single line is hard-split, not truncated', () => {
    const line = 'word '.repeat(2000); // ~10k chars, no newlines
    const chunks = chunkText(line, 900);
    const rejoined = chunks.join(' ');
    expect(chunks.length).toBeGreaterThan(5);
    expect(rejoined.replace(/\s+/g, ' ').trim()).toBe(line.replace(/\s+/g, ' ').trim());
  });
});

describe('validateTranslation', () => {
  test('accepts a plausible Persian translation of long English text', () => {
    const source = 'The candidate must have at least three years of relevant work experience. '.repeat(5);
    const fa = 'داوطلب باید لږ تر لږه درې کاله اړوند کاري تجربه ولري. '.repeat(5);
    expect(validateTranslation(source, fa)).toBe(true);
  });

  test('rejects empty, symbol-only, or echo results', () => {
    const source = 'Requirements: five years of experience in project management roles. '.repeat(3);
    expect(validateTranslation(source, '')).toBe(false);
    expect(validateTranslation(source, '12345')).toBe(false);
    expect(validateTranslation(source, source)).toBe(false);
    expect(validateTranslation(source, source.slice(0, 30))).toBe(false); // suspiciously short
  });
});

describe('parseChunkReply', () => {
  test('parses the {"t": ...} contract, including fenced replies', () => {
    expect(parseChunkReply('{"t":"سلام دنیا"}')).toBe('سلام دنیا');
    expect(parseChunkReply('```json\n{"t":"سلام"}\n```')).toBe('سلام');
  });

  test('falls back to plain prose when the model ignores JSON', () => {
    expect(parseChunkReply('این یک ترجمه آزمایشی است.')).toBe('این یک ترجمه آزمایشی است.');
    expect(parseChunkReply('')).toBeNull();
  });
});

describe('isSymbolic', () => {
  test('values with no letters at all need no translation', () => {
    expect(isSymbolic('$500')).toBe(true);
    expect(isSymbolic('500 - 800')).toBe(true);
    // Contains the word "month" → has letters → still translatable (harmless).
    expect(isSymbolic('$500/month')).toBe(false);
    expect(isSymbolic('As per company scale')).toBe(false);
  });
});
