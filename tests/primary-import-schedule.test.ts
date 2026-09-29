import { expect, test } from 'bun:test';
import { selectScheduledOpportunitySource, type ScheduledSource } from '../src/lib/automation/import-selection';
import { isExpiredListingDeadline } from '../src/lib/import/utils';
import { O4afScraper } from '../src/lib/import/scrapers/o4af';
import { ScholarshipsAfScraper } from '../src/lib/import/scrapers/scholarships-af';
import { curlArgs } from '../src/lib/import/scrapers/curl-fallback';

const now = new Date('2026-09-29T12:00:00.000Z');
const source = (name: string, scraperKey: string, lastRunAt: string | null, remainingNew = 0): ScheduledSource => ({
  id: name,
  name,
  scraperKey,
  lastRunAt: lastRunAt ? new Date(lastRunAt) : null,
  lastRunStatus: null,
  lastRunStats: JSON.stringify({ remainingNew }),
});

test('daily primary sources run before older weekly sources', () => {
  const rows = [
    source('Other', 'wpApi', null),
    source('ACBAR', 'acbar', '2026-09-27T12:00:00.000Z'),
    source('Wazifaha', 'wazifaha', '2026-09-28T11:00:00.000Z'),
  ];
  expect(selectScheduledOpportunitySource(rows, now)?.name).toBe('ACBAR');
});

test('unfinished new listings get another slot after one hour', () => {
  const rows = [
    source('Other', 'wpApi', null),
    source('Wazifaha', 'wazifaha', '2026-09-29T10:30:00.000Z', 7),
  ];
  expect(selectScheduledOpportunitySource(rows, now)?.name).toBe('Wazifaha');
  expect(selectScheduledOpportunitySource(rows, new Date('2026-09-29T11:00:00.000Z'))?.name).toBe('Other');
});

test('secondary opportunity sources run weekly, not daily', () => {
  const rows = [source('Other', 'wpApi', '2026-09-27T12:00:00.000Z')];
  expect(selectScheduledOpportunitySource(rows, now)).toBeNull();
  expect(selectScheduledOpportunitySource(rows, new Date('2026-10-05T12:00:00.000Z'))?.name).toBe('Other');
});

test('primary sources are due twice daily', () => {
  const rows = [source('ACBAR', 'acbar', '2026-09-29T01:00:00.000Z')];
  expect(selectScheduledOpportunitySource(rows, now)).toBeNull();
  expect(selectScheduledOpportunitySource(rows, new Date('2026-09-29T13:00:00.000Z'))?.name).toBe('ACBAR');
});

test('deadline dated today remains valid; past dates are skipped', () => {
  expect(isExpiredListingDeadline('2026-09-29', now)).toBe(false);
  expect(isExpiredListingDeadline('2026-09-28', now)).toBe(true);
  expect(isExpiredListingDeadline('2026-09-30', now)).toBe(false);
});

test('scheduled source URLs reach the mixed opportunity lists', () => {
  const base = { id: 'test', name: 'test', type: 'scholarship', defaultCategory: null };
  const o4af = new O4afScraper({ ...base, scraperKey: 'o4af', baseUrl: 'https://o4af.com', config: { recentOnly: true } });
  const scholarships = new ScholarshipsAfScraper({
    ...base,
    scraperKey: 'scholarshipsAf',
    baseUrl: 'https://scholarships.af/opportunities/?job_type=scholarship',
    config: { recentOnly: true },
  });
  expect(o4af.source.baseUrl).toBe('https://o4af.com/opportunities/');
  expect(scholarships.source.baseUrl).toBe('https://scholarships.af/opportunities/');
});

test('curl advertises only encodings supported by its own binary', () => {
  const args = curlArgs('https://example.org', { 'Accept-Encoding': 'gzip, deflate, br', Accept: 'text/html' }, 10000);
  expect(args).toContain('--compressed');
  expect(args.join(' ')).not.toContain('Accept-Encoding:');
  expect(args.join(' ')).toContain('Accept: text/html');
});
