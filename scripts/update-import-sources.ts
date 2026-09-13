/**
 * Update ImportSource rows for the scraper overhaul (Task 5).
 *
 * - Scholarships.af: fix the maxPages=2 config bug → {crawlDelayMs:1200, maxPages:10}
 * - Wazifaha:        enable detail fetch + more pages → {crawlDelayMs:1200, detailFetch:true, maxPages:8}
 * - O4AF (new):      register the new o4af.com source
 *
 * Run: bun run scripts/update-import-sources.ts
 *
 * NOTE: only touches ImportSource rows — never the Opportunity table.
 */

import { createDb } from './db-client';

const db = createDb();

const SCHOLARSHIPS_CONFIG = { crawlDelayMs: 1200, maxPages: 10 };
const WAZIFAHA_CONFIG = { crawlDelayMs: 1200, detailFetch: true, maxPages: 8 };
const O4AF_CONFIG = { crawlDelayMs: 2500, detailFetch: true, maxPages: 5 };

async function main(): Promise<void> {
  // ── 1. Scholarhips.af ─────────────────────────────────────────────────────
  const sch = await db.importSource.findFirst({ where: { scraperKey: 'scholarshipsAf' } });
  if (sch) {
    await db.importSource.update({
      where: { id: sch.id },
      data: { config: JSON.stringify(SCHOLARSHIPS_CONFIG) },
    });
    console.log(`[ok] Scholarships.af config updated → ${JSON.stringify(SCHOLARSHIPS_CONFIG)} (was ${sch.config})`);
  } else {
    console.log('[warn] Scholarships.af ImportSource row not found — skipped');
  }

  // ── 2. Wazifaha ───────────────────────────────────────────────────────────
  const wz = await db.importSource.findFirst({ where: { scraperKey: 'wazifaha' } });
  if (wz) {
    await db.importSource.update({
      where: { id: wz.id },
      data: { config: JSON.stringify(WAZIFAHA_CONFIG) },
    });
    console.log(`[ok] Wazifaha config updated → ${JSON.stringify(WAZIFAHA_CONFIG)} (was ${wz.config})`);
  } else {
    console.log('[warn] Wazifaha ImportSource row not found — skipped');
  }

  // ── 3. O4AF (new source) ──────────────────────────────────────────────────
  const o4afData = {
    name: 'O4AF Opportunities',
    type: 'job',
    scraperKey: 'o4af',
    baseUrl: 'https://www.o4af.com/opportunities/?job_type=job',
    enabled: true,
    autoPublish: true,
    scheduleMinutes: 360,
    defaultCategory: null as string | null,
    config: JSON.stringify(O4AF_CONFIG),
  };

  const existing = await db.importSource.findFirst({ where: { scraperKey: 'o4af' } });
  if (existing) {
    await db.importSource.update({ where: { id: existing.id }, data: o4afData });
    console.log(`[ok] O4AF ImportSource updated (id=${existing.id}) → ${JSON.stringify(O4AF_CONFIG)}`);
  } else {
    const created = await db.importSource.create({ data: o4afData });
    console.log(`[ok] O4AF ImportSource created (id=${created.id}) → ${JSON.stringify(O4AF_CONFIG)}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const all = await db.importSource.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, scraperKey: true, enabled: true, baseUrl: true, config: true },
  });
  console.log('\nImportSource rows after update:');
  for (const s of all) {
    console.log(
      `  - ${s.name} [key=${s.scraperKey}] enabled=${s.enabled} baseUrl=${s.baseUrl} config=${s.config}`,
    );
  }
}

main()
  .catch((e) => {
    console.error('[error]', e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
