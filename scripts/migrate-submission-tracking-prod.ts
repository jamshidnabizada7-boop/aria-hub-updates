/**
 * Production (Neon) migration — submission tracking + decision notifications.
 * Idempotent: adds referenceCode/lang/publishedSlug/notifiedAt to
 * OpportunitySubmission, backfills reference codes for existing rows, then
 * enforces NOT NULL + UNIQUE on referenceCode.
 *
 * Run AFTER Neon connectivity returns, BEFORE deploying the tracking code:
 *   DATABASE_URL="postgresql://…neon…" bun scripts/migrate-submission-tracking-prod.ts
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

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
  } catch {
    /* fallthrough */
  }
  throw new Error('No PostgreSQL DATABASE_URL found');
}

const db = new PrismaClient({ datasources: { db: { url: resolveDatabaseUrl() } } });

// Same alphabet as src/app/api/opportunities/submit/route.ts
const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function makeReferenceCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return `AR-${code}`;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2) AS exists`,
    table,
    column
  );
  return rows[0]?.exists === true;
}

async function main() {
  console.log('[track-migration] target:', resolveDatabaseUrl().slice(0, 60) + '…');

  // ── 1. Add columns (IF NOT EXISTS keeps this idempotent) ──
  await db.$executeRawUnsafe(`ALTER TABLE "OpportunitySubmission" ADD COLUMN IF NOT EXISTS "referenceCode" TEXT`);
  await db.$executeRawUnsafe(`ALTER TABLE "OpportunitySubmission" ADD COLUMN IF NOT EXISTS "lang" TEXT NOT NULL DEFAULT 'en'`);
  await db.$executeRawUnsafe(`ALTER TABLE "OpportunitySubmission" ADD COLUMN IF NOT EXISTS "publishedSlug" TEXT`);
  await db.$executeRawUnsafe(`ALTER TABLE "OpportunitySubmission" ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP(3)`);

  // ── 2. Backfill reference codes for rows created before this deploy ──
  const missing = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "OpportunitySubmission" WHERE "referenceCode" IS NULL`
  );
  for (const row of missing) {
    let code = makeReferenceCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await db.$executeRawUnsafe(
          `UPDATE "OpportunitySubmission" SET "referenceCode" = $1 WHERE id = $2`,
          code,
          row.id
        );
        break;
      } catch {
        code = makeReferenceCode(); // unique collision — retry with a new code
      }
    }
  }
  console.log(`[track-migration] backfilled reference codes: ${missing.length}`);

  // Backfill publishedSlug from already-approved submissions (best effort —
  // matches by title against live opportunities created from submissions).
  const approved = await db.$queryRawUnsafe<{ id: string; title: string }[]>(
    `SELECT id, title FROM "OpportunitySubmission" WHERE status = 'approved' AND "publishedSlug" IS NULL`
  );
  for (const row of approved) {
    const opp = await db.opportunity.findFirst({
      where: { title: row.title, sourceName: { in: ['Employer', 'Community'] } },
      select: { slug: true },
    });
    if (opp) {
      await db.$executeRawUnsafe(
        `UPDATE "OpportunitySubmission" SET "publishedSlug" = $1 WHERE id = $2`,
        opp.slug,
        row.id
      );
    }
  }
  console.log(`[track-migration] linked publishedSlug for approved submissions: ${approved.length} scanned`);

  // ── 3. Enforce NOT NULL + UNIQUE (idempotent) ──
  await db.$executeRawUnsafe(`ALTER TABLE "OpportunitySubmission" ALTER COLUMN "referenceCode" SET NOT NULL`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OpportunitySubmission_referenceCode_key" ON "OpportunitySubmission"("referenceCode")`);

  console.log('[track-migration] done ✓');
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('[track-migration] FAILED:', e);
  await db.$disconnect();
  process.exit(1);
});
