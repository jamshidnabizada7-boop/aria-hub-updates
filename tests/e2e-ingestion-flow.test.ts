/**
 * Phase 25 — LOCAL END-TO-END simulation of the full workflow.
 *
 * The plan's six scenarios, driven through the REAL pipeline: stub scrapers
 * are injected into the registry (zero network) and the real runImport runs
 * dedupe → canonical resolution → observations → apply resolver → locations
 * → verification → translation (scripted Persian/Pashto provider).
 *
 *   1. official source publishes → one opportunity, official observation,
 *      apply URL resolved, location parsed, translated
 *   2. ACBAR publishes the same vacancy → NO duplicate, second observation
 *   3. Wazifaha publishes it → still one opportunity, third observation
 *   4. official employer changes the deadline → canonical record updated,
 *      still no duplicate, no extra observation
 *   5. employer submission → approval mirrors the admin route's mapping →
 *      canonical Organization attached
 *   6. employer dashboard edit → ownership wall + successful owner edit
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));
mock.module('@/lib/ai/failover', () => ({
  chatWithFailover: async (_slots: unknown, system: string) => {
    const lang: 'fa' | 'ps' = system.includes('Persian') ? 'fa' : 'ps';
    const filler = lang === 'fa' ? 'ترجمه فارسی متن شغلی آزمایشی. ' : 'ژباړه پښتو د ازموینې کار متن. ';
    let out = '';
    while (out.length < 60) out += filler;
    return { text: JSON.stringify({ t: out.trim() }) };
  },
  getProviderSlots: () => [{ name: 'scripted', provider: async () => ({ text: '' }) }],
}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { SCRAPERS } = await import('../src/lib/import/registry');
const { BaseScraper } = await import('../src/lib/import/base-scraper');
const { runImport } = await import('../src/lib/import/orchestrator');
const { resolveOrganization } = await import('../src/lib/organizations/resolve');
const { recomputeVerificationStatus } = await import('../src/lib/verification');
const {
  professionalToExtractedData, professionalToColumns, professionalLocationRow, parseProfessionalFields,
} = await import('../src/lib/employers/professional-fields');
const { createJob, updateJob } = await import('../src/lib/employers/jobs');
const { registerEmployer } = await import('../src/lib/employer-auth');
const { db } = await import('../src/lib/db');

let dbUp = false;
try {
  if (isolatedTestDatabase) await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch { dbUp = false; }

// The E2E story asserts Persian commits at import time — opt into
// translation-on-import for this suite only (default is manual-only).
process.env.IMPORT_TRANSLATE_ON_IMPORT = '1';

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);
const runId = Date.now().toString(36);
const DAY = 24 * 3600_000;

// ─── stub scrapers: canned listings per injected key, zero network ──────────
type Listing = Record<string, unknown>;
const canned: Record<string, Listing[]> = {};

class StubScraper extends BaseScraper {
  async scrapeAll() {
    return (canned[this.source.scraperKey] ?? []) as never[];
  }
  protected parseListPage() {
    return { listings: (canned[this.source.scraperKey] ?? []) as never[], nextPage: null };
  }
}

const OFFICIAL_KEY = 'e2eOfficial';
const ACBAR_KEY = 'e2eAcbar';
const WAZI_KEY = 'e2eWazi';
beforeAll(() => {
  SCRAPERS[OFFICIAL_KEY] = StubScraper as never;
  SCRAPERS[ACBAR_KEY] = StubScraper as never;
  SCRAPERS[WAZI_KEY] = StubScraper as never;
});

const JOB_TITLE = `Community Water Engineer ${runId}`;
const DEADLINE = new Date(Date.now() + 30 * DAY);
const OFFICIAL_URL = `https://careers.e2eorg-${runId}.example.org/jobs/VA-777`;
const APPLY_URL = `https://careers.e2eorg-${runId}.example.org/apply/VA-777`;

const officialListing = (deadline: Date): Listing => ({
  title: JOB_TITLE,
  organization: `E2E Water Org ${runId}`,
  sourceName: 'E2E Official Careers',
  sourceUrl: OFFICIAL_URL,
  applyUrl: APPLY_URL,
  deadline: deadline.toISOString(),
  provinces: ['Kabul'],
  location: 'Kabul, Afghanistan',
  description: 'We are hiring a community water engineer to design and supervise rural water systems across Kabul province. (e2e-official)',
  extractedData: { vacancyNumber: 'VA-777' },
});

const aggregatorListing = (sourceName: string, sourceUrl: string): Listing => ({
  title: JOB_TITLE,
  organization: `E2E Water Org ${runId}`,
  sourceName,
  sourceUrl,
  applyUrl: sourceUrl,
  deadline: DEADLINE.toISOString(),
  description: 'Community water engineer vacancy announced through an aggregator listing. (e2e-aggregator)',
  extractedData: { vacancyNumber: 'VA-777' },
});

describeIf(dbUp)('phase 25 — end-to-end local workflow', () => {
  let officialSourceId = '';
  let acbarSourceId = '';
  let waziSourceId = '';
  let canonicalOrgId = '';
  let canonicalSlug = '';
  let ownerA = '';
  let ownerB = '';
  let orgA = '';
  let orgB = '';
  const createdSlugs: string[] = [];

  beforeAll(async () => {
    // clean slate for this run
    await db.opportunitySourceObservation.deleteMany({ where: { opportunity: { title: { contains: runId } } } });
    await db.opportunity.deleteMany({ where: { title: { contains: runId } } });
    await db.importRun.deleteMany({ where: { source: { name: { contains: `E2E25 ${runId}` } } } });
    await db.importSource.deleteMany({ where: { name: { contains: `E2E25 ${runId}` } } });
    for (const prefix of [`e2e water org ${runId}`, `e2e org a ${runId}`, `e2e org b ${runId}`]) {
      const stale = await db.organization.findFirst({ where: { slug: { contains: prefix.replace(/ /g, '-') } } });
      if (stale) {
        await db.opportunity.updateMany({ where: { organizationId: stale.id }, data: { organizationId: null } });
        await db.organizationAlias.deleteMany({ where: { organizationId: stale.id } });
        await db.organization.delete({ where: { id: stale.id } });
      }
    }
    await db.user.deleteMany({ where: { email: { endsWith: `e2e25-${runId}@example.org` } } }).catch(() => null);

    // canonical org exists BEFORE the official import (deliberate, like Phase 9 seeding)
    canonicalOrgId = (await resolveOrganization(db, `E2E Water Org ${runId}`)).organization!.id;
    canonicalSlug = (await db.organization.findUnique({ where: { id: canonicalOrgId } }))!.slug;

    const mkSource = async (name: string, key: string, role: string, baseUrl: string) =>
      (await db.importSource.create({
        data: { name, type: 'job', scraperKey: key, baseUrl, enabled: true, autoPublish: false,
          sourceRole: role, priority: role === 'official_careers' ? 90 : 60, scheduleMinutes: 30 },
      })).id;
    officialSourceId = await mkSource(`E2E25 Official ${runId}`, OFFICIAL_KEY, 'official_careers', `https://careers.e2eorg-${runId}.example.org`);
    acbarSourceId = await mkSource(`E2E25 ACBAR ${runId}`, ACBAR_KEY, 'aggregator', 'https://www.acbar.org');
    waziSourceId = await mkSource(`E2E25 Wazifaha ${runId}`, WAZI_KEY, 'aggregator', 'https://wazifaha.org');

    // employer accounts for scenarios 5/6
    ownerA = (await registerEmployer(`ownera-e2e25-${runId}@example.org`, 'password-123')).id;
    ownerB = (await registerEmployer(`ownerb-e2e25-${runId}@example.org`, 'password-123')).id;
    orgA = (await resolveOrganization(db, `E2E Org A ${runId}`)).organization!.id;
    orgB = (await resolveOrganization(db, `E2E Org B ${runId}`)).organization!.id;
    await db.organizationMember.create({ data: { organizationId: orgA, userId: ownerA, role: 'owner', status: 'active' } });
    await db.organizationMember.create({ data: { organizationId: orgB, userId: ownerB, role: 'owner', status: 'active' } });
  });

  afterAll(async () => {
    await db.opportunitySourceObservation.deleteMany({ where: { opportunity: { title: { contains: runId } } } });
    await db.translationChunk.deleteMany({ where: { ownerType: 'opportunity', ownerId: { in: (await db.opportunity.findMany({ where: { title: { contains: runId } }, select: { id: true } })).map((o: any) => o.id) } } }).catch(() => null);
    await db.opportunity.deleteMany({ where: { title: { contains: runId } } });
    await db.importRun.deleteMany({ where: { source: { name: { contains: `E2E25 ${runId}` } } } });
    await db.importSource.deleteMany({ where: { name: { contains: `E2E25 ${runId}` } } });
    for (const id of [canonicalOrgId, orgA, orgB]) {
      if (!id) continue;
      await db.organizationAlias.deleteMany({ where: { organizationId: id } }).catch(() => null);
      await db.organization.delete({ where: { id } }).catch(() => null);
    }
    await db.user.deleteMany({ where: { email: { endsWith: `e2e25-${runId}@example.org` } } }).catch(() => null);
    await db.auditLog.deleteMany({ where: { action: { startsWith: 'employer.' }, createdAt: { gte: new Date(Date.now() - 3600_000) } } }).catch(() => null);
    delete (SCRAPERS as Record<string, unknown>)[OFFICIAL_KEY];
    delete (SCRAPERS as Record<string, unknown>)[ACBAR_KEY];
    delete (SCRAPERS as Record<string, unknown>)[WAZI_KEY];
  });

  test('scenario 1 — official source publishes: detected, resolved, created, observed, apply resolved, located, translated', async () => {
    canned[OFFICIAL_KEY] = [officialListing(DEADLINE)];
    const run = await runImport({ sourceId: officialSourceId, triggeredBy: 'e2e' });
    expect(run.imported).toBe(1);

    const opp = await db.opportunity.findFirst({
      where: { sourceUrl: OFFICIAL_URL }, include: { locations: true, sourceObservations: true },
    });
    expect(opp).toBeTruthy();
    createdSlugs.push(opp!.slug);
    expect(opp!.status).toBe('draft'); // autoPublish=false keeps it in review
    expect(opp!.organizationId).toBe(canonicalOrgId);
    expect(opp!.applyUrlType).toBe('direct_application'); // official same-host apply (Phase 5)
    expect(opp!.applyUrlEvidence).toBe('official-same-host-apply');
    const loc = opp!.locations.find((l: any) => l.province === 'Kabul');
    expect(loc).toBeTruthy(); // location parsed
    expect(opp!.faStatus).toBe('complete'); // Persian committed through the real engine
    expect((opp!.descriptionI18n as any)?.ps).toBeTruthy(); // Pashto followed
    const obs = opp!.sourceObservations[0];
    expect(obs.sourceRole).toBe('official_careers');
    expect(obs.isPrimary).toBe(true);
    expect(opp!.verificationStatus).toBe('verified_official');
  });

  test('scenario 2 — ACBAR publishes the same vacancy: NO duplicate, second observation', async () => {
    canned[ACBAR_KEY] = [aggregatorListing('ACBAR', `https://www.acbar.org/listing/${runId}`)];
    const run = await runImport({ sourceId: acbarSourceId, triggeredBy: 'e2e' });
    expect(run.imported).toBe(0); // canonical resolution prevented the duplicate
    expect(run.duplicates).toBe(1);

    const count = await db.opportunity.count({ where: { title: { contains: runId } } });
    expect(count).toBe(1);
    const opp = await db.opportunity.findFirst({ where: { sourceUrl: OFFICIAL_URL }, include: { sourceObservations: true } });
    expect(opp!.sourceObservations).toHaveLength(2); // aggregator sighting stored, auditable
    expect(opp!.sourceObservations.filter((o: any) => o.sourceRole === 'aggregator')).toHaveLength(1);
    expect(opp!.sourceObservations.filter((o: any) => o.isPrimary)).toHaveLength(1); // official stays primary
  });

  test('scenario 3 — Wazifaha publishes it: still one opportunity, third observation', async () => {
    canned[WAZI_KEY] = [aggregatorListing('Wazifaha Jobs', `https://wazifaha.org/p/${runId}`)];
    await runImport({ sourceId: waziSourceId, triggeredBy: 'e2e' });

    const count = await db.opportunity.count({ where: { title: { contains: runId } } });
    expect(count).toBe(1);
    const opp = await db.opportunity.findFirst({ where: { sourceUrl: OFFICIAL_URL }, include: { sourceObservations: true } });
    expect(opp!.sourceObservations).toHaveLength(3);
    expect(new Set(opp!.sourceObservations.map((o: any) => o.sourceName))).toEqual(
      new Set([`E2E25 Official ${runId}`, `E2E25 ACBAR ${runId}`, `E2E25 Wazifaha ${runId}`]),
    );
  });

  test('scenario 4 — official employer extends the deadline: canonical record updated, no duplicate', async () => {
    const newDeadline = new Date(Date.now() + 60 * DAY);
    canned[OFFICIAL_KEY] = [officialListing(newDeadline)];
    const run = await runImport({ sourceId: officialSourceId, triggeredBy: 'e2e' });
    expect(run.updated).toBe(1); // same-source update path
    expect(run.imported).toBe(0);

    const count = await db.opportunity.count({ where: { title: { contains: runId } } });
    expect(count).toBe(1); // deadline extension created NO duplicate
    const opp = await db.opportunity.findFirst({ where: { sourceUrl: OFFICIAL_URL }, include: { sourceObservations: true } });
    expect(opp!.deadline!.getTime()).toBe(newDeadline.getTime());
    expect(opp!.sourceObservations).toHaveLength(3); // re-sighting updated in place
  });

  test('scenario 5 — employer submission → approval mirrors the admin route → canonical Organization attached', async () => {
    // the anonymous quick-post body (professional fields included)
    const body = {
      title: `Hygiene Promotion Trainer ${runId}`,
      organization: `E2E Water Org ${runId}`,
      description: 'We are looking for hygiene promotion trainers to deliver community sessions in Kabul and nearby districts, with at least two years of NGO field experience and fluency in Dari. (e2e-submission)',
      applyEmail: `jobs@e2eorg-${runId}.example.org`,
      deadline: DEADLINE.toISOString().slice(0, 10),
      categorySlug: 'jobs',
      vacancyNumber: 'VA-888',
      province: 'Kabul',
      city: 'Kabul City',
      numberOfVacancies: 4,
    };
    const prof = parseProfessionalFields(body);

    // mirror the admin approve route's create (the mapping functions are the tested core)
    const { ensureUniqueSlug } = await import('../src/lib/ai/pipeline');
    const slug = await ensureUniqueSlug(db, body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    createdSlugs.push(slug);
    const opportunity = await db.opportunity.create({
      data: {
        title: body.title, slug,
        organization: body.organization,
        organizationId: canonicalOrgId, // resolved through the canonical org
        deadline: new Date(body.deadline),
        description: body.description,
        applyUrl: `mailto:${body.applyEmail}`,
        applyUrlType: 'application_email',
        status: 'published',
        sourceName: 'Employer',
        country: prof.province ?? null,
        extractedData: professionalToExtractedData(prof.professional) as never,
        ...professionalToColumns(prof.professional),
        ...(professionalLocationRow(prof.professional)
          ? { locations: { create: professionalLocationRow(prof.professional)! } }
          : {}),
      },
    });
    await recomputeVerificationStatus(db, opportunity.id);

    const stored = await db.opportunity.findUnique({ where: { id: opportunity.id }, include: { locations: true } });
    expect(stored!.sourceName).toBe('Employer');
    expect(stored!.organizationId).toBe(canonicalOrgId); // canonical Organization attached
    expect((stored!.extractedData as any).vacancyNumber).toBe('VA-888');
    expect(stored!.locations.some((l: any) => l.province === 'Kabul' && l.source === 'employer')).toBe(true);
  });

  test('scenario 6 — employer dashboard edit: ownership validated, then owner edit succeeds', async () => {
    const created = await createJob(db, ownerA, orgA, {
      title: `Dashboard Edit Job ${runId}`,
      description: 'A dashboard-created vacancy that the ownership wall will protect from organization B.',
      applyEmail: `jobs+${runId}@orga-e2e25.example.org`,
    });

    // organization B's owner CANNOT touch organization A's vacancy
    let err: unknown = null;
    try { await updateJob(db, ownerB, created.id, { title: 'Hijacked Title Here' }); } catch (e) { err = e; }
    expect(String(err)).toMatch(/do not have access/);

    // the owner edits successfully
    await updateJob(db, ownerA, created.id, { title: `Dashboard Edit Job v2 ${runId}` });
    const job = await db.opportunity.findUnique({ where: { id: created.id } });
    expect(job!.title).toBe(`Dashboard Edit Job v2 ${runId}`);
    expect(job!.status).toBe('draft');
    // public listing resolvable (Phase 15 org pages + slug)
    expect(job!.organizationId).toBe(orgA);
    expect(canonicalSlug).toBeTruthy();
  });
});
