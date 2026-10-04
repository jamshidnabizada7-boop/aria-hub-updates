/**
 * PHASE 13 — Oracle HCM / Recruiting Cloud adapter.
 * Fixture-driven with stubbed fetchText (no network), following the
 * established official-sources test pattern.
 */
import { describe, test, expect } from 'bun:test';

const { OracleHcmScraper } = await import('../src/lib/import/scrapers/oracle-hcm');
const { SCRAPERS, getScraper } = await import('../src/lib/import/registry');

const handle = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'src-test', name: 'IOM', type: 'job', scraperKey: 'oracleHcm',
  baseUrl: 'https://ekum.fa.em2.oraclecloud.com', config: {
    host: 'ekum.fa.em2.oraclecloud.com', siteNumber: 'CX_2019',
  }, ...over,
}) as never;

const LIST_JSON = JSON.stringify({
  items: [{
    TotalJobsCount: 69,
    requisitionList: [
      { Id: '21784', Title: 'Partnerships Manager Ethiopia', PostedDate: '2026-10-02',
        PrimaryLocation: 'Addis Ababa, Ethiopia', PrimaryLocationCountry: 'ET' },
      { Id: '21785', Title: 'No-URL Row' },
    ],
  }],
});

const DETAIL_JSON = JSON.stringify({
  JobDescription: '<p>Full Oracle HCM job description body.</p>',
  ExternalUrl: 'https://ekum.fa.em2.oraclecloud.com/job/21784',
});

describe('oracleHcm adapter (PHASE 13)', () => {
  test('registered in the registry', () => {
    expect(getScraper(handle())).toBeTruthy();
  });

  test('parses requisitions into RawListings with vacancyNumber', async () => {
    const scraper = new OracleHcmScraper(handle());
    (scraper as unknown as { fetchText: (u: string) => Promise<string> }).fetchText = async () => LIST_JSON;
    const listings = await scraper.scrapeAll();
    expect(listings.length).toBeGreaterThanOrEqual(2);
    const first = listings[0];
    expect(first.title).toBe('Partnerships Manager Ethiopia');
    expect(first.sourceUrl).toContain('/job/21784');
    expect(first.applyUrl).toBe(first.sourceUrl);
    expect((first.extractedData as Record<string, unknown>).vacancyNumber).toBe('21784');
    expect(first.location).toBe('Addis Ababa, Ethiopia');
    expect(first.publishedDate).toBe('2026-10-02');
    expect(first.organization).toBe('IOM');
  });

  test('detail fetch enriches description and survives failures', async () => {
    const scraper = new OracleHcmScraper(handle());
    (scraper as unknown as { fetchJson: (u: string) => Promise<{ data: unknown }> }).fetchJson = async () => ({ data: JSON.parse(DETAIL_JSON) });
    const enriched = await scraper.parseDetail({
      sourceUrl: 'https://ekum.fa.em2.oraclecloud.com/x',
      extractedData: { vacancyNumber: '21784' },
    } as never);
    expect(enriched.description).toContain('Full Oracle HCM job description body');

    (scraper as unknown as { fetchJson: (u: string) => Promise<unknown> }).fetchJson = async () => {
      throw new Error('HTTP 404');
    };
    const safe = await scraper.parseDetail({ sourceUrl: 'https://x', extractedData: {} } as never);
    expect(safe).toBeTruthy();
  });

  test('missing config throws a clear error', () => {
    expect(() => {
      const s = new OracleHcmScraper(handle({ config: {} }));
      (s as unknown as { parseListPage: (t: string, u: string) => unknown }).parseListPage('{"items":[]}', 'https://x?offset=0');
    }).toThrow(/host and config.siteNumber/);
  });
});
