/**
 * Pure-function tests for the import pipeline utils and the i18n fallback
 * chain. No DB, no network — these run anywhere.
 *
 * Run: bun test tests/utils.test.ts
 */
import { describe, expect, test } from 'bun:test';

import {
  parseDate,
  sanitizeListingFragment,
  slugify,
  stripTextJunk,
  normalizeForCompare,
} from '../src/lib/import/utils';
import { computeHash } from '../src/lib/import/dedupe';
import { getLocalizedContent } from '../src/lib/i18n-content';

describe('parseDate', () => {
  test('normalizes ISO-ish input to YYYY-MM-DD', () => {
    expect(parseDate('2026-10-13')).toBe('2026-10-13');
    expect(parseDate('2026-10-13T00:00:00Z')).toBe('2026-10-13');
  });
  test('parses long english dates', () => {
    expect(parseDate('September 30, 2026')).toBe('2026-09-30');
    expect(parseDate('December 1, 2026')).toBe('2026-12-01');
  });
  test('returns null for junk', () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate('rolling admission')).toBeNull();
    expect(parseDate('not a date 12345')).toBeNull();
  });
});

describe('slugify', () => {
  test('lowercases, strips punctuation, collapses dashes', () => {
    expect(slugify('UI/UX Designer — Kabul!')).toBe('ui-ux-designer-kabul');
  });
  test('respects maxLen and does not cut mid-word', () => {
    const s = slugify('A very long opportunity title that keeps going and going and going', 30);
    expect(s.length).toBeLessThanOrEqual(30);
  });
});

describe('normalizeForCompare', () => {
  test('is case/whitespace/punctuation-insensitive', () => {
    expect(normalizeForCompare('Hello,  World!')).toBe(normalizeForCompare('hello world'));
    expect(normalizeForCompare('École Polytechnique')).toBe(normalizeForCompare('école polytechnique'));
  });
});

describe('computeHash (dedupe key)', () => {
  test('stable for identical listings', async () => {
    const a = { sourceUrl: 'https://x/1', title: 'Job A', organization: 'Org', deadline: '2026-10-01', description: 'desc' };
    const b = { sourceUrl: 'https://x/1', title: 'Job A', organization: 'Org', deadline: '2026-10-01', description: 'desc' };
    expect(await computeHash(a)).toBe(await computeHash(b));
  });
  test('changes when the deadline changes (source-site edits must register)', async () => {
    const a = { sourceUrl: 'https://x/1', title: 'Job A', organization: 'Org', deadline: '2026-10-01', description: 'desc' };
    const b = { sourceUrl: 'https://x/1', title: 'Job A', organization: 'Org', deadline: '2026-11-01', description: 'desc' };
    expect(await computeHash(a)).not.toBe(await computeHash(b));
  });
});

describe('sanitizeListingFragment', () => {
  test('strips theme classes, styles and data attributes', () => {
    const out = sanitizeListingFragment('<div class="acbar-jd__rich" style="color:red" data-x="1"><p>ok</p></div>');
    expect(out).toContain('<p>ok</p>');
    expect(out).not.toContain('class=');
    expect(out).not.toContain('style=');
    expect(out).not.toContain('data-x');
  });
  test('drops scripts and event handlers', () => {
    const out = sanitizeListingFragment('<p onclick="evil()">hi</p><script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('onclick');
  });
});

describe('stripTextJunk', () => {
  test('removes theme ad/SEO keyword lines', () => {
    const lines = ['Real first line', 'Discover more', 'Advertisements', 'Sponsored links', 'Grants, Scholarships & Financial Aid', 'Real last line'].join('\n');
    const out = stripTextJunk(lines);
    expect(out).toContain('Real first line');
    expect(out).toContain('Real last line');
    expect(out).not.toContain('Discover more');
    expect(out).not.toContain('Advertisements');
    expect(out).not.toContain('Financial Aid');
  });
});

describe('getLocalizedContent fallback chain', () => {
  test('lang → en → base → empty', () => {
    const i18n = { en: 'English title', fa: 'عنوان' };
    expect(getLocalizedContent('base', i18n, 'fa')).toBe('عنوان');
    expect(getLocalizedContent('base', i18n, 'ps')).toBe('English title');
    expect(getLocalizedContent('base', null, 'fa')).toBe('base');
    expect(getLocalizedContent(null, null, 'fa')).toBe('');
  });
  test('treats bare-URL i18n values as missing (scraped junk)', () => {
    const i18n = { en: 'https://example.com/some/listing/url' };
    expect(getLocalizedContent('Real Title', i18n, 'fa')).toBe('Real Title');
  });
});
