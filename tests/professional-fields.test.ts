/**
 * Phase 14 — professional employer job fields.
 * Pure mapping tests + db tests for the approve carryover and the dashboard
 * createJob path (extractedData, columns, and the OpportunityLocation row).
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const {
  parseProfessionalFields, professionalToExtractedData, professionalToColumns, professionalLocationRow,
} = await import('../src/lib/employers/professional-fields');
const { createJob } = await import('../src/lib/employers/jobs');
const { registerEmployer } = await import('../src/lib/employer-auth');
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

describe('parseProfessionalFields (pure)', () => {
  test('validates, caps and normalizes the full bundle', () => {
    const parsed = parseProfessionalFields({
      vacancyNumber: ' VA-2026/014 ',
      numberOfVacancies: '3',
      province: 'kandahar',
      city: 'Kandahar City',
      district: 'Dand',
      contractType: 'Fixed term',
      contractDuration: '6 months',
      genderRequirement: 'Female candidates only',
      nationalityRequirement: 'Afghan nationals',
      salaryGrade: 'Grade B',
      responsibilities: 'x'.repeat(9000), // over cap → truncated to 8000
      education: 'Bachelor degree',
    });
    expect(parsed.professional.vacancyNumber).toBe('VA-2026/014');
    expect(parsed.professional.numberOfVacancies).toBe(3);
    expect(parsed.professional.province).toBe('Kandahar'); // whitelist-normalized
    expect(parsed.professional.responsibilities).toHaveLength(8000);
    expect(parsed.province).toBe('Kandahar');
    expect(parsed.city).toBe('Kandahar City');
  });

  test('a province is NEVER invented: non-whitelist input is dropped', () => {
    const parsed = parseProfessionalFields({ province: 'Sistan', city: 'Zaranj' });
    expect(parsed.province).toBeNull();
    expect(parsed.professional.province).toBeUndefined();
    expect(parsed.city).toBe('Zaranj'); // city stays as user-declared text
  });

  test('junk is ignored; numberOfVacancies is bounded', () => {
    expect(parseProfessionalFields({}).professional).toEqual({});
    const parsed = parseProfessionalFields({ numberOfVacancies: '99999' });
    expect(parsed.professional.numberOfVacancies).toBe(999);
    const empty = parseProfessionalFields({ numberOfVacancies: 'abc' });
    expect(empty.professional.numberOfVacancies).toBeUndefined();
  });

  test('mappers produce extractedData keys, Opportunity columns, and one location row', () => {
    const { professional } = parseProfessionalFields({
      vacancyNumber: 'VA-1', numberOfVacancies: 2, contractType: 'Contract',
      genderRequirement: 'Any', salaryGrade: 'A', province: 'Balkh', city: 'Mazar-i-Sharif',
      responsibilities: 'Do things', education: 'BA', experience: '3 years',
    });
    const extracted = professionalToExtractedData(professional);
    expect(extracted.vacancyNumber).toBe('VA-1'); // Level-A dedupe fuel
    expect(extracted.sourceForm).toBe('employer-professional');
    const columns = professionalToColumns(professional);
    expect(columns).toEqual({ responsibilities: 'Do things', educationReq: 'BA', experience: '3 years' });
    const row = professionalLocationRow(professional);
    expect(row?.province).toBe('Balkh');
    expect(row?.country).toBe('Afghanistan');
    expect(row?.confidence).toBe(1.0);
    expect(professionalLocationRow(parseProfessionalFields({}).professional)).toBeNull();
  });
});

describeIf(dbUp)('professional fields through the real paths (db)', () => {
  let orgId = '';
  let employerId = '';
  const createdSlugs: string[] = [];

  beforeAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `prof14-${runId}` } } });
    orgId = (await db.organization.create({ data: { name: `Prof14 Org ${runId}`, slug: `prof14-org-${runId}` } })).id;
    employerId = (await registerEmployer(`prof14-${runId}@example.org`, 'password-123')).id;
    await db.organizationMember.create({
      data: { organizationId: orgId, userId: employerId, role: 'recruiter', status: 'active' },
    });
  });

  afterAll(async () => {
    await db.opportunity.deleteMany({ where: { slug: { startsWith: `prof14-${runId}` } } });
    await db.user.deleteMany({ where: { email: `prof14-${runId}@example.org` } }).catch(() => null);
    await db.organizationMember.deleteMany({ where: { organizationId: orgId } }).catch(() => null);
    await db.organizationAlias.deleteMany({ where: { organizationId: orgId } }).catch(() => null);
    await db.organization.delete({ where: { id: orgId } }).catch(() => null);
    await db.auditLog.deleteMany({ where: { action: { startsWith: 'employer.' }, createdAt: { gte: new Date(Date.now() - 3600_000) } } }).catch(() => null);
  });

  test('dashboard createJob persists extractedData, columns and the location row', async () => {
    const created = await createJob(db, employerId, orgId, {
      title: `Prof14 Test Job ${runId}`,
      description: 'A full professional posting body that easily passes the eighty character validation gate.',
      applyEmail: 'hr@prof14.example.org',
      vacancyNumber: `VA-${runId}`,
      numberOfVacancies: 2,
      province: 'Herat',
      city: 'Herat City',
      district: 'Injil',
      contractType: 'Fixed term',
      genderRequirement: 'Any',
      responsibilities: 'Manage the project.',
      education: 'University degree',
    });
    createdSlugs.push(created.slug);

    const job = await db.opportunity.findUnique({
      where: { id: created.id }, include: { locations: true },
    });
    const extracted = job!.extractedData as Record<string, unknown>;
    expect(extracted.vacancyNumber).toBe(`VA-${runId}`);
    expect(extracted.numberOfVacancies).toBe(2);
    expect(job!.educationReq).toBe('University degree');
    expect(job!.responsibilities).toBe('Manage the project.');
    const row = job!.locations[0];
    expect(row.province).toBe('Herat');
    expect(row.city).toBe('Herat City');
    expect(row.district).toBe('Injil');
    expect(row.source).toBe('employer');
  });
});
