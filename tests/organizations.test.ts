/**
 * Phase 1 — Organization data model.
 * Verifies the new Organization table, slug uniqueness, the optional
 * Opportunity.organizationRef relation, and that existing opportunities
 * (free-text `organization` string only) remain fully readable.
 *
 * Same DB guard as publish-safety.test.ts: runs only against an isolated
 * localhost database whose name ends in _test / _fresh, so production and
 * the shared dev database can never be touched by a test run.
 */
import { describe, test, expect, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

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

// Unique-per-run slug prefix so re-runs never collide with leftovers.
const runId = Date.now().toString(36);
const orgSlug = `test-org-${runId}`;
const dupOrgSlug = `test-org-dup-${runId}`;
const legacyOppSlug = `test-legacy-opp-${runId}`;
const linkedOppSlug = `test-linked-opp-${runId}`;

describeIf(dbUp)('Organization model (Phase 1)', () => {
  afterAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { in: [legacyOppSlug, linkedOppSlug] } } });
    await db.organization.deleteMany({ where: { slug: { in: [orgSlug, dupOrgSlug] } } });
  });

  test('organization creation with all Phase 1 fields', async () => {
    const org = await db.organization.create({
      data: {
        name: 'Test Aid Org',
        slug: orgSlug,
        nameI18n: { en: 'Test Aid Org', fa: 'سازمان کمکی آزمایشی' },
        website: 'https://example.org',
        careersUrl: 'https://careers.example.org',
        country: 'Afghanistan',
        organizationType: 'ngo',
        description: 'A test organization used by the Phase 1 test suite.',
        officialDomains: ['example.org', 'careers.example.org'],
      },
    });
    expect(org.id).toBeTruthy();
    expect(org.slug).toBe(orgSlug);
    expect(org.verified).toBe(false);
    expect(org.active).toBe(true);
    expect(Array.isArray(org.officialDomains)).toBe(true);

    const read = await db.organization.findUnique({ where: { slug: orgSlug } });
    expect(read?.name).toBe('Test Aid Org');
    expect((read?.nameI18n as any)?.fa).toBe('سازمان کمکی آزمایشی');
  });

  test('slug uniqueness is enforced', async () => {
    let dupError: unknown = null;
    try {
      await db.organization.create({ data: { name: 'Duplicate Org', slug: orgSlug } });
    } catch (e) {
      dupError = e;
    }
    expect(dupError).toBeTruthy();
    expect(String(dupError)).toContain('Unique constraint');
    // A different slug for a second org still works.
    const dup = await db.organization.create({ data: { name: 'Second Org', slug: dupOrgSlug } });
    expect(dup.slug).toBe(dupOrgSlug);
  });

  test('optional Opportunity ↔ Organization relationship works', async () => {
    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    expect(org).toBeTruthy();

    const linked = await db.opportunity.create({
      data: {
        slug: linkedOppSlug,
        title: 'Linked Test Job',
        description: 'Opportunity linked to a canonical organization.',
        status: 'draft',
        organization: 'Test Aid Org',
        organizationId: org!.id,
      },
    });
    expect(linked.organizationId).toBe(org!.id);

    const withOrg = await db.opportunity.findUnique({
      where: { slug: linkedOppSlug },
      include: { organizationRef: true },
    });
    expect(withOrg?.organizationRef?.slug).toBe(orgSlug);
    expect(withOrg?.organization).toBe('Test Aid Org'); // string fallback untouched

    const orgSide = await db.organization.findUnique({
      where: { slug: orgSlug },
      include: { opportunities: { where: { slug: linkedOppSlug } } },
    });
    expect(orgSide?.opportunities).toHaveLength(1);
  });

  test('existing opportunities without an organization remain readable', async () => {
    const legacy = await db.opportunity.create({
      data: {
        slug: legacyOppSlug,
        title: 'Legacy Free-Text Job',
        description: 'Created the old way — free-text organization only.',
        status: 'published',
        organization: 'Some Unresolved Org Name',
      },
    });
    expect(legacy.organization).toBe('Some Unresolved Org Name');
    expect(legacy.organizationId).toBeNull();

    const read = await db.opportunity.findUnique({
      where: { slug: legacyOppSlug },
      include: { organizationRef: true, locations: true },
    });
    expect(read).toBeTruthy();
    expect(read?.organizationRef).toBeNull();
    expect(read?.organization).toBe('Some Unresolved Org Name');
  });

  test('deleting an organization nulls the FK but preserves the string fallback', async () => {
    const linked = await db.opportunity.findUnique({ where: { slug: linkedOppSlug } });
    expect(linked?.organizationId).toBeTruthy();

    await db.organization.delete({ where: { slug: orgSlug } });

    const after = await db.opportunity.findUnique({ where: { slug: linkedOppSlug } });
    expect(after?.organizationId).toBeNull();
    expect(after?.organization).toBe('Test Aid Org'); // display fallback survives
  });
});
