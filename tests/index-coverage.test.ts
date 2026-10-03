/**
 * Phase 24 — index-coverage guardrail. Asserts that every index from the
 * master plan's "likely indexes" list physically exists in the database the
 * tests run against. If a future migration drops one, this fails loudly
 * before queries silently degrade to sequential scans.
 */
import { describe, test, expect, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { db } = await import('../src/lib/db');

const describeIf = isolatedTestDatabase ? describe : describe.skip;

/** plan-required indexes: table → index-name fragment(s), one assert each */
const REQUIRED: Array<[string, string, string]> = [
  ['Organization', 'Organization_slug_key', 'Organization.slug (unique)'],
  ['Opportunity', 'Opportunity_organizationId_idx', 'Opportunity.organizationId'],
  ['OpportunitySourceObservation', 'OpportunitySourceObservation_opportunityId_idx', 'Observation.opportunityId'],
  ['OpportunitySourceObservation', 'OpportunitySourceObservation_organizationId_idx', 'Observation.organizationId'],
  ['OpportunitySourceObservation', 'OpportunitySourceObservation_sourceUrl_idx', 'Observation.sourceUrl'],
  ['OpportunitySourceObservation', 'OpportunitySourceObservation_vacancyNumber_idx', 'Observation.vacancyNumber'],
  ['ImportSource', 'ImportSource_nextRunAt_idx', 'ImportSource.nextRunAt'],
  ['ImportSource', 'ImportSource_priority_idx', 'ImportSource.priority'],
  ['ImportSource', 'ImportSource_healthStatus_idx', 'ImportSource.healthStatus'],
];

describeIf('index coverage (Phase 24 guardrail)', () => {
  test('every plan-required index exists in the database', async () => {
    const rows = (await db.$queryRaw`SELECT tablename, indexname FROM pg_indexes`) as Array<{ tablename: string; indexname: string }>;
    const present = new Set(rows.map((r) => `${r.tablename}.${r.indexname}`));
    for (const [table, index, label] of REQUIRED) {
      expect(present.has(`${table}.${index}`), `missing index for ${label} (${table}.${index})`).toBe(true);
    }
  });

  test('the observation dedupe key is backed by a compound unique index', async () => {
    const rows = (await db.$queryRaw`SELECT indexname FROM pg_indexes WHERE tablename = 'OpportunitySourceObservation'`) as Array<{ indexname: string }>;
    // (opportunityId, sourceName, sourceUrl) — the upsert key that keeps
    // re-sightings from ever duplicating observations
    expect(rows.some((r) => r.indexname.includes('opportunityId_sourceName_sourc'))).toBe(true);
  });

  test('translation chunks are indexed for queue pickup (status, updatedAt)', async () => {
    const rows = (await db.$queryRaw`SELECT indexname FROM pg_indexes WHERE tablename = 'TranslationChunk'`) as Array<{ indexname: string }>;
    expect(rows.some((r) => r.indexname.includes('status_updatedAt') || r.indexname.includes('TranslationChunk_status'))).toBe(true);
  });
});
