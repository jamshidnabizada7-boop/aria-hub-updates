/**
 * PRODUCTION MIGRATION — Success Stories trilingual upgrade (+ leftover
 * VisaRejection table for DBs that predate R9).
 *
 * Run against PRODUCTION Neon AFTER the data-transfer quota resets/upgrades:
 *
 *   DATABASE_URL="postgresql://neondb_owner:...@<neon-host>.../neondb?sslmode=require" bun scripts/migrate-success-stories-prod.ts
 *
 * Idempotent raw SQL (no prisma db push — that would diff the whole schema):
 *   - adds titleI18n, storyType, program, contentI18n, contactEmail, featured columns
 *   - flips status default to 'pending' (community submissions await moderation)
 *   - backfills storyType='other' + status='published' for pre-existing rows
 *   - creates VisaRejection table if missing (R9 leftover on old prod DBs)
 *   - adds the @@index(status, storyType)
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const stmts: string[] = [
    // ── SuccessStory trilingual/general upgrade ──
    `ALTER TABLE "SuccessStory" ADD COLUMN IF NOT EXISTS "titleI18n" JSONB`,
    `ALTER TABLE "SuccessStory" ADD COLUMN IF NOT EXISTS "storyType" TEXT NOT NULL DEFAULT 'other'`,
    `ALTER TABLE "SuccessStory" ADD COLUMN IF NOT EXISTS "program" TEXT`,
    `ALTER TABLE "SuccessStory" ADD COLUMN IF NOT EXISTS "contentI18n" JSONB`,
    `ALTER TABLE "SuccessStory" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT`,
    `ALTER TABLE "SuccessStory" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "SuccessStory" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    `UPDATE "SuccessStory" SET "storyType" = 'other' WHERE "storyType" IS NULL`,
    `UPDATE "SuccessStory" SET "status" = 'published' WHERE "status" IS NULL`,
    `CREATE INDEX IF NOT EXISTS "SuccessStory_status_storyType_idx" ON "SuccessStory"("status", "storyType")`,
    `CREATE INDEX IF NOT EXISTS "SuccessStory_createdAt_idx" ON "SuccessStory"("createdAt")`,
    // ── VisaRejection (R9 leftover — old prod DBs may not have it) ──
    `CREATE TABLE IF NOT EXISTS "VisaRejection" (
      "id" TEXT NOT NULL,
      "code" TEXT,
      "section" TEXT,
      "title" TEXT NOT NULL,
      "titleI18n" JSONB,
      "description" TEXT NOT NULL,
      "descriptionI18n" JSONB,
      "mitigation" TEXT,
      "mitigationI18n" JSONB,
      "icon" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'published',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "VisaRejection_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "VisaRejection_order_idx" ON "VisaRejection"("order")`,
  ];

  for (const sql of stmts) {
    await db.$executeRawUnsafe(sql);
  }

  const [{ count: stories }] = (await db.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "SuccessStory"`
  )) as { count: number }[];
  const [{ count: rejections }] = (await db.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "VisaRejection"`
  )) as { count: number }[];

  console.log(
    `migrate-success-stories-prod OK: ${stmts.length} statements applied. SuccessStory rows=${stories}, VisaRejection rows=${rejections}`
  );
  console.log(
    'Next steps: seed VisaRejection content via scripts/seed-visa-rejections.ts; success stories will grow via admin + public submissions.'
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
