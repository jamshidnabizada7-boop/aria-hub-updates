/**
 * refresh-sample-data.ts — LOCAL DEV/QA ONLY.
 *
 * Keeps the sandbox's sample content usable for QA:
 *  1. Re-stagger deadlines: any published opportunity expiring within 7 days
 *     gets pushed into the future (10–80 days, stable per-slug offset) so
 *     listings/countdowns/spotlights always have healthy content.
 *  2. Backfill applyUrl where missing (half mailto:, half https://example.org)
 *     so the Apply CTA / sticky mobile bar can be QA'd in both variants.
 *
 * SAFETY: refuses to run against any host except 127.0.0.1:5433 — fake
 * content must NEVER reach production Neon.
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL ?? '';
if (!/@(127\.0\.0\.1|localhost):5433/.test(url)) {
  console.error('REFUSING to run: DATABASE_URL is not the local dev DB (127.0.0.1:5433).');
  process.exit(1);
}

const db = new PrismaClient();

/** Stable per-slug pseudo-offset in [10, 80] days. */
function offsetDays(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return 10 + (h % 71);
}

async function main() {
  const rows = await db.opportunity.findMany({
    where: { status: 'published' },
    select: { id: true, slug: true, deadline: true, applyUrl: true },
  });

  const soonCutoff = Date.now() + 7 * 86400000;
  let deadlinesBumped = 0;
  let applyAdded = 0;

  for (const [i, row] of rows.entries()) {
    const data: { deadline?: Date; applyUrl?: string } = {};

    if (!row.deadline || row.deadline.getTime() < soonCutoff) {
      data.deadline = new Date(Date.now() + offsetDays(row.slug) * 86400000);
      deadlinesBumped++;
    }
    if (!row.applyUrl) {
      // Alternate mailto / https so both Apply variants get exercised in QA.
      data.applyUrl =
        i % 2 === 0
          ? `mailto:careers@example.org?subject=Application:${row.slug}`
          : `https://example.org/apply/${row.slug}`;
      applyAdded++;
    }

    if (Object.keys(data).length > 0) {
      await db.opportunity.update({ where: { id: row.id }, data });
    }
  }

  const active = await db.opportunity.count({
    where: { status: 'published', OR: [{ deadline: null }, { deadline: { gte: new Date() } }] },
  });
  console.log(
    `refresh-sample-data: ${rows.length} rows scanned, ${deadlinesBumped} deadlines bumped, ${applyAdded} apply links added. Active now: ${active}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
