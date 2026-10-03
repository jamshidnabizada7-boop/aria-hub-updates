/**
 * Phase 11 — organization admin actions (stats, edit, verify, merge,
 * add-source, pause/resume) against the isolated localhost *_test DB.
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const {
  listOrganizations, updateOrganization, setVerified, mergeOrganizations,
  addOfficialSource, setSourcePaused,
} = await import('../src/lib/import/organization-actions');
const { resolveOrganization } = await import('../src/lib/organizations/resolve');
const { db } = await import('../src/lib/db');

let dbUp = false;
try {
  if (isolatedTestDatabase) {
    await db.$queryRaw`SELECT 1`;
    dbUp = true;
  }
} catch {
  dbUp = false;
}

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);

const runId = Date.now().toString(36);

describeIf(dbUp)('organization admin actions (db)', () => {
  let targetId = '';
  let sourceId = '';
  const orgA = `Merge Target Org ${runId}`;
  const orgB = `Merge Source Org ${runId}`;

  beforeAll(async () => {
    await db.organizationAlias.deleteMany({ where: { organization: { slug: { contains: runId } } } });
    const stale = await db.organization.findMany({ where: { slug: { contains: runId } }, select: { id: true } });
    for (const o of stale) {
      await db.opportunity.updateMany({ where: { organizationId: o.id }, data: { organizationId: null } });
      await db.importSource.updateMany({ where: { organizationId: o.id }, data: { organizationId: null } });
      await db.opportunitySourceObservation.updateMany({ where: { organizationId: o.id }, data: { organizationId: null } });
      await db.organization.delete({ where: { id: o.id } });
    }
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `orgadmin-${runId}` } } });

    targetId = (await resolveOrganization(db, orgA)).organization!.id;
    sourceId = (await resolveOrganization(db, orgB)).organization!.id;

    // B owns an opportunity, a source, an observation, and an extra alias
    await db.opportunity.create({
      data: { slug: `orgadmin-opp-${runId}`, title: 'B Job', description: 'x'.repeat(40), status: 'published', organizationId: sourceId, organization: orgB },
    });
    await db.importSource.create({
      data: { name: `OrgAdminSrc-${runId}`, type: 'job', scraperKey: 'officialHtml', baseUrl: 'https://b.example.org', organizationId: sourceId },
    });
    await db.organizationAlias.create({
      data: { organizationId: sourceId, alias: 'B Nickname', normalized: `b nickname ${runId}` },
    });
  });

  afterAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `orgadmin-${runId}` } } });
    await db.importSource.deleteMany({ where: { name: { contains: `OrgAdminSrc-${runId}` } } });
    await db.auditLog.deleteMany({ where: { action: { startsWith: 'organization.' }, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
    await db.organizationAlias.deleteMany({ where: { organization: { slug: { contains: runId } } } });
    const leftover = await db.organization.findMany({ where: { slug: { contains: runId } }, select: { id: true } });
    for (const o of leftover) await db.organization.delete({ where: { id: o.id } });
  });

  test('list reports active jobs and source health per org', async () => {
    const rows = await listOrganizations(db);
    const a = rows.find((r: any) => r.id === targetId)!;
    const b = rows.find((r: any) => r.id === sourceId)!;
    expect(a.activeJobs).toBe(0);
    expect(b.activeJobs).toBe(1);
    expect(b.sourceCount).toBe(1);
    expect(b.sources[0].healthStatus).toBe('healthy');
  });

  test('edit updates identity fields incl. officialDomains parsing', async () => {
    await updateOrganization(db, targetId, {
      website: 'https://target.example.org',
      officialDomains: 'target.example.org, jobs.target.example.org',
    }, 'admin@test');
    const org = await db.organization.findUnique({ where: { id: targetId } });
    expect(org!.website).toBe('https://target.example.org');
    expect(org!.officialDomains).toEqual(['target.example.org', 'jobs.target.example.org']);
  });

  test('verify / unverify set and clear the badge', async () => {
    await setVerified(db, targetId, true, 'official_email', 'admin@test');
    let org = await db.organization.findUnique({ where: { id: targetId } });
    expect(org!.verified).toBe(true);
    expect(org!.verificationMethod).toBe('official_email');
    expect(org!.verifiedAt).toBeTruthy();
    await setVerified(db, targetId, false, null, 'admin@test');
    org = await db.organization.findUnique({ where: { id: targetId } });
    expect(org!.verified).toBe(false);
    expect(org!.verificationMethod).toBeNull();
  });

  test('merge moves opportunities, sources, aliases and name-alias; deletes B', async () => {
    const result = await mergeOrganizations(db, targetId, sourceId, 'admin@test');
    expect(result.movedOpportunities).toBe(1);
    expect(result.movedSources).toBe(1);
    expect(result.movedAliases).toBeGreaterThanOrEqual(1);

    const gone = await db.organization.findUnique({ where: { id: sourceId } });
    expect(gone).toBeNull();

    const target = await db.organization.findUnique({
      where: { id: targetId }, include: { aliases: true, sources: true },
    });
    // B's name survives as an alias of A → future free-text resolves to A
    expect(target!.aliases.some((al: any) => al.normalized === orgB.toLowerCase())).toBe(true);
    expect(target!.sources.some((s: any) => s.name === `OrgAdminSrc-${runId}`)).toBe(true);

    const opp = await db.opportunity.findUnique({ where: { slug: `orgadmin-opp-${runId}` } });
    expect(opp!.organizationId).toBe(targetId);

    // free-text name of B now resolves to the merged org
    const resolved = await resolveOrganization(db, orgB, { createIfMissing: false });
    expect(resolved.organization?.id).toBe(targetId);
  });

  test('merge refuses self-merge and unknown orgs', async () => {
    let selfErr: unknown = null;
    try { await mergeOrganizations(db, targetId, targetId, 'x'); } catch (e) { selfErr = e; }
    expect(String(selfErr)).toMatch(/itself/);
    let missingErr: unknown = null;
    try { await mergeOrganizations(db, targetId, 'nope', 'x'); } catch (e) { missingErr = e; }
    expect(String(missingErr)).toMatch(/not found/);
  });

  test('add-source always creates with autoPublish=false and pause/resume toggles health', async () => {
    const id = await addOfficialSource(db, targetId, {
      name: `AddedSrc-${runId}`, scraperKey: 'rssOpportunity', baseUrl: 'https://target.example.org/feed',
    }, 'admin@test');
    const src = await db.importSource.findUnique({ where: { id } });
    expect(src!.autoPublish).toBe(false);
    expect(src!.sourceRole).toBe('official_careers');
    expect(src!.organizationId).toBe(targetId);

    await setSourcePaused(db, id, true, 'admin@test');
    expect((await db.importSource.findUnique({ where: { id } }))!.healthStatus).toBe('paused');
    await setSourcePaused(db, id, false, 'admin@test');
    expect((await db.importSource.findUnique({ where: { id } }))!.healthStatus).toBe('healthy');
  });
});
