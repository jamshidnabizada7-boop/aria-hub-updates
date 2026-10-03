/**
 * Phase 15 — public organization profile. The critical guarantee: the public
 * layer NEVER leaks internal import machinery (scraper keys, source roles,
 * trust scores, import status, dedupe confidence, run logs).
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { getPublicOrganization } = await import('../src/lib/organizations/public-profile');
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
const slug = `public-org-${runId}`;

describeIf(dbUp)('public organization profile (db)', () => {
  let orgId = '';
  let publishedSlug = '';
  let draftSlug = '';
  let expiredSlug = '';

  beforeAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `pub15-${runId}` } } });
    await db.organizationAlias.deleteMany({ where: { organization: { slug } } });
    await db.organization.deleteMany({ where: { slug } });

    orgId = (await db.organization.create({
      data: {
        name: `Public Org ${runId}`, slug,
        organizationType: 'ngo', country: 'Afghanistan',
        description: 'A public test organization.',
        verified: true, verifiedAt: new Date(),
        website: 'https://publicorg.example.org',
      },
    })).id;

    publishedSlug = `pub15-active-${runId}`;
    draftSlug = `pub15-draft-${runId}`;
    expiredSlug = `pub15-expired-${runId}`;
    await db.opportunity.create({ data: { slug: publishedSlug, title: 'Active Public Job', description: 'x'.repeat(80), status: 'published', organizationId: orgId, organization: `Public Org ${runId}` } });
    await db.opportunity.create({ data: { slug: draftSlug, title: 'Draft Job (must be hidden)', description: 'x'.repeat(80), status: 'draft', organizationId: orgId } });
    await db.opportunity.create({ data: { slug: expiredSlug, title: 'Expired Job (must be hidden)', description: 'x'.repeat(80), status: 'expired', organizationId: orgId, deadline: new Date('2026-01-01') } });
  });

  afterAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `pub15-${runId}` } } });
    await db.organizationAlias.deleteMany({ where: { organizationId: orgId } });
    await db.organization.delete({ where: { id: orgId } });
  });

  test('returns safe identity fields + only published, unexpired opportunities', async () => {
    const org = await getPublicOrganization(slug, 'en');
    expect(org).toBeTruthy();
    expect(org!.name).toBe(`Public Org ${runId}`);
    expect(org!.verified).toBe(true);
    expect(org!.opportunities).toHaveLength(1);
    expect(org!.opportunities[0].slug).toBe(publishedSlug);

    // the leak wall: NO internal machinery in the payload
    const serialized = JSON.stringify(org);
    for (const banned of ['sourceRole', 'trustScore', 'scraperKey', 'importStatus', 'contentHash', 'matchReview', 'sourceUrl', 'lastRunStatus', 'officialDomains']) {
      expect(serialized.includes(banned), `leaked: ${banned}`).toBe(false);
    }
  });

  test('i18n: fa falls back to base name/description', async () => {
    const org = await getPublicOrganization(slug, 'fa');
    expect(org?.name).toBe(`Public Org ${runId}`);
  });

  test('unknown or inactive slug → null', async () => {
    expect(await getPublicOrganization(`missing-${runId}`, 'en')).toBeNull();
    await db.organization.update({ where: { id: orgId }, data: { active: false } });
    expect(await getPublicOrganization(slug, 'en')).toBeNull();
    await db.organization.update({ where: { id: orgId }, data: { active: true } });
  });
});
