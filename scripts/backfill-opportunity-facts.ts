/** Vocabulary-only backfill: no provider calls. Preview unless --write. */
import { db } from '../src/lib/db';
import { factObject, materializeFactTranslations } from '../src/lib/opportunity-facts';
import type { Prisma } from '@prisma/client';

const write = process.argv.includes('--write');
let changed = 0;
try {
  const rows = await db.opportunity.findMany({ where: { status: 'published' }, select: { id: true, slug: true, extractedData: true, extractedDataI18n: true, translationOrigin: true } });
  for (const row of rows) {
    if (!materializeFactTranslations(row.extractedData, row.extractedDataI18n)) continue;
    if (!write) { changed++; continue; }
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Opportunity" WHERE id = ${row.id} FOR UPDATE`;
      const fresh = await tx.opportunity.findUnique({ where: { id: row.id }, select: { extractedData: true, extractedDataI18n: true, translationOrigin: true } });
      if (!fresh) return;
      const next = materializeFactTranslations(fresh.extractedData, fresh.extractedDataI18n);
      if (!next) return;
      const origins = factObject(fresh.translationOrigin);
      const original = factObject(fresh.extractedDataI18n);
      for (const lang of ['fa', 'ps']) {
        if (/^MANUAL/.test(String(origins[lang] || ''))) {
          if (original[lang] === undefined) delete next[lang]; else next[lang] = original[lang];
          const sources = factObject(next._sources);
          if (factObject(original._sources)[lang] === undefined) delete sources[lang]; else sources[lang] = factObject(original._sources)[lang];
        }
      }
      if (JSON.stringify(next) === JSON.stringify(original)) return;
      await tx.opportunity.update({ where: { id: row.id }, data: { extractedDataI18n: next as Prisma.InputJsonObject } });
      changed++;
    });
  }
  console.log(JSON.stringify({ mode: write ? 'write' : 'preview', checked: rows.length, changed, slugs: rows.map(r => r.slug) }));
} finally { await db.$disconnect(); }
