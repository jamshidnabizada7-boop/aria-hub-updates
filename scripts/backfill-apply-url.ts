/**
 * Backfill apply-link quality for EXISTING Opportunity rows.
 *
 * Public rule: users must NEVER be sent to the site the data was scraped
 * from. This script, for every row:
 *   1. classifies the current applyUrl → applyUrlType
 *      (application_email | application_form | direct_application |
 *       source_article_fallback | unknown);
 *   2. when the applyUrl is just the source article (or missing), searches
 *      guidelines/description/requirements for a REAL application link
 *      (email / form / explicit "apply at") and upgrades applyUrl only when
 *      one is actually found — a link is never fabricated.
 *
 * Usage:
 *   bun run scripts/backfill-apply-url.ts          # dry-run + report
 *   bun run scripts/backfill-apply-url.ts --apply
 *   bun run scripts/backfill-apply-url.ts --apply --limit=200
 */

import { createDb } from './db-client';
import { classifyApplyUrl } from '../src/lib/apply';
import { extractRealApplyLink } from '../src/lib/apply-extract';
import { stripHtml } from '../src/lib/import/utils';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

const db = createDb();

async function main(): Promise<void> {
  const rows = await db.opportunity.findMany({
    select: {
      id: true, applyUrl: true, applyUrlType: true, sourceUrl: true, originalUrl: true,
      guidelines: true, description: true, requirements: true, title: true,
    },
    orderBy: { createdAt: 'desc' },
    ...(Number.isFinite(LIMIT) ? { take: LIMIT } : {}),
  });

  const stats = {
    scanned: 0, typeSet: 0, upgraded: 0, stillFallback: 0, noLink: 0,
    byType: new Map<string, number>(),
  };
  const updates: Array<{ id: string; applyUrl: string | null; applyUrlType: string; title: string; upgrade: boolean }> = [];

  for (const row of rows) {
    stats.scanned++;
    const currentType = classifyApplyUrl(row.applyUrl, row.sourceUrl, row.originalUrl);

    let applyUrl = row.applyUrl;
    let applyType = currentType;
    let upgraded = false;

    // Only attempt an upgrade when the current link is not a real destination.
    if (currentType === 'source_article_fallback' || currentType === 'unknown' || !row.applyUrl) {
      const real = extractRealApplyLink([
        row.guidelines,
        row.description,
        row.requirements,
      ]);
      if (real && real !== row.applyUrl) {
        applyUrl = real;
        applyType = classifyApplyUrl(real, row.sourceUrl, row.originalUrl);
        upgraded = true;
      } else {
        applyType = row.applyUrl ? currentType : 'unknown';
      }
    }

    stats.byType.set(applyType, (stats.byType.get(applyType) || 0) + 1);
    if (upgraded) stats.upgraded++;
    if (applyType === 'source_article_fallback') stats.stillFallback++;
    if (!applyUrl) stats.noLink++;
    if (applyType !== (row.applyUrlType ?? '') || applyUrl !== row.applyUrl) stats.typeSet++;

    updates.push({ id: row.id, applyUrl, applyUrlType: applyType, title: row.title, upgrade: upgraded });
  }

  console.log(`\n=== Apply-link backfill ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
  console.log(`scanned: ${stats.scanned}`);
  console.log(`rows to update (type/link): ${stats.typeSet}`);
  console.log(`upgraded to a real apply link: ${stats.upgraded}`);
  console.log(`still source-article fallback (instructions shown, no button): ${stats.stillFallback}`);
  console.log(`no link at all (instructions only): ${stats.noLink}`);
  console.log('final type histogram:', Object.fromEntries(stats.byType));

  if (updates.some((u) => u.upgrade)) {
    console.log('\nsample upgrades (first 15):');
    for (const u of updates.filter((u) => u.upgrade).slice(0, 15)) {
      console.log(`  ${u.id}  "${u.title.slice(0, 50)}" → ${u.applyUrl}`);
    }
  }

  if (!APPLY) {
    console.log('\ndry run only — rerun with --apply to commit.');
    await db.$disconnect();
    return;
  }

  let updated = 0;
  for (const u of updates) {
    try {
      await db.opportunity.update({
        where: { id: u.id },
        data: { applyUrl: u.applyUrl, applyUrlType: u.applyUrlType },
      });
      updated++;
    } catch (e) {
      console.error(`failed ${u.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`\ncommitted: ${updated} rows updated.`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
