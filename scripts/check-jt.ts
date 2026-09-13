import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const q = await db.$queryRawUnsafe<any[]>(`SELECT
    count(*) FILTER (WHERE "jobTypeI18n"->>'fa' IS NOT NULL AND "jobTypeI18n"->>'fa' <> '')::int AS jt_fa,
    count(*) FILTER (WHERE "jobType" IS NOT NULL AND "jobType" <> '')::int AS jt_any
    FROM "Opportunity"`);
  console.log(JSON.stringify(q[0]));
  await db.$disconnect();
}
main();
