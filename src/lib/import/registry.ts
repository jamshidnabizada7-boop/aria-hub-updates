/**
 * Scraper registry.
 *
 * Maps a `scraperKey` (stored on each ImportSource row) to a BaseScraper
 * subclass constructor.
 *
 * ── HOW TO ADD A NEW SOURCE (2 steps, often ZERO code) ──────────────────────
 *
 * Step 1 — pick a scraperKey:
 *   • WordPress site (has /wp-json/wp/v2/posts)?  → reuse the generic
 *     `wpApi` scraper. No code needed.
 *   • RSS 2.0 news feed?                          → reuse `rssNews` (type
 *     must be 'news'). No code needed.
 *   • Custom site / API?                          → write a subclass of
 *     BaseScraper in `./scrapers/<name>.ts` and register it below (Step 2).
 *
 * Step 2 — create one ImportSource row (SQL insert, seed script, or the
 *   admin UI), e.g. for a WordPress site:
 *
 *     INSERT INTO "ImportSource"
 *       (id, name, type, "scraperKey", "baseUrl", enabled, "autoPublish", config)
 *     VALUES
 *       (gen_random_uuid()::text, 'New WP Source', 'scholarship', 'wpApi',
 *        'https://example.org', true, false,
 *        '{"apiBase":"https://example.org/wp-json/wp/v2/posts","perPage":20,
 *          "maxPages":2,"categoryInclude":["Scholarships"],
 *          "defaultDeadlineDays":45,"autoDetectType":true}');
 *
 * That's it — `bun run scripts/run-import.ts --source="New WP Source"` or the
 * admin panel "Run Now" button will import it. Only add an entry to SCRAPERS
 * below when you wrote a brand-new scraper class.
 */

import { BaseScraper } from './base-scraper';
import { WazifahaScraper } from './scrapers/wazifaha';
import { ScholarshipsAfScraper } from './scrapers/scholarships-af';
import { AcbarScraper } from './scrapers/acbar';
import { O4afScraper } from './scrapers/o4af';
import { WpApiScraper } from './scrapers/wp-api';
import { JobsAfScraper } from './scrapers/jobs-af';
import { ReliefWebScraper } from './scrapers/reliefweb';

/**
 * Placeholder for `rssNews` sources: news imports are handled by
 * `runNewsImport()` (see news-import.ts + /api/admin/import/news), NOT by the
 * Opportunity pipeline. This stub only exists so a news source can never be
 * accidentally scraped into the Opportunity table — it returns no listings
 * and logs where the request should go instead.
 */
class RssNewsStubScraper extends BaseScraper {
  public async scrapeAll(): Promise<never[]> {
    console.warn(
      `[registry] Source "${this.source.name}" uses scraperKey 'rssNews' — ` +
        'run it via POST /api/admin/import/news (or the admin "Import News" action), ' +
        'not the opportunity pipeline. Skipping.',
    );
    return [];
  }

  protected parseListPage(): { listings: never[]; nextPage: null } {
    return { listings: [], nextPage: null };
  }
}

export const SCRAPERS: Record<string, new (...args: ConstructorParameters<typeof BaseScraper>) => BaseScraper> = {
  wazifaha: WazifahaScraper,
  scholarshipsAf: ScholarshipsAfScraper,
  acbar: AcbarScraper,
  o4af: O4afScraper,
  // ── Generic / config-driven adapters ──
  wpApi: WpApiScraper,        // any WordPress REST API site
  jobsaf: JobsAfScraper,      // jobs.af (Next.js RSC flight payload)
  reliefweb: ReliefWebScraper, // ReliefWeb API v2 (needs approved appname)
  rssNews: RssNewsStubScraper, // RSS → News table (dedicated pipeline)
};

/**
 * Instantiate a scraper for a given source handle. Returns null if no
 * scraper is registered for the source's scraperKey.
 */
export function getScraper(source: ConstructorParameters<typeof BaseScraper>[0]): BaseScraper | null {
  const Ctor = SCRAPERS[source.scraperKey];
  return Ctor ? new Ctor(source) : null;
}
