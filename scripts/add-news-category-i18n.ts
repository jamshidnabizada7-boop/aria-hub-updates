/** Adds NewsCategory.nameI18n column (raw ALTER — db:push is forbidden in sandbox). */
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  await db.$executeRawUnsafe(`ALTER TABLE "NewsCategory" ADD COLUMN IF NOT EXISTS "nameI18n" JSONB`);
  console.log('OK NewsCategory.nameI18n ready');
}
main().finally(() => db.$disconnect());
