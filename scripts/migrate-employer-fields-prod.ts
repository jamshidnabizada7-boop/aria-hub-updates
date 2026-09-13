/**
 * PRODUCTION MIGRATION — Employer lane fields on OpportunitySubmission.
 *
 * Run against PRODUCTION Neon (after quota reset) BEFORE the employer
 * posting flow is used in production:
 *
 *   DATABASE_URL="postgresql://neondb_owner:...@<neon-host>.../neondb?sslmode=require" bun scripts/migrate-employer-fields-prod.ts
 *
 * Idempotent raw SQL (no prisma db push — that would diff the whole schema):
 *   - adds submitterType (default 'community'), jobType, salaryRange,
 *     location, companyWebsite columns
 *   - backfills submitterType='community' for pre-existing rows
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const stmts: string[] = [
    `ALTER TABLE "OpportunitySubmission" ADD COLUMN IF NOT EXISTS "submitterType" TEXT NOT NULL DEFAULT 'community'`,
    `ALTER TABLE "OpportunitySubmission" ADD COLUMN IF NOT EXISTS "jobType" TEXT`,
    `ALTER TABLE "OpportunitySubmission" ADD COLUMN IF NOT EXISTS "salaryRange" TEXT`,
    `ALTER TABLE "OpportunitySubmission" ADD COLUMN IF NOT EXISTS "location" TEXT`,
    `ALTER TABLE "OpportunitySubmission" ADD COLUMN IF NOT EXISTS "companyWebsite" TEXT`,
    `UPDATE "OpportunitySubmission" SET "submitterType" = 'community' WHERE "submitterType" IS NULL`,
  ];

  for (const sql of stmts) {
    await db.$executeRawUnsafe(sql);
  }

  const [{ count }] = (await db.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "OpportunitySubmission" WHERE "submitterType" = 'employer'`
  )) as { count: number }[];

  console.log(`migrate-employer-fields-prod: OK — ${count} employer submission(s) on record.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error('migrate-employer-fields-prod FAILED:', e);
  process.exit(1);
});
