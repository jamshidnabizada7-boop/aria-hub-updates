/**
 * Clean o4af.com / scholarships.af theme boilerplate from EXISTING records.
 *
 * The O4AF scraper used to store the source theme's site chrome inside
 * opportunity content: AddToAny share widgets ("Follow Us: Facebook YouTube
 * Telegram Instagram WhatsApp", "Share with Your Friends"), "Sponsored links"
 * ad-slot labels, and the site footer ("Scholarship for Afghanistan — Making
 * Education Accessible to All · scholarships.af · o4af.com").
 *
 * This script:
 *   1. Strips that junk from description/guidelines/requirements/
 *      eligibility/benefits (HTML-aware for description, text-level for the
 *      rest) using the shared stripThemeBoilerplate/stripTextJunk utils
 *      (src/lib/import/utils.ts — also used by the scraper for new imports).
 *   2. Recomputes aiSummary from the cleaned description when the stored
 *      summary contains junk or was a raw description truncation.
 *   3. Drops contaminated fa/ps values from aiSummaryI18n so the translate
 *      backfill re-translates them from the clean English summary.
 *
 * Usage:
 *   bun run scripts/clean-o4af-boilerplate.ts            # dry run (report only)
 *   bun run scripts/clean-o4af-boilerplate.ts --apply    # write changes to DB
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import {
  stripThemeBoilerplate,
  stripTextJunk,
  stripHtml,
} from '../src/lib/import/utils';

const here = fileURLToPath(new URL('.', import.meta.url));

function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || '';
  if (envUrl.startsWith('postgres')) return envUrl;
  try {
    const raw = readFileSync(join(here, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (v.startsWith('postgres')) return v;
    }
  } catch { /* fallthrough */ }
  throw new Error('No PostgreSQL DATABASE_URL found');
}

const db = new PrismaClient({ datasources: { db: { url: resolveDatabaseUrl() } } });
const APPLY = process.argv.includes('--apply');

/** Junk markers that make a field (or a translation) "contaminated". */
const JUNK_RE = /Follow Us|Share with Your Friends|Sponsored links|Making Education Accessible|addtoany\.com|a2a_button|a2a_kit|s4af-social|footer-note|advads|adsbygoogle|googlesyndication/i;

/** Boilerplate section headings the raw-truncation summaries begin with. */
const SUMMARY_PREFIX_RE =
  /^\s*(about the (company|organization( and job)?|volunteerism|opportunity|program|job)|introduction|job description|opportunity description|description)\s*[:\-–—]?\s*/i;

/** Plain-text summary rebuilt from the cleaned description (≤200 chars). */
function rebuildSummary(description: string): string {
  let s = stripHtml(description);
  s = s.replace(SUMMARY_PREFIX_RE, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 200) s = s.slice(0, 199).trimEnd() + '…';
  return s;
}

async function main() {
  console.log(`ARIA HUB — o4af boilerplate cleanup ${APPLY ? '(APPLY)' : '(dry run)'}\n`);

  const rows = await db.opportunity.findMany({
    where: {
      OR: [
        { sourceUrl: { contains: 'o4af' } },
        { sourceUrl: { contains: 'scholarships.af' } },
      ],
    },
    select: {
      id: true, slug: true, description: true, aiSummary: true, aiSummaryI18n: true,
      guidelines: true, requirements: true, eligibility: true, benefits: true,
    },
  });
  console.log(`Scanning ${rows.length} o4af/scholarships.af records…`);

  let cleanedContent = 0;
  let rebuiltSummaries = 0;
  let droppedTranslations = 0;

  for (const row of rows) {
    const patch: Record<string, unknown> = {};

    // 1. Description (HTML-aware clean)
    if (row.description && JUNK_RE.test(row.description)) {
      const cleaned = stripThemeBoilerplate(row.description);
      if (cleaned !== row.description && cleaned.trim().length > 40) {
        patch.description = cleaned;
        cleanedContent++;
      }
    }

    // 2. Plain-text sections
    for (const field of ['guidelines', 'requirements', 'eligibility', 'benefits'] as const) {
      const val = row[field] as string | null;
      if (val && JUNK_RE.test(val)) {
        const cleaned = stripTextJunk(val);
        if (cleaned !== val && cleaned.trim().length > 10) {
          patch[field] = cleaned;
          cleanedContent++;
        }
      }
    }

    // 3. aiSummary — rebuild when contaminated or an obvious raw truncation
    const summarySource = (patch.description as string) ?? row.description ?? '';
    if (row.aiSummary && JUNK_RE.test(row.aiSummary)) {
      const rebuilt = rebuildSummary(summarySource);
      if (rebuilt && rebuilt.length > 40) {
        patch.aiSummary = rebuilt;
        rebuiltSummaries++;
      }
    }

    // 4. aiSummaryI18n — drop contaminated fa/ps values (backfill re-translates)
    if (row.aiSummaryI18n && typeof row.aiSummaryI18n === 'object') {
      const i18n = { ...(row.aiSummaryI18n as Record<string, unknown>) };
      let touched = false;
      for (const lang of ['fa', 'ps']) {
        const v = i18n[lang];
        if (typeof v === 'string' && (JUNK_RE.test(v) || /[\u4e00-\u9fff]/.test(v))) {
          delete i18n[lang];
          touched = true;
          droppedTranslations++;
        }
      }
      if (touched) patch.aiSummaryI18n = i18n;
    }

    if (Object.keys(patch).length && APPLY) {
      await db.opportunity.update({ where: { id: row.id }, data: patch });
      console.log(`  ✓ ${row.slug}: ${Object.keys(patch).join(', ')}`);
    } else if (Object.keys(patch).length) {
      console.log(`  (dry) ${row.slug}: would update ${Object.keys(patch).join(', ')}`);
    }
  }

  console.log(`\nDone. content fields cleaned: ${cleanedContent}, summaries rebuilt: ${rebuiltSummaries}, fa/ps translations dropped for re-translate: ${droppedTranslations}.`);
  if (!APPLY) console.log('Run with --apply to write these changes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
