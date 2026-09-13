/**
 * Audit DB content state: trilingual coverage, section quality, source links.
 * Run: DATABASE_URL=... bun run scripts/audit-content.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

type J = Record<string, unknown> | null | undefined;

function langs(j: J): string[] {
  if (!j || typeof j !== 'object') return [];
  return Object.entries(j as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'string' && (v as string).trim().length > 0)
    .map(([k]) => k);
}

async function main() {
  const total = await db.opportunity.count();
  const published = await db.opportunity.count({ where: { status: 'published' } });
  const active = await db.opportunity.count({
    where: { status: 'published', OR: [{ deadline: null }, { deadline: { gte: new Date() } }] },
  });

  const opps = await db.opportunity.findMany({
    where: { status: 'published' },
    select: {
      slug: true, title: true, titleI18n: true, description: true, descriptionI18n: true,
      aiSummary: true, aiSummaryI18n: true, eligibility: true, eligibilityI18n: true,
      benefits: true, benefitsI18n: true, requirements: true, requirementsI18n: true,
      guidelines: true, guidelinesI18n: true, responsibilities: true, responsibilitiesI18n: true,
      applyUrl: true, sourceUrl: true, sourceName: true, salary: true, salaryI18n: true,
      deadline: true, translationStatus: true, category: { select: { slug: true } },
    },
  });

  const cov = { title: { en: 0, fa: 0, ps: 0 }, summary: { en: 0, fa: 0, ps: 0 }, description: { en: 0, fa: 0, ps: 0 } };
  let withApply = 0, withSourceOnly = 0, noApplyNoSource = 0, withSalary = 0, withDeadline = 0;
  let junkHits = 0;
  const junkRes = [/sponsored links/i, /adsbygoogle/, /addtoany|a2a_/i, /share with your friends/i, /\p{Script=Han}/u];

  for (const o of opps) {
    const tl = langs(o.titleI18n as J); const sl = langs(o.aiSummaryI18n as J); const dl = langs(o.descriptionI18n as J);
    for (const l of tl) if (l in cov.title) cov.title[l as keyof typeof cov.title]++;
    for (const l of sl) if (l in cov.summary) cov.summary[l as keyof typeof cov.summary]++;
    for (const l of dl) if (l in cov.description) cov.description[l as keyof typeof cov.description]++;
    if (o.applyUrl) withApply++; else if (o.sourceUrl) withSourceOnly++; else noApplyNoSource++;
    if (o.salary) withSalary++;
    if (o.deadline) withDeadline++;
    const blob = `${o.description || ''} ${o.eligibility || ''} ${o.benefits || ''} ${o.requirements || ''} ${o.guidelines || ''}`;
    if (junkRes.some((r) => r.test(blob))) junkHits++;
  }

  console.log(JSON.stringify({
    total, published, active,
    coverage: cov,
    apply: { withApply, withSourceOnly, noApplyNoSource },
    withSalary, withDeadline, junkHits,
  }, null, 2));

  // Sample one active record to inspect what a fa user would see
  const sample = opps.find((o) => o.deadline && new Date(o.deadline) > new Date());
  if (sample) {
    const s = sample as unknown as Record<string, unknown>;
    console.log('\n=== SAMPLE:', sample.slug, '===');
    console.log('titleI18n keys:', langs(sample.titleI18n as J));
    console.log('summaryI18n keys:', langs(sample.aiSummaryI18n as J));
    console.log('descriptionI18n keys:', langs(sample.descriptionI18n as J));
    console.log('eligibilityI18n keys:', langs(sample.eligibilityI18n as J));
    console.log('description (en, first 300):', String(s.description || '').replace(/<[^>]+>/g, ' ').slice(0, 300));
  }
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
