/**
 * Phases 6 & 7 — ImportSource V2 health/scheduling helpers and the five
 * generic official-source adapters.
 *
 * Adapter tests use inline fixtures with a stubbed fetchText (no network)
 * and call the public scrapeAll() — the same contract the real pipeline uses.
 */
import { describe, test, expect } from 'bun:test';

const {
  HEALTH_STATES, ROLE_PRIORITY, SCRAPER_KEY_PRIORITY,
  defaultPriorityFor, backoffMinutesFor, nextFailureState, nextSuccessState,
  computeNextRunAt, isDue,
} = await import('../src/lib/import/source-health');
const { SCRAPERS, getScraper } = await import('../src/lib/import/registry');
const { OfficialHtmlScraper } = await import('../src/lib/import/scrapers/official-html');
const { RssOpportunityScraper } = await import('../src/lib/import/scrapers/rss-opportunity');
const { JsonApiScraper } = await import('../src/lib/import/scrapers/json-api');
const { GreenhouseScraper } = await import('../src/lib/import/scrapers/greenhouse');
const { LeverScraper } = await import('../src/lib/import/scrapers/lever');

const handle = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'src-test', name: 'Test Org Careers', type: 'job', scraperKey: 'officialHtml',
  baseUrl: 'https://careers.testorg.org/jobs', config: {}, ...over,
}) as never;

/** Stub the network transport and run the public crawl loop. */
async function scrapeWith(scraper: { fetchText: (url: string) => Promise<string>; scrapeAll: () => Promise<any[]> }, body: string) {
  (scraper as unknown as { fetchText: (url: string) => Promise<string> }).fetchText = async () => body;
  return scraper.scrapeAll();
}

// ───────────────────────────────────────────────────────────────────────────
describe('Phase 6 — source health & scheduling', () => {
  test('health states and priority baselines follow the plan', () => {
    expect(HEALTH_STATES).toEqual(['healthy', 'degraded', 'blocked', 'paused', 'pending_configuration']);
    expect(ROLE_PRIORITY.employer_submission).toBe(100);
    expect(ROLE_PRIORITY.official_api).toBe(95);
    expect(SCRAPER_KEY_PRIORITY.acbar).toBe(60);
    expect(SCRAPER_KEY_PRIORITY.jobsaf).toBe(55);
    expect(SCRAPER_KEY_PRIORITY.wazifaha).toBe(50);
  });

  test('defaultPriorityFor: explicit role > scraperKey > fallback', () => {
    expect(defaultPriorityFor({ sourceRole: 'official_careers', scraperKey: 'acbar' })).toBe(90);
    expect(defaultPriorityFor({ sourceRole: null, scraperKey: 'acbar' })).toBe(60);
    expect(defaultPriorityFor({ sourceRole: null, scraperKey: 'rssNews' })).toBe(25);
    expect(defaultPriorityFor({})).toBe(30);
  });

  test('backoff ladder: 1→5min, 2→15, 3→30, 4→60, ≥5→120', () => {
    expect([1, 2, 3, 4, 5, 8].map(backoffMinutesFor)).toEqual([5, 15, 30, 60, 120, 120]);
  });

  test('failure transitions: ladder, degraded at 5, blocked at 8; success resets', () => {
    const now = new Date('2026-10-03T10:00:00Z');
    let state = nextFailureState({ consecutiveFailures: 0, healthStatus: 'healthy' }, now);
    expect(state.consecutiveFailures).toBe(1);
    expect(state.backoffUntil!.toISOString()).toBe('2026-10-03T10:05:00.000Z');
    expect(state.healthStatus).toBe('healthy');

    state = nextFailureState({ consecutiveFailures: 4, healthStatus: 'healthy' }, now);
    expect(state.consecutiveFailures).toBe(5);
    expect(state.healthStatus).toBe('degraded');

    state = nextFailureState({ consecutiveFailures: 7, healthStatus: 'degraded' }, now);
    expect(state.consecutiveFailures).toBe(8);
    expect(state.healthStatus).toBe('blocked');

    const ok = nextSuccessState({ consecutiveFailures: 6, healthStatus: 'degraded' }, now);
    expect(ok.consecutiveFailures).toBe(0);
    expect(ok.backoffUntil).toBeNull();
    expect(ok.healthStatus).toBe('healthy');
    expect(ok.lastSuccessAt).toBe(now);

    // deliberate states are never auto-cleared
    expect(nextSuccessState({ healthStatus: 'paused' }, now).healthStatus).toBe('paused');
    expect(nextSuccessState({ healthStatus: 'pending_configuration' }, now).healthStatus).toBe('pending_configuration');
  });

  test('isDue and computeNextRunAt respect schedule, nextRunAt and backoff', () => {
    const now = new Date('2026-10-03T10:00:00Z');
    // enabled with old lastRun → due
    expect(isDue({ enabled: true, lastRunAt: new Date('2026-10-03T09:00:00Z'), scheduleMinutes: 30 }, now)).toBe(true);
    // recent run → not due
    expect(isDue({ enabled: true, lastRunAt: new Date('2026-10-03T09:50:00Z'), scheduleMinutes: 30 }, now)).toBe(false);
    // disabled → never due
    expect(isDue({ enabled: false }, now)).toBe(false);
    // backoff blocks a due source
    expect(isDue({ enabled: true, nextRunAt: new Date('2026-10-03T09:00:00Z'), backoffUntil: new Date('2026-10-03T11:00:00Z') }, now)).toBe(false);
    // nextRunAt in the past → due
    expect(isDue({ enabled: true, nextRunAt: new Date('2026-10-03T09:00:00Z') }, now)).toBe(true);

    expect(computeNextRunAt({ scheduleMinutes: 30 }, now).toISOString()).toBe('2026-10-03T10:30:00.000Z');
    expect(computeNextRunAt({ scheduleMinutes: 1 }, now).toISOString()).toBe('2026-10-03T10:05:00.000Z'); // 5-min floor
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('Phase 7 — registry', () => {
  test('all five official adapters are registered', () => {
    for (const key of ['officialHtml', 'rssOpportunity', 'jsonApi', 'greenhouse', 'lever']) {
      expect(SCRAPERS[key]).toBeTruthy();
      expect(getScraper(handle({ scraperKey: key }))).toBeTruthy();
    }
  });
});

describe('officialHtml adapter', () => {
  const html = `
    <html><body>
      <li class="vacancy">
        <h3><a class="vacancy-link" href="/vacancy/8842">Programme Officer</a></h3>
        <span class="loc">Kabul, Afghanistan</span>
        <span class="deadline">Deadline: 31 December 2026</span>
        <a class="apply" href="/apply/8842">Apply</a>
      </li>
      <li class="vacancy">
        <h3><a class="vacancy-link" href="https://careers.testorg.org/vacancy/8843">Finance Assistant</a></h3>
      </li>
      <li class="vacancy"><h3>Broken — no link</h3></li>
    </body></html>`;

  function scraper(config: Record<string, unknown> = {}) {
    return new OfficialHtmlScraper(handle({ config }));
  }

  test('parses cards into RawListings with absolute URLs and parsed deadlines', async () => {
    const listings = await scrapeWith(scraper({
      selectors: {
        card: 'li.vacancy', title: 'h3', url: 'a.vacancy-link',
        location: '.loc', deadline: '.deadline', apply: 'a.apply',
      },
    }), html);

    expect(listings).toHaveLength(2);
    const first = listings[0];
    expect(first.title).toBe('Programme Officer');
    expect(first.sourceUrl).toBe('https://careers.testorg.org/vacancy/8842');
    expect(first.applyUrl).toBe('https://careers.testorg.org/apply/8842');
    expect(first.location).toBe('Kabul, Afghanistan');
    expect(first.deadline).toBe('2026-12-31');
    expect(first.organization).toBe('Test Org Careers');
    expect(first.sourceName).toBe('Test Org Careers');
  });

  test('pagination: the crawl follows the next link once and stops on the loop guard', async () => {
    // the stub returns the SAME page (with a next link) for every URL — the
    // visited-set must stop it at two pages × two listings
    const listings = await scrapeWith(scraper({
      selectors: { card: 'li.vacancy', title: 'h3', url: 'a.vacancy-link' },
      nextPageSelector: 'a.next',
    }), `${html}<a class="next" href="?page=2">Next</a>`);
    expect(listings).toHaveLength(4);

    // the generated next link is absolute
    const result = (scraper({
      selectors: { card: 'li.vacancy', title: 'h3', url: 'a.vacancy-link' },
      nextPageSelector: 'a.next',
    }) as unknown as { parseListPage: (h: string, u: string) => { nextPage: string | null } })
      .parseListPage(`${html}<a class="next" href="?page=2">Next</a>`, 'https://careers.testorg.org/jobs');
    expect(result.nextPage).toBe('https://careers.testorg.org/jobs?page=2');
  });

  test('detail fetch enriches description and never throws on fetch failure', async () => {
    const s = scraper({
      selectors: { card: 'li.vacancy', title: 'h3', url: 'a.vacancy-link', description: '.body' },
    });
    (s as unknown as { fetchText: (url: string) => Promise<string> }).fetchText = async () =>
      '<html><body><div class="body"><p>Full description here.</p></div></body></html>';
    const enriched = await s.parseDetail({ sourceUrl: 'https://careers.testorg.org/vacancy/8842' } as never);
    expect(enriched.description).toContain('Full description here.');

    (s as unknown as { fetchText: (url: string) => Promise<string> }).fetchText = async () => {
      throw new Error('HTTP 500');
    };
    const safe = await s.parseDetail({ sourceUrl: 'https://careers.testorg.org/vacancy/8842' } as never);
    expect(safe).toBeTruthy();
  });
});

describe('rssOpportunity adapter', () => {
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0"><channel>
      <item>
        <title>Protection Monitor (Kabul)</title>
        <link>https://testorg.org/jobs/protection-monitor</link>
        <pubDate>Tue, 29 Sep 2026 08:00:00 GMT</pubDate>
        <description>&lt;p&gt;Monitor protection incidents. Deadline: 30 November 2026. Send applications via the portal.&lt;/p&gt;</description>
      </item>
      <entry>
        <title>Finance Officer</title>
        <link rel="alternate" href="https://testorg.org/jobs/finance-officer"/>
        <published>2026-09-28T10:00:00Z</published>
        <summary>Handle finances.</summary>
      </entry>
    </channel></rss>`;

  test('parses RSS items and Atom entries with explicit deadlines only', async () => {
    const listings = await scrapeWith(
      new RssOpportunityScraper(handle({ scraperKey: 'rssOpportunity', baseUrl: 'https://testorg.org/jobs/feed' })),
      feed,
    );
    expect(listings).toHaveLength(2);
    expect(listings[0].title).toBe('Protection Monitor (Kabul)');
    expect(listings[0].sourceUrl).toBe('https://testorg.org/jobs/protection-monitor');
    expect(listings[0].deadline).toBe('2026-11-30'); // explicit only, never invented
    expect(listings[0].publishedDate).toContain('2026');
    expect(listings[1].sourceUrl).toBe('https://testorg.org/jobs/finance-officer');
    expect(listings[1].deadline).toBeUndefined();
  });
});

describe('jsonApi adapter', () => {
  const json = JSON.stringify({
    data: {
      jobs: [
        { title: 'Health Coordinator', absolute_url: '/vacancies/hc-42', closing_date: '2026-12-15',
          reference: 'HC-42', location: { label: 'Kabul' }, employer: { name: 'Test Org' },
          description: '<p>Coordinate health.</p>' },
        { title: 'No-url row' },
      ],
    },
  });

  const config = {
    itemsPath: 'data.jobs',
    fields: {
      title: 'title', url: 'absolute_url', organization: 'employer.name',
      location: 'location.label', deadline: 'closing_date', description: 'description',
      vacancyNumber: 'reference',
    },
  };

  test('dot-path mapping resolves fields; rows without a URL are dropped', async () => {
    const listings = await scrapeWith(
      new JsonApiScraper(handle({ scraperKey: 'jsonApi', baseUrl: 'https://testorg.org/api/vacancies.json', config })),
      json,
    );
    expect(listings).toHaveLength(1);
    const l = listings[0];
    expect(l.title).toBe('Health Coordinator');
    expect(l.sourceUrl).toBe('https://testorg.org/vacancies/hc-42');
    expect(l.organization).toBe('Test Org');
    expect(l.location).toBe('Kabul');
    expect(l.deadline).toBe('2026-12-15');
    expect((l.extractedData as any).vacancyNumber).toBe('HC-42');
    expect(l.description).toBe('Coordinate health.');
  });

  test('non-array itemsPath throws a clear error', () => {
    expect(() => {
      const s = new JsonApiScraper(handle({ scraperKey: 'jsonApi', baseUrl: 'https://x.org', config: {} }));
      (s as unknown as { parseListPage: (t: string, u: string) => unknown }).parseListPage('{"a":1}', 'https://x.org');
    }).toThrow(/itemsPath/);
  });
});

describe('greenhouse adapter', () => {
  const json = JSON.stringify({
    jobs: [
      { id: 8842, title: 'Programme Officer', absolute_url: 'https://job-boards.greenhouse.io/testorg/jobs/8842',
        updated_at: '2026-09-28T10:00:00Z', content: '<p>Full job content.</p>',
        location: { name: 'Kabul, Afghanistan' } },
    ],
    meta: { total: 1 },
  });
  const apiUrl = 'https://boards-api.greenhouse.io/v1/boards/testorg/jobs?content=true';

  test('maps jobs with vacancyNumber + content and paginates by offset', async () => {
    const listings = await scrapeWith(
      new GreenhouseScraper(handle({ scraperKey: 'greenhouse', config: { boardToken: 'testorg' }, baseUrl: apiUrl })),
      json,
    );
    expect(listings).toHaveLength(1);
    const l = listings[0];
    expect(l.title).toBe('Programme Officer');
    expect(l.sourceUrl).toContain('/jobs/8842');
    expect(l.applyUrl).toBe(l.sourceUrl);
    expect((l.extractedData as any).vacancyNumber).toBe('8842');
    expect(l.description).toBe('Full job content.');
    expect(l.location).toBe('Kabul, Afghanistan');

    const s = new GreenhouseScraper(handle({ scraperKey: 'greenhouse', config: { boardToken: 'testorg' } }));
    const full = JSON.parse(json);
    full.jobs = Array.from({ length: 50 }, (_, i) => ({ id: i, title: `Job ${i}`, absolute_url: `https://x/${i}` }));
    const result = (s as unknown as { parseListPage: (t: string, u: string) => { nextPage: string | null } })
      .parseListPage(JSON.stringify(full), apiUrl);
    expect(result.nextPage).toContain('offset=50');
  });

  test('missing boardToken throws a clear error', () => {
    expect(() => {
      const s = new GreenhouseScraper(handle({ scraperKey: 'greenhouse', config: {} }));
      (s as unknown as { parseListPage: (t: string, u: string) => unknown }).parseListPage('{"jobs":[]}', 'https://x');
    }).toThrow(/boardToken/);
  });
});

describe('lever adapter', () => {
  const createdAt = 1780000000000; // May 2026
  const json = JSON.stringify([
    {
      id: 'aa-bb-cc', text: 'Logistics Officer', hostedUrl: 'https://jobs.lever.co/testorg/aa-bb-cc',
      applyUrl: 'https://jobs.lever.co/testorg/aa-bb-cc/apply',
      descriptionPlain: 'Run the logistics.',
      createdAt,
      categories: { location: 'Kabul, Afghanistan', commitment: 'Full-time' },
      lists: [
        { text: 'Requirements', content: ['Five years experience', 'Valid licence'] },
        { text: 'Responsibilities', content: ['Fleet management'] },
      ],
    },
  ]);

  test('maps postings incl. sections and vacancyNumber; org derived from baseUrl', async () => {
    const listings = await scrapeWith(
      new LeverScraper(handle({ scraperKey: 'lever', baseUrl: 'https://jobs.lever.co/testorg' })),
      json,
    );
    expect(listings).toHaveLength(1);
    const l = listings[0];
    expect(l.title).toBe('Logistics Officer');
    expect(l.sourceUrl).toBe('https://jobs.lever.co/testorg/aa-bb-cc');
    expect(l.applyUrl).toBe('https://jobs.lever.co/testorg/aa-bb-cc/apply');
    expect(l.location).toBe('Kabul, Afghanistan');
    expect(l.requirements).toContain('Five years experience');
    expect(l.responsibilities).toContain('Fleet management');
    expect((l.extractedData as any).vacancyNumber).toBe('aa-bb-cc');
    expect(l.publishedDate).toContain('2026'); // epoch ms → ISO
  });

  test('non-array response throws a clear error', () => {
    expect(() => {
      const s = new LeverScraper(handle({ scraperKey: 'lever', config: { org: 'nope' } }));
      (s as unknown as { parseListPage: (t: string, u: string) => unknown }).parseListPage('{"error":"not found"}', 'https://api.lever.co');
    }).toThrow(/postings array/);
  });
});
