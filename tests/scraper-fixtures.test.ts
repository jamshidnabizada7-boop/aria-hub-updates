/**
 * Scraper contract tests against RECORDED HTML fixtures — no network.
 * The fixtures are real pages captured 2026-09-13; if a source redesigns,
 * these tests fail and tell you exactly which selector broke.
 *
 * Run: bun test tests/scraper-fixtures.test.ts
 */
import { describe, expect, test } from 'bun:test';

import { WazifahaScraper } from '../src/lib/import/scrapers/wazifaha';
import { O4afScraper } from '../src/lib/import/scrapers/o4af';
import type { RawListing } from '../src/lib/import/types';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dir, 'fixtures');
const readFixture = (name: string) => Bun.file(join(FIXTURES, name)).text();

/** A scraper whose network transport is replaced by a fixture. */
function withFixture<T extends { parseDetail: (l: RawListing) => Promise<RawListing> }>(
  scraper: T,
  html: string,
): T {
  (scraper as unknown as { fetchText: (url: string) => Promise<string> }).fetchText = async () => html;
  return scraper;
}

const WAZ_SOURCE = {
  id: 'test', name: 'Wazifaha Jobs', type: 'job', scraperKey: 'wazifaha',
  baseUrl: 'https://www.wazifaha.org', config: { crawlDelayMs: 0, timeoutMs: 5000 },
};
const O4_SOURCE = {
  id: 'test', name: 'O4AF', type: 'scholarship', scraperKey: 'o4af',
  baseUrl: 'https://www.o4af.com', config: { crawlDelayMs: 0, timeoutMs: 5000 },
};

describe('wazifaha detail parsing (fixture: 2026-09-13 UI/UX Designer @ Ramaki)', () => {
  test('extracts the full fact sheet', async () => {
    const s = withFixture(new WazifahaScraper(WAZ_SOURCE as never), await readFixture('wazifaha-detail.html'));
    const out = await s.parseDetail({ title: 'UI/UX Designer', sourceUrl: 'https://www.wazifaha.org/jobs/31308/uiux-designer', sourceName: 'Wazifaha Jobs' } as RawListing);
    expect(out.title).toBe('UI/UX Designer');
    expect(out.organization).toBe('Ramaki Group of Companies');
    expect(out.deadline).toBe('2026-10-13');
    expect(out.salary).toBe('As per Ramaki Salary Structure');
    expect(out.educationReq).toContain('Bachelor');
    expect(out.experience).toBe('3-5 years');
    // the fact sheet must carry the full grid
    const ed = out.extractedData ?? {};
    expect(ed['Vacancy Number']).toBe('Ramaki-HRD-035');
    expect(ed['No. of Jobs']).toBe('1');
    expect(ed['Gender']).toBe('Male/Female');
    expect(ed['Contract Duration']).toBe('Long Term');
    expect(ed['Nationality']).toBe('National');
  });

  test('routes embedded sections to the right columns', async () => {
    const s = withFixture(new WazifahaScraper(WAZ_SOURCE as never), await readFixture('wazifaha-detail.html'));
    const out = await s.parseDetail({ title: 'x', sourceUrl: 'https://www.wazifaha.org/jobs/31308/uiux-designer', sourceName: 'Wazifaha Jobs' } as RawListing);
    // "Duties and Responsibilities" lives INSIDE a run-on paragraph — it must
    // land in responsibilities, not stay buried in the description
    expect((out.responsibilities ?? '').length).toBeGreaterThan(400);
    expect((out.responsibilities ?? '')).toContain('wireframes');
    expect((out.requirements ?? '').length).toBeGreaterThan(300);
    expect(out.guidelines).toContain('Submission email');
    expect((out.description ?? '')).toContain('Ramaki Group of Companies specializes');
    // no leaked theme classes in stored HTML
    expect(out.description).not.toContain('class=');
  });
});

describe('o4af detail parsing (fixture: 2026-09-13 AAUW fellowship)', () => {
  test('extracts fact grid, sections and apply link', async () => {
    const s = withFixture(new O4afScraper(O4_SOURCE as never), await readFixture('o4af-detail.html'));
    const out = await s.parseDetail({ title: 'AAUW International Fellowships', sourceUrl: 'https://o4af.com/opportunity/aauw-international-fellowships/', sourceName: 'O4AF' } as RawListing);
    expect(out.deadline).toBe('2026-09-17');
    expect(out.country).toBe('United States');
    expect(out.applyUrl).toContain('aauw.fluxx.io');
    expect(out.publishedDate).toBe('2026-09-10');
    const ed = out.extractedData ?? {};
    expect(ed['Degree']).toBeTruthy();
    expect(ed['Opportunity Type']).toBeTruthy();
    expect((out.eligibility ?? '').length).toBeGreaterThan(200);
    expect((out.benefits ?? '').length).toBeGreaterThan(50);
  });

  test('ships no theme junk in the content', async () => {
    const s = withFixture(new O4afScraper(O4_SOURCE as never), await readFixture('o4af-detail.html'));
    const out = await s.parseDetail({ title: 'x', sourceUrl: 'https://o4af.com/opportunity/aauw-international-fellowships/', sourceName: 'O4AF' } as RawListing);
    const all = [out.description, out.benefits, out.eligibility, out.requirements].join('\n');
    for (const junk of ['Advertisements', 'Sponsored links', 'Discover more', 'Colleges & Universities']) {
      expect(all).not.toContain(junk);
    }
  });
});
