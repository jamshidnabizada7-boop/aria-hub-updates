/**
 * Phase 9 guardrail — the official-source seed stays small, verified, and
 * strictly autoPublish=false. If someone adds a row that would auto-publish,
 * uses an unregistered scraperKey, or a non-https URL, this fails before it
 * can reach any database.
 */
import { describe, test, expect, mock } from 'bun:test';

mock.module('server-only', () => ({}));

const { OFFICIAL_SOURCE_SEEDS, OFFICIAL_SOURCES_AUTOPUBLISH } =
  await import('../scripts/seed-official-sources');
const { SCRAPERS } = await import('../src/lib/import/registry');
const { SOURCE_ROLES, ROLE_TRUST } = await import('../src/lib/import/source-observations');

describe('official-source seed guardrails (Phase 9)', () => {
  test('the batch stays small (plan: 10-15 max, start smaller)', () => {
    expect(OFFICIAL_SOURCE_SEEDS.length).toBeGreaterThanOrEqual(2);
    expect(OFFICIAL_SOURCE_SEEDS.length).toBeLessThanOrEqual(15);
  });

  test('NOTHING auto-publishes — every import stays in draft/review', () => {
    expect(OFFICIAL_SOURCES_AUTOPUBLISH).toBe(false);
  });

  test('every row uses a registered scraper and a declared source role', () => {
    for (const seed of OFFICIAL_SOURCE_SEEDS) {
      expect(SCRAPERS[seed.scraperKey], `${seed.name}: scraperKey`).toBeTruthy();
      expect(SOURCE_ROLES as readonly string[]).toContain(seed.sourceRole);
      expect(ROLE_TRUST[seed.sourceRole as keyof typeof ROLE_TRUST]).toBeDefined();
    }
  });

  test('urls are https, configs parse, schedules and priorities are sane', () => {
    for (const seed of OFFICIAL_SOURCE_SEEDS) {
      expect(seed.baseUrl.startsWith('https://'), `${seed.name}: baseUrl`).toBe(true);
      expect(seed.scheduleMinutes).toBeGreaterThanOrEqual(5);
      expect(seed.priority).toBeGreaterThan(0);
      expect(() => JSON.stringify(seed.config)).not.toThrow();
      expect(seed.organization.officialDomains.length).toBeGreaterThan(0);
      for (const d of seed.organization.officialDomains) {
        expect(d.includes('acbar.org') || d.includes('wazifaha.org')).toBe(false);
      }
    }
  });

  test('each seed carries a verified organization with type + domains', () => {
    for (const seed of OFFICIAL_SOURCE_SEEDS) {
      expect(seed.organization.name).toBeTruthy();
      expect(['ngo', 'un_agency', 'government', 'university', 'company', 'embassy', 'scholarship_provider', 'other'])
        .toContain(seed.organization.organizationType);
    }
  });
});
