import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const q = await db.$queryRawUnsafe<any[]>(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status='published')::int AS published,
      count(*) FILTER (WHERE "descriptionI18n"->>'fa' IS NOT NULL AND "descriptionI18n"->>'fa' <> '')::int AS fa_desc,
      count(*) FILTER (WHERE "descriptionI18n"->>'ps' IS NOT NULL AND "descriptionI18n"->>'ps' <> '')::int AS ps_desc,
      count(*) FILTER (WHERE "titleI18n"->>'fa' IS NOT NULL AND "titleI18n"->>'fa' <> '')::int AS fa_title,
      count(*) FILTER (WHERE status='published' AND "descriptionI18n"->>'fa' IS NOT NULL AND "descriptionI18n"->>'fa' <> '')::int AS pub_fa_desc
    FROM "Opportunity"`);
  console.log(JSON.stringify(q[0], null, 1));
  await db.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
