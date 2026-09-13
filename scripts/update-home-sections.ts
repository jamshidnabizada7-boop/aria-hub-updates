/**
 * update-home-sections.ts
 *
 * The homepage is now a hardcoded, compact 6-section layout
 * (hero / category directory / latest opportunities / services strip /
 * trust+testimonials / CTA) — it no longer renders sections from the CMS
 * Section table. This script disables every Section row (enabled=false)
 * so the admin section manager reflects reality and nobody re-enables a
 * section that will never render.
 *
 * It also repoints the homepage CTA banner button from the dead "#contact"
 * anchor (the contact section no longer exists on the homepage) to the
 * real /contact page.
 *
 * Run: bun scripts/update-home-sections.ts
 */
import { createDb } from './db-client';

async function main() {
  const db = createDb();
  try {
    // 1. Disable all Section rows.
    const sections = await db.section.findMany({
      orderBy: { order: 'asc' },
      select: { key: true, title: true, enabled: true, order: true },
    });
    const wasOn = sections.filter((s) => s.enabled);
    const result = await db.section.updateMany({ data: { enabled: false } });

    console.log(
      `Sections: disabled ${result.count} of ${sections.length} rows ` +
        `(${sections.length - wasOn.length} were already off).`
    );
    for (const s of sections) {
      console.log(
        `  ${s.enabled ? '[on  → off]' : '[already off]'} order=${String(s.order).padStart(2, ' ')} key=${s.key} ("${s.title}")`
      );
    }

    // 2. Repoint the homepage CTA banner button.
    const banners = await db.ctaBanner.updateMany({
      where: { buttonUrl: '#contact' },
      data: { buttonUrl: '/contact' },
    });
    console.log(
      `\nCTA banners: repointed ${banners.count} banner(s) from #contact → /contact.`
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
