import { afterAll, describe, expect, test } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { extractWpFacts } from '../src/lib/import/scrapers/wp-api';
import { ScholarshipsAfScraper } from '../src/lib/import/scrapers/scholarships-af';
import { evaluateImportedDraftPublication, reconcileImportedDrafts, type PublicationCandidate, type PublicationSource } from '../src/lib/import/automatic-publication';

const now = new Date('2026-10-10T12:00:00Z');
const source: PublicationSource = { id: 'fixture', name: 'Fixture Jobs', baseUrl: 'https://jobs.example.org', enabled: true, autoPublish: true, healthStatus: 'healthy' };
const candidate: PublicationCandidate = { status: 'draft', title: 'Finance Officer', description: 'A genuine opportunity with detailed qualifications and responsibilities. '.repeat(5),
  sourceName: source.name, sourceUrl: source.baseUrl + '/jobs/123', importStatus: 'imported', deadline: new Date('2026-11-01'),
  applyUrl: 'mailto:jobs@example.org', applyUrlType: 'application_email', verificationStatus: 'single_source' };

describe('automatic import publication quality', () => {
  test('scholarship h3 application section is extracted from the full detail page', async () => {
    const scraper = new ScholarshipsAfScraper({ id: 'fixture', name: 'Scholarships.af', type: 'scholarship', scraperKey: 'scholarshipsAf', baseUrl: 'https://scholarships.af', defaultCategory: null, config: {} });
    const instructions = 'Contact the international office at your chosen university. The university must nominate eligible students through the official scholarship system.';
    scraper.fetchText = async () => '<div class="jobsearch-description"><p>A scholarship with a full description for international students seeking graduate studies.</p><h3>How to apply for the scholarship?</h3><p>' + instructions + '</p><h4>Related opportunities</h4><p>Unrelated article links.</p></div>';
    const parsed = await scraper.parseDetail({ title: 'Scholarship', sourceName: 'Scholarships.af', sourceUrl: 'https://scholarships.af/opportunity/fixture', description: '', applyUrl: null });
    expect(parsed.guidelines).toBe(instructions);
    expect(parsed.guidelines).not.toContain('Unrelated');
  });
  test('standalone Application heading preserves instructions without treating narrative as a heading', () => {
    const instructions = 'Submit a research proposal and CV through the official application portal. Two referees must submit references.';
    expect(extractWpFacts('Application\n' + instructions).guidelines).toBe(instructions);
    expect(extractWpFacts('Application deadlines vary between institutions.\n' + instructions).guidelines).toBeNull();
  });
  test('verified import can publish before translations finish', () => {
    expect(evaluateImportedDraftPublication(candidate, source, false, now)).toEqual({ action: 'publish', reasons: [] });
  });
  test('manual holds and deliberate source opt-out stay unpublished', () => {
    expect(evaluateImportedDraftPublication(candidate, source, true, now).reasons).toContain('manual_hold');
    expect(evaluateImportedDraftPublication(candidate, { ...source, autoPublish: false }, false, now).action).toBe('hold');
    expect(evaluateImportedDraftPublication({ ...candidate, sourceName: null, importStatus: null }, source, false, now).action).toBe('hold');
  });
  test('expired/explicitly closed imports are retired, archived content is never revived', () => {
    expect(evaluateImportedDraftPublication({ ...candidate, deadline: new Date('2026-10-09') }, source, false, now).action).toBe('expire');
    expect(evaluateImportedDraftPublication({ ...candidate, extractedData: { listingStatus: 'closed' } }, source, false, now).action).toBe('expire');
    expect(evaluateImportedDraftPublication({ ...candidate, status: 'archived' }, source, false, now).action).toBe('hold');
  });
  test('bad/challenge content, unsafe destinations and ambiguous matches are held', () => {
    for (const change of [{ title: 'Just a moment' }, { description: 'A role.' }, { sourceUrl: 'https://other.example.org/jobs/123' },
      { applyUrl: 'http://127.0.0.1/private' }, { applyUrl: 'mailto:invalid' }, { verificationStatus: 'needs_review' }]) {
      expect(evaluateImportedDraftPublication({ ...candidate, ...change }, source, false, now).action).toBe('hold');
    }
    expect(evaluateImportedDraftPublication(candidate, source, false, now, true).reasons).toContain('match_review');
  });
  test('short Dari title and structured job details are valid; fallback needs application instructions', () => {
    expect(evaluateImportedDraftPublication({ ...candidate, title: 'قابله', description: 'وظیفه برای یک قابله در مرکز صحی در کابل.', requirements: candidate.description }, source, false, now).action).toBe('publish');
    const fallback = { ...candidate, applyUrl: candidate.sourceUrl, applyUrlType: 'source_article_fallback' };
    expect(evaluateImportedDraftPublication(fallback, source, false, now).reasons).toContain('missing_application_route');
    expect(evaluateImportedDraftPublication({ ...fallback, guidelines: 'Visit the source listing for the employer application instructions, documents required and submission process.' }, source, false, now).action).toBe('publish');
  });
});

const db = new PrismaClient();
const sources: string[] = [], rows: string[] = [];
const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://localhost/unavailable');
const safeDatabase = ['localhost', '127.0.0.1', '::1'].includes(dbUrl.hostname) && dbUrl.pathname.endsWith('_test');
if (process.env.REQUIRE_TEST_DATABASE === '1' && !safeDatabase) throw Error('isolated_test_database_required');
afterAll(async () => {
  if (rows.length) {
    await db.auditLog.deleteMany({ where: { entityId: { in: rows } } });
    await db.opportunity.deleteMany({ where: { id: { in: rows } } });
  }
  if (sources.length) await db.importSource.deleteMany({ where: { id: { in: sources } } });
  await db.$disconnect();
});

(safeDatabase ? test : test.skip)('real database: backlog publication, expiry, manual moderation, consent toggle, concurrency and pagination', async () => {
  const fixture = await db.importSource.create({ data: { name: 'Publication Fixture ' + crypto.randomUUID(), type: 'job', scraperKey: 'jobsaf', baseUrl: source.baseUrl, autoPublish: true, enabled: true, healthStatus: 'healthy' } });
  sources.push(fixture.id);
  async function create(extra: Record<string, unknown> = {}) {
    const { status, title, description, sourceUrl, importStatus, applyUrl, applyUrlType, verificationStatus } = candidate;
    const row = await db.opportunity.create({ data: { status: status as 'draft', title, description, sourceUrl: sourceUrl + '-' + crypto.randomUUID(), importStatus, applyUrl, applyUrlType, verificationStatus,
      sourceName: fixture.name, slug: 'publication-fixture-' + crypto.randomUUID(), deadline: new Date(Date.now() + 7 * 86400_000), ...extra } });
    rows.push(row.id); return row;
  }
  const ready = await create(), stale = await create({ deadline: new Date('2020-01-01') }), held = await create(), thin = await create({ description: 'Missing full description.' });
  await db.auditLog.create({ data: { entity: 'opportunity', entityId: held.id, action: 'opportunity.manual-draft' } });
  const preview = await reconcileImportedDrafts(db, { dryRun: true, ids: rows });
  expect(preview.decisions.find(d => d.id === ready.id)?.action).toBe('publish');
  expect((await db.opportunity.findUniqueOrThrow({ where: { id: ready.id } })).status).toBe('draft');
  const runs = await Promise.all([reconcileImportedDrafts(db, { ids: rows }), reconcileImportedDrafts(db, { ids: rows })]);
  expect(runs.reduce((n, r) => n + r.published, 0)).toBe(1);
  expect((await db.opportunity.findUniqueOrThrow({ where: { id: stale.id } })).status).toBe('expired');
  expect((await db.opportunity.findUniqueOrThrow({ where: { id: held.id } })).status).toBe('draft');
  expect((await db.opportunity.findUniqueOrThrow({ where: { id: thin.id } })).status).toBe('draft');
  expect(await db.auditLog.count({ where: { entityId: ready.id, action: 'opportunity.automatic-publication' } })).toBe(1);
  expect((await reconcileImportedDrafts(db, { ids: rows })).published).toBe(0);
  const paused = await create();
  await db.importSource.update({ where: { id: fixture.id }, data: { autoPublish: false } });
  expect((await reconcileImportedDrafts(db, { ids: [paused.id] })).published).toBe(0);
  await db.importSource.update({ where: { id: fixture.id }, data: { autoPublish: true } });
  const first = await reconcileImportedDrafts(db, { ids: rows, dryRun: true, limit: 1 });
  expect(first.nextCursor).toBeDefined();
  const second = await reconcileImportedDrafts(db, { ids: rows, dryRun: true, limit: 1, cursor: first.nextCursor });
  expect(second.decisions[0].id).not.toBe(first.decisions[0].id);
});
