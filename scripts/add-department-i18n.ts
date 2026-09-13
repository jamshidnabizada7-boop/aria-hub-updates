/** Adds Department.nameI18n column + seeds trilingual names (db:push forbidden in sandbox). */
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const NAMES: Record<string, { fa: string; ps: string }> = {
  'Visa & Immigration': { fa: 'ویزا و مهاجرت', ps: 'ویزه او کډوالۍ' },
  'Business Services': { fa: 'خدمات تجاری', ps: 'سوداګریزې خدمتونه' },
  Legal: { fa: 'حقوقی', ps: 'قانوني' },
  Translation: { fa: 'ترجمه', ps: 'ژباړه' },
};

async function main() {
  await db.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "nameI18n" JSONB`);
  let n = 0;
  for (const [name, i18n] of Object.entries(NAMES)) {
    const row = await db.department.findFirst({ where: { name } });
    if (row) {
      await db.department.update({
        where: { id: row.id },
        data: { nameI18n: { en: name, ...i18n } },
      });
      n++;
    }
  }
  console.log(`OK Department.nameI18n ready, ${n} rows seeded`);
}
main().finally(() => db.$disconnect());
