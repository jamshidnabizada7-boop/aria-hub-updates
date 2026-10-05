/**
 * Phase 12 — Workday CXS adapter (`workday`).
 *
 * The fixtures under tests/fixtures/workday-cxs.json are a TRIMMED capture of
 * the LIVE Workday CXS API (UNHCR, captured 2026-10-04): one list page (3
 * postings) + one job detail. Network is stubbed at global fetch level; the
 * real endpoints were verified live during development (see the adapter's
 * header in src/lib/import/scrapers/workday.ts).
 */
import { describe, test, expect, afterEach } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { SCRAPERS, getScraper } = await import('../src/lib/import/registry');
const { WorkdayScraper, parsePostedOn } = await import('../src/lib/import/scrapers/workday');

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, 'fixtures', 'workday-cxs.json'), 'utf8'),
) as {
  listPage1: { total: number; jobPostings: Array<Record<string, unknown>> };
  detail: { jobPostingInfo: Record<string, unknown> };
};

const handle = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'src-test', name: 'UNHCR Careers', type: 'job', scraperKey: 'workday',
  baseUrl: 'https://unhcr.wd3.myworkdayjobs.com/en-US/External',
  config: { crawlDelayMs: 0 }, ...over,
}) as never;

interface FetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}

/** Stub global fetch; routes POST /jobs → canned pages, GET /job/... → detail. */
function stubFetch(routes: {
  pages?: Array<Record<string, unknown> | Error>;
  detail?: Record<string, unknown> | null;
  detailStatus?: number;
  status?: number;
}): FetchCall[] {
  const calls: FetchCall[] = [];
  let pageIndex = 0;
  const impl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headers = Object.fromEntries(
      new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).entries(),
    );
    calls.push({ url, method, headers, body: typeof init?.body === 'string' ? init.body : undefined });

    if (routes.status) return new Response('nope', { status: routes.status, statusText: 'Server Error' });
    if (method === 'POST') {
      const page = routes.pages?.[pageIndex++];
      if (page instanceof Error) throw page;
      if (!page) return new Response(JSON.stringify({ total: 0, jobPostings: [] }), { status: 200 });
      return new Response(JSON.stringify(page), { status: 200 });
    }
    if (routes.detailStatus) {
      return new Response('gone', { status: routes.detailStatus, statusText: 'Not Found' });
    }
    if (routes.detail === null) throw new Error('boom');
    return new Response(JSON.stringify(routes.detail ?? {}), { status: 200 });
  };
  (globalThis as unknown as { fetch: typeof fetch }).fetch = impl as unknown as typeof fetch;
  return calls;
}

// Restore the real transport after every stubbed test.
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const dayOffsetIso = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

// ───────────────────────────────────────────────────────────────────────────
describe('Phase 12 — registry', () => {
  test('workday adapter is registered', () => {
    expect(SCRAPERS.workday).toBeTruthy();
    const s = getScraper(handle());
    expect(s).toBeInstanceOf(WorkdayScraper);
  });
});

describe('parsePostedOn (relative "Posted …" dates)', () => {
  test('maps Workday relative labels to ISO days', () => {
    expect(parsePostedOn('Posted Today')).toBe(dayOffsetIso(0));
    expect(parsePostedOn('Posted Yesterday')).toBe(dayOffsetIso(1));
    expect(parsePostedOn('Posted 3 Days Ago')).toBe(dayOffsetIso(3));
    expect(parsePostedOn('Posted 30+ Days Ago')).toBe(dayOffsetIso(30));
    expect(parsePostedOn('Posted 2 Weeks Ago')).toBe(dayOffsetIso(14));
  });

  test('falls back to absolute dates and never invents one', () => {
    expect(parsePostedOn('2026-09-30')).toBe('2026-09-30');
    expect(parsePostedOn('')).toBeNull();
    expect(parsePostedOn(null)).toBeNull();
  });
});

describe('workday adapter — list mapping', () => {
  test('parses CXS jobPostings into RawListings with vacancyNumber and derived dates', async () => {
    stubFetch({ pages: [fixture.listPage1] });
    const scraper = new WorkdayScraper(handle());
    const listings = await scraper.scrapeAll();

    expect(listings).toHaveLength(3);
    const first = listings[0];
    expect(first.title).toBe('Assistant Supply Officer (Proximity Sourcing Specialist)');
    expect(first.sourceUrl).toBe(
      'https://unhcr.wd3.myworkdayjobs.com/External/job/Budapest-GSC-Hungary/Assistant-Supply-Officer--Proximity-Sourcing-Specialist-_JR2668004-1',
    );
    expect(first.applyUrl).toBe(first.sourceUrl);
    expect(first.originalUrl).toBe(first.sourceUrl);
    expect(first.location).toBe('Budapest (GSC), Hungary');
    expect(first.organization).toBe('UNHCR Careers');
    expect(first.sourceName).toBe('UNHCR Careers');
    expect(first.jobType).toBe('job');
    // "Posted 2 Days Ago" → ISO day (±1 day of tolerance across midnight)
    const expected = dayOffsetIso(2);
    expect(typeof first.publishedDate).toBe('string');
    expect([dayOffsetIso(1), expected, dayOffsetIso(3)]).toContain(first.publishedDate as string);
    // bulletFields[0] is the requisition id → Level-A dedupe key
    expect((first.extractedData as Record<string, unknown>).vacancyNumber).toBe('JR2668004');
  });

  test('sends the live-verified POST body/headers and derives tenant/site from the baseUrl', async () => {
    const calls = stubFetch({ pages: [fixture.listPage1] });
    const scraper = new WorkdayScraper(handle()); // baseUrl carries /en-US/External
    await scraper.scrapeAll();

    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe('https://unhcr.wd3.myworkdayjobs.com/wday/cxs/unhcr/External/jobs');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['content-type']).toBe('application/json');
    expect(calls[0].headers['accept']).toBe('application/json');
    expect(JSON.parse(calls[0].body!)).toEqual({ appliedFacets: {}, limit: 20, offset: 0 });
  });

  test('explicit config.tenant/site/wd override the baseUrl derivation', async () => {
    const calls = stubFetch({ pages: [fixture.listPage1] });
    const scraper = new WorkdayScraper(handle({
      baseUrl: 'https://careers.example.org/jobs',
      config: { tenant: 'unhcr', site: 'External', wd: 3, crawlDelayMs: 0 },
    }));
    await scraper.scrapeAll();
    expect(calls[0].url).toBe('https://unhcr.wd3.myworkdayjobs.com/wday/cxs/unhcr/External/jobs');
  });

  test('locationsFacet narrows the board via appliedFacets.locations (live-verified shape)', async () => {
    const calls = stubFetch({ pages: [fixture.listPage1] });
    const scraper = new WorkdayScraper(handle({
      config: { crawlDelayMs: 0, locationsFacet: 'abc123' },
    }));
    await scraper.scrapeAll();
    expect(JSON.parse(calls[0].body!)).toEqual({
      appliedFacets: { locations: ['abc123'] },
      limit: 20,
      offset: 0,
    });
  });
});

describe('workday adapter — pagination', () => {
  test('walks offset pages until the board is exhausted (total quirk handled)', async () => {
    const page2 = {
      total: 0, // live quirk: later pages report total: 0
      jobPostings: [
        { title: 'Senior Data Management Assistant', externalPath: '/job/Coxs-Bazaar-Bangladesh/Senior-Data-Management-Assistant_JR2668867-1', locationsText: "Cox's Bazaar, Bangladesh", postedOn: 'Posted 4 Days Ago', bulletFields: ['JR2668867'] },
        { title: 'PSP Assistant (F2F)', externalPath: '/job/Kuala-Lumpur-Malaysia/PSP-Assistant--F2F-_JR2668838-2', locationsText: 'Kuala Lumpur, Malaysia', postedOn: 'Posted 4 Days Ago', bulletFields: ['JR2668838'] },
      ],
    };
    const calls = stubFetch({ pages: [fixture.listPage1, page2] });
    const scraper = new WorkdayScraper(handle({ config: { crawlDelayMs: 0, limit: 3 } }));
    const listings = await scraper.scrapeAll();

    expect(listings).toHaveLength(5);
    expect(calls).toHaveLength(2);
    expect(JSON.parse(calls[0].body!).offset).toBe(0);
    expect(JSON.parse(calls[1].body!).offset).toBe(3);
  });

  test('stops when an offset page loops back to the first page (wrap guard)', async () => {
    const calls = stubFetch({ pages: [fixture.listPage1, fixture.listPage1, fixture.listPage1] });
    const scraper = new WorkdayScraper(handle({ config: { crawlDelayMs: 0, limit: 3 } }));
    const listings = await scraper.scrapeAll();

    expect(listings).toHaveLength(3);
    expect(listings.filter((l, i, a) => a.findIndex((x) => x.sourceUrl === l.sourceUrl) === i)).toHaveLength(3);
    expect(calls).toHaveLength(2); // page 2 detected as a wrap → stop
  });

  test('respects maxPages', async () => {
    const calls = stubFetch({ pages: [fixture.listPage1, fixture.listPage1, fixture.listPage1] });
    const scraper = new WorkdayScraper(handle({ config: { crawlDelayMs: 0, limit: 3, maxPages: 1 } }));
    await scraper.scrapeAll();
    expect(calls).toHaveLength(1);
  });
});

describe('workday adapter — detail enrichment', () => {
  test('fetches the CXS detail endpoint and fills description, deadline and requisition id', async () => {
    stubFetch({ pages: [fixture.listPage1], detail: fixture.detail });
    const scraper = new WorkdayScraper(handle());
    const listings = await scraper.scrapeAll();
    const enriched = await scraper.parseDetail(listings[1]); // PSP Associate (PPH)

    expect(enriched.description).toBeTruthy();
    expect(enriched.description).not.toContain('<');
    expect(enriched.deadline).toBe('2026-10-19'); // jobPostingInfo.endDate
    expect((enriched.extractedData as Record<string, unknown>).vacancyNumber).toBe('JR2668825');
    expect((enriched.extractedData as Record<string, unknown>).employmentType).toBe('Full time');
    expect((enriched.extractedData as Record<string, unknown>).startDate).toBe('2026-10-02');
    expect(enriched.location).toBe('Copenhagen (HQ), Denmark');
  });

  test('joins additionalLocations into the location field', async () => {
    const detail = JSON.parse(JSON.stringify(fixture.detail)) as typeof fixture.detail;
    detail.jobPostingInfo.additionalLocations = ['London, UK', 'New York, NY HQ USA'];
    stubFetch({ pages: [fixture.listPage1], detail });
    const scraper = new WorkdayScraper(handle());
    const listings = await scraper.scrapeAll();
    const enriched = await scraper.parseDetail(listings[1]); // detail fixture = PSP Associate (PPH)
    expect(enriched.location).toBe('Copenhagen (HQ), Denmark, London, UK, New York, NY HQ USA');
  });

  test('a pulled posting (HTTP 404) raises soft-404 so the orchestrator skips the row', async () => {
    stubFetch({ pages: [fixture.listPage1], detailStatus: 404 });
    const scraper = new WorkdayScraper(handle());
    const listings = await scraper.scrapeAll();
    await expect(scraper.parseDetail(listings[0])).rejects.toThrow(/soft-404/);
  }, 20_000);

  test('other detail failures stay best-effort and never fail the listing', async () => {
    stubFetch({ pages: [fixture.listPage1], detail: null }); // fetch throws "boom"
    const scraper = new WorkdayScraper(handle());
    const listings = await scraper.scrapeAll();
    const enriched = await scraper.parseDetail(listings[0]);
    expect(enriched).toBe(listings[0]);
  }, 20_000);
});

describe('workday adapter — error handling', () => {
  test('a hard-failing jobs endpoint retries then rejects with a clear error', async () => {
    stubFetch({ status: 500 });
    const scraper = new WorkdayScraper(handle());
    await expect(scraper.scrapeAll()).rejects.toThrow(/workday: jobs request failed/);
  }, 20_000);

  test('missing tenant/site (and no myworkdayjobs baseUrl) throws a clear error', async () => {
    const scraper = new WorkdayScraper(handle({
      baseUrl: 'https://careers.example.org/jobs',
      config: { crawlDelayMs: 0 },
    }));
    await expect(scraper.scrapeAll()).rejects.toThrow(/config\.tenant and config\.site/);
  });

  test('a custom-domain baseUrl without config.wd throws a clear error', async () => {
    const scraper = new WorkdayScraper(handle({
      baseUrl: 'https://careers.example.org/jobs',
      config: { tenant: 'unhcr', site: 'External', crawlDelayMs: 0 },
    }));
    await expect(scraper.scrapeAll()).rejects.toThrow(/config\.wd/);
  });

  test('an empty board yields no listings', async () => {
    stubFetch({ pages: [{ total: 0, jobPostings: [] }] });
    const scraper = new WorkdayScraper(handle());
    expect(await scraper.scrapeAll()).toEqual([]);
  });
});
