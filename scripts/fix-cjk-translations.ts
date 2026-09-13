/**
 * CJK contamination cleanup.
 *
 * Some backfilled fa/ps translations contain leaked CJK glyphs (Chinese/
 * Japanese/Korean characters) mixed into Persian/Pashto text — a serious
 * quality issue for readers.
 *
 * This script surgically removes ONLY the contaminated language values from
 * every i18n JSON field (keeps the other languages intact). Records losing
 * their fa/ps title become "pending translation" again, so the backfill
 * translate pass will re-translate them once the API rate limit allows.
 * Until then the site falls back to the English value (better than showing
 * Chinese characters to a Pashto reader).
 *
 * Usage: bun run scripts/fix-cjk-translations.ts [--dry]
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

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
const dry = process.argv.includes('--dry');

// CJK + full-width + kana + hangul ranges (excludes Persian/Pashto Arabic ranges entirely)
const CJK = /[\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uFF01-\uFF60\uFFE0-\uFFE6]/;

/** i18n JSON columns on Opportunity to inspect. */
const I18N_FIELDS = [
  'titleI18n',
  'descriptionI18n',
  'aiSummaryI18n',
  'eligibilityI18n',
  'benefitsI18n',
  'jobTypeI18n',
  'salaryI18n',
  'educationReqI18n',
  'experienceI18n',
  'responsibilitiesI18n',
  'requirementsI18n',
  'guidelinesI18n',
  'tagsI18n',
  'seoTitleI18n',
  'seoDescriptionI18n',
  'seoKeywordsI18n',
  'ogTitleI18n',
  'ogDescriptionI18n',
  'extractedDataI18n',
] as const;

function cleanI18n(value: unknown): { cleaned: Record<string, unknown> | null; changed: string[] } {
  if (value === null || value === undefined) return { cleaned: null, changed: [] };
  if (typeof value !== 'object') return { cleaned: value as Record<string, unknown>, changed: [] };
  const obj = { ...(value as Record<string, unknown>) };
  const changed: string[] = [];
  for (const lang of ['fa', 'ps']) {
    const v = obj[lang];
    if (typeof v === 'string' && CJK.test(v)) {
      delete obj[lang];
      changed.push(lang);
    } else if (v !== null && v !== undefined && typeof v === 'object') {
      // nested objects (e.g. extractedData) — check their string values
      const sub = v as Record<string, unknown>;
      if (Object.values(sub).some((sv) => typeof sv === 'string' && CJK.test(sv as string))) {
        delete obj[lang];
        changed.push(lang);
      }
    }
  }
  return { cleaned: changed.length ? obj : (value as Record<string, unknown>), changed };
}

async function main() {
  const rows = await db.opportunity.findMany({
    select: { id: true, slug: true, ...Object.fromEntries(I18N_FIELDS.map((f) => [f, true])) },
  });
  console.log(`scanning ${rows.length} opportunities…`);

  let touched = 0;
  const perLang = { fa: 0, ps: 0 };

  for (const row of rows) {
    const updates: Record<string, unknown> = {};
    const langsHit = new Set<string>();

    for (const field of I18N_FIELDS) {
      const raw = (row as Record<string, unknown>)[field];
      if (raw === null || raw === undefined) continue;
      const { cleaned, changed } = cleanI18n(raw);
      if (changed.length) {
        updates[field] = cleaned;
        changed.forEach((l) => { langsHit.add(l); perLang[l]++; });
      }
    }

    if (Object.keys(updates).length) {
      touched++;
      if (dry) {
        console.log(`[dry] ${row.slug}: strip ${[...langsHit].join('+')} from ${Object.keys(updates).join(', ')}`);
      } else {
        await db.opportunity.update({ where: { id: row.id }, data: updates });
        console.log(`✓ ${row.slug}: stripped ${[...langsHit].join('+')} (fields: ${Object.keys(updates).length})`);
      }
    }
  }

  console.log(`\nDone. records touched: ${touched}${dry ? ' (DRY RUN)' : ''} | fa values removed: ${perLang.fa} | ps values removed: ${perLang.ps}`);
  console.log('These records will be re-translated by the backfill pass (pending detection = missing fa/ps).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
