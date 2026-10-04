/**
 * PHASE 14 — SuccessFactors career-site adapter. Fixture-driven, no network.
 */
import { describe, test, expect } from 'bun:test';

const { SuccessFactorsScraper } = await import('../src/lib/import/scrapers/successfactors');
const { getScraper } = await import('../src/lib/import/registry');

const handle = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'src-test', name: 'UNHCR', type: 'job', scraperKey: 'successfactors',
  baseUrl: 'https://career.unhcr.org', config: { host: 'career.unhcr.org' }, ...over,
}) as never;

const LIST_JSON = JSON.stringify({
  total: 40,
  jobs: [
    { reqId: 'JR0123456', title: 'Protection Officer', datePosted: '2026-10-01',
      location: 'Kabul, Afghanistan', JobDescription: '<p>Full SF description.</p>' },
    { reqId: 'JR0123457', title: 'No-URL Row' },
  ],
});

describe('successfactors adapter (PHASE 14)', () => {
  test('registered in the registry', () => {
    expect(getScraper(handle())).toBeTruthy();
  });

  test('maps postings with vacancyNumber and paginates by startrow', async () => {
    const scraper = new SuccessFactorsScraper(handle());
    (scraper as unknown as { fetchText: (u: string) => Promise<string> }).fetchText = async () => LIST_JSON;
    const listings = await scraper.scrapeAll();
    expect(listings.length).toBeGreaterThanOrEqual(2);
    const first = listings[0];
    expect(first.title).toBe('Protection Officer');
    expect(first.sourceUrl).toContain('/job/JR0123456');
    expect((first.extractedData as Record<string, unknown>).vacancyNumber).toBe('JR0123456');
    expect(first.location).toBe('Kabul, Afghanistan');
    expect(first.description).toContain('Full SF description');

    const full = JSON.parse(LIST_JSON);
    full.jobs = Array.from({ length: 25 }, (_, i) => ({ reqId: `X${i}`, title: `Job ${i}` }));
    const result = (scraper as unknown as { parseListPage: (t: string, u: string) => { nextPage: string | null } })
      .parseListPage(JSON.stringify(full), 'https://career.unhcr.org/search/?startrow=0&resultset=25');
    expect(result.nextPage).toContain('startrow=25');
  });

  test('non-JSON response throws a clear error', () => {
    expect(() => {
      const s = new SuccessFactorsScraper(handle());
      (s as unknown as { parseListPage: (t: string, u: string) => unknown }).parseListPage('<html>block</html>', 'https://x');
    }).toThrow(/not JSON/);
  });
});
