/**
 * Phase 9 — initial official-source seed (LOCAL ONLY until the authorized rollout).
 *
 * Adds a SMALL batch of VERIFIED official sources. Every row here was
 * probed during implementation (Phase 9 rule: never assume URLs):
 *
 *   ✓ ReliefWeb Jobs     — UN OCHA's official jobs RSS, structured feed
 *                          verified 200 + proper RSS 2.0 (title/link/pubDate/
 *                          description with country tags).
 *   ✓ Acted Vacancies    — official careers listing at acted.org, verified
 *                          server-rendered cards (div.item.item-rh → a.title /
 *                          a.postule), pagination (a.nextpostslink), detail
 *                          bodies under div.jobs-content > section.cpn-text.
 *                          Its /apply/ links are same-host on an official
 *                          careers page → Apply Resolver V2 classifies them
 *                          direct_application (the Phase 5 fix).
 *
 * INVESTIGATED AND DEFERRED (verified platforms, no compatible public feed
 * yet — most unlock with the deferred Workday adapter):
 *   IRC (Workday theirc.wd1.myworkdayjobs.com), WHO (Workday), IOM (Oracle HCM
 *   ekum.fa.em2.oraclecloud.com), UNHCR/WFP (SuccessFactors-family portals,
 *   WFP unreachable), UNDP (jobs.undp.org blocks non-browser agents),
 *   UNICEF (custom eRecruit), UN Secretariat (JS-only shell), NRC (vacancies
 *   page moved; WebCruiter behind login), DRC (drc.dk unreachable from this
 *   network), Save the Children / CARE / Mercy Corps / Medair / People in
 *   Need (no public JSON/RSS found; SmartRecruiters company-ID probes
 *   returned empty shells), Greenhouse/Lever (no NGO boards under guessable
 *   tokens; "drc" on Greenhouse is a US law firm — rejected).
 *
 * ALL rows are created with autoPublish = FALSE — imported content stays in
 * draft/review until quality is established. There is deliberately no flag
 * to override this here.
 *
 * Usage:
 *   bun --conditions=react-server scripts/seed-official-sources.ts            # dry-run
 *   bun --conditions=react-server scripts/seed-official-sources.ts --apply    # write locally
 */
import { db } from '../src/lib/db';
import { resolveOrganization } from '../src/lib/organizations/resolve';
import { SOURCE_ROLES } from '../src/lib/import/source-observations';

export interface OfficialSourceSeed {
  name: string;
  type: 'job' | 'scholarship';
  scraperKey: string;
  baseUrl: string;
  sourceRole: string;
  priority: number;
  trustScore: number;
  scheduleMinutes: number;
  defaultCategory: string;
  organization: {
    name: string;
    organizationType: string;
    officialDomains: string[];
    careersUrl?: string;
  };
  config: Record<string, unknown>;
}

/** Hard rule of Phase 9: nothing from official sources auto-publishes. */
export const OFFICIAL_SOURCES_AUTOPUBLISH = false;

export const OFFICIAL_SOURCE_SEEDS: OfficialSourceSeed[] = [
  {
    name: 'ReliefWeb Jobs (OCHA)',
    type: 'job',
    scraperKey: 'rssOpportunity',
    baseUrl: 'https://reliefweb.int/jobs/rss.xml',
    sourceRole: 'official_feed',
    priority: 65,
    trustScore: 80,
    scheduleMinutes: 15,
    defaultCategory: 'jobs',
    organization: {
      name: 'ReliefWeb (UN OCHA)',
      organizationType: 'un_agency',
      officialDomains: ['reliefweb.int'],
    },
    config: { detailFetch: true },
  },
  {
    name: 'Acted Vacancies',
    type: 'job',
    scraperKey: 'officialHtml',
    baseUrl: 'https://www.acted.org/en/get-involved/join-us/vacancies/',
    sourceRole: 'official_careers',
    priority: 90,
    trustScore: 90,
    scheduleMinutes: 30,
    defaultCategory: 'jobs',
    organization: {
      name: 'Acted',
      organizationType: 'ngo',
      officialDomains: ['acted.org'],
      careersUrl: 'https://www.acted.org/en/get-involved/join-us/vacancies/',
    },
    config: {
      listUrl: 'https://www.acted.org/en/get-involved/join-us/vacancies/',
      detailFetch: true,
      nextPageSelector: 'a.nextpostslink',
      selectors: {
        card: 'div.item.item-rh',
        title: 'a.title',
        url: 'a.title',
        apply: 'a.postule',
        deadline: '.infos',
        description: 'section.cpn-text',
      },
    },
  },
];

const args = process.argv.slice(2);
const apply = args.includes('--apply');

if (import.meta.main) {
// ─── SAFETY: local-only until the production rollout is authorized ───────────
const dbUrl = process.env.DATABASE_URL ?? '';
let host = '';
try {
  host = new URL(dbUrl).hostname;
} catch {
  console.error('REFUSING: DATABASE_URL is not parseable.');
  process.exit(1);
}
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && process.env.BACKFILL_ALLOW_REMOTE !== '1') {
  console.error(`REFUSING: DATABASE_URL points at "${host}" — set BACKFILL_ALLOW_REMOTE=1 to override (authorized production rollout).`);
  process.exit(1);
}

console.log(`Official-source seed — ${apply ? 'APPLY' : 'DRY-RUN'} on ${host} (autoPublish=${OFFICIAL_SOURCES_AUTOPUBLISH} for ALL rows)\n`);

for (const seed of OFFICIAL_SOURCE_SEEDS) {
  const existing = await db.importSource.findUnique({ where: { name: seed.name } });
  if (!apply) {
    console.log(`${existing ? 'exists' : 'would create'}: ${seed.name} (${seed.scraperKey}, role=${seed.sourceRole}, priority=${seed.priority}, schedule=${seed.scheduleMinutes}m, autoPublish=false)`);
    continue;
  }

  // owning Organization — deliberate creation, with the verified official domains
  const org = await resolveOrganization(db, seed.organization.name);
  if (org.organization) {
    await db.organization.update({
      where: { id: org.organization.id },
      data: {
        organizationType: seed.organization.organizationType,
        officialDomains: seed.organization.officialDomains,
        careersUrl: seed.organization.careersUrl ?? undefined,
        verified: true,
        verificationMethod: 'manual_review_phase9',
        verifiedAt: new Date(),
      },
    });
  }

  const data = {
    type: seed.type,
    scraperKey: seed.scraperKey,
    baseUrl: seed.baseUrl,
    enabled: true,
    autoPublish: OFFICIAL_SOURCES_AUTOPUBLISH,
    scheduleMinutes: seed.scheduleMinutes,
    defaultCategory: seed.defaultCategory,
    config: JSON.stringify(seed.config),
    sourceRole: seed.sourceRole,
    priority: seed.priority,
    trustScore: seed.trustScore,
    healthStatus: 'healthy',
    organizationId: org.organization?.id ?? null,
  };
  if (existing) {
    await db.importSource.update({ where: { name: seed.name }, data });
    console.log(`updated: ${seed.name}`);
  } else {
    await db.importSource.create({ data: { name: seed.name, ...data } });
    console.log(`created: ${seed.name}`);
  }
}

console.log(`\n${apply ? 'Seeded' : 'Dry-run complete'} — re-run with --apply to write. Sources must still be validated (autoPublish=false keeps everything in review).`);
process.exit(0);
}

