/**
 * Phase 21 — source suggestion engine: aggregator discoveries become
 * official-source candidates. Isolated *_test DB.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { recordSuggestion, listSuggestions, confirmSuggestion, dismissSuggestion } =
  await import('../src/lib/import/source-suggestions');
const { resolveOrganization } = await import('../src/lib/organizations/resolve');
const { db } = await import('../src/lib/db');

let dbUp = false;
try {
  if (isolatedTestDatabase) await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch { dbUp = false; }

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);
const runId = Date.now().toString(36);

describeIf(dbUp)('source suggestions (db)', () => {
  let orgId = '';
  const displayName = `Novus Aid Group ${runId}`;

  beforeAll(async () => {
    await db.organizationSourceSuggestion.deleteMany({ where: { suggestedName: { contains: runId } } });
    await db.organizationAlias.deleteMany({ where: { organization: { slug: { contains: `sugg21-${runId}` } } } });
    await db.organization.deleteMany({ where: { slug: { contains: `sugg21-${runId}` } } });
    orgId = (await db.organization.create({ data: { name: `Known Org ${runId}`, slug: `sugg21-known-${runId}` } })).id;
  });

  afterAll(async () => {
    await db.organizationSourceSuggestion.deleteMany({ where: { suggestedName: { contains: runId } } });
    await db.organizationAlias.deleteMany({ where: { organization: { slug: { contains: `sugg21-${runId}` } } } });
    await db.organization.deleteMany({ where: { slug: { contains: `sugg21-${runId}` } } });
    await db.auditLog.deleteMany({ where: { action: { startsWith: 'suggestion.' }, createdAt: { gte: new Date(Date.now() - 3600_000) } } }).catch(() => null);
  });

  test('unknown org + plausible domain evidence → suggestion created with evidence', async () => {
    const result = await recordSuggestion(db, {
      displayName,
      applyUrl: `https://careers.novusaid-${runId}.org/apply/123?utm_source=acbar`,
      applyEmail: `jobs@novusaid-${runId}.org`,
      sampleSourceUrl: `https://www.acbar.org/listing/${runId}`,
      sampleSourceName: 'ACBAR',
    });
    expect(result).toBe('created');
    const suggestion = await db.organizationSourceSuggestion.findUnique({ where: { suggestedName: `novus aid group ${runId}` } });
    expect(suggestion?.status).toBe('pending');
    expect(suggestion?.occurrences).toBe(1);
    expect((suggestion?.evidenceDomains as string[])?.[0]).toContain(`novusaid-${runId}.org`);
    expect(suggestion?.sampleSourceName).toBe('ACBAR');
  });

  test('repeat sightings raise occurrences and merge evidence; reviewed ones keep their verdict', async () => {
    await recordSuggestion(db, {
      displayName: displayName.toUpperCase(),
      applyEmail: `info@novusaid-${runId}.org`,
    });
    const suggestion = await db.organizationSourceSuggestion.findUnique({ where: { suggestedName: `novus aid group ${runId}` } });
    expect(suggestion?.occurrences).toBe(2);
    expect((suggestion?.evidenceEmails as string[])).toHaveLength(2);
  });

  test('canonicalized org or aggregator-only evidence → skipped', async () => {
    // canonical org already exists → nothing to suggest
    expect(await recordSuggestion(db, { displayName: `Known Org ${runId}`, applyEmail: `x@known-${runId}.org` })).toBe('skipped-canonical');
    // evidence domain is an aggregator/mail-provider → no signal
    expect(await recordSuggestion(db, { displayName: `Mystery Org ${runId}`, applyEmail: 'jobs@acbar.org' })).toBe('skipped-no-evidence');
    expect(await recordSuggestion(db, { displayName: `Mystery2 Org ${runId}`, applyUrl: 'https://gmail.com/x' })).toBe('skipped-no-evidence');
  });

  test('confirm links (or creates) the organization; dismiss records the verdict', async () => {
    const suggestion = await db.organizationSourceSuggestion.findUnique({ where: { suggestedName: `novus aid group ${runId}` } });
    const confirmed = await confirmSuggestion(db, suggestion!.id, 'admin@test');
    expect(confirmed.created).toBe(true); // the org did not exist yet
    const after = await db.organizationSourceSuggestion.findUnique({ where: { id: suggestion!.id } });
    expect(after!.status).toBe('confirmed');
    expect(after!.organizationId).toBeTruthy();
    // and the org now resolves by the suggested name
    expect((await resolveOrganization(db, displayName, { createIfMissing: false })).organization?.id).toBe(after!.organizationId);

    // dismissal path
    await recordSuggestion(db, { displayName: `Dismissed Org ${runId}`, applyEmail: `contact@dismissed-${runId}.org` });
    const dismissed = await db.organizationSourceSuggestion.findUnique({ where: { suggestedName: `dismissed org ${runId}` } });
    await dismissSuggestion(db, dismissed!.id, 'admin@test');
    expect((await db.organizationSourceSuggestion.findUnique({ where: { id: dismissed!.id } }))!.status).toBe('dismissed');

    // only pending items appear in the working list
    const pending = await listSuggestions(db);
    expect(pending.find((s: any) => s.id === suggestion!.id)).toBeUndefined();
    expect(pending.find((s: any) => s.id === dismissed!.id)).toBeUndefined();
  });

  test('confirm on a missing suggestion errors clearly', async () => {
    let err: unknown = null;
    try { await confirmSuggestion(db, 'nope', 'admin@test'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/not found/);
  });
});
