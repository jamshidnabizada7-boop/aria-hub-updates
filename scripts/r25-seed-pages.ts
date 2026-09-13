/**
 * R25 — Seed the `Page` CMS rows (about / privacy-policy / terms-of-service)
 * with FULL trilingual content generated from src/lib/static-page-content.ts.
 *
 * Why: the Page table was empty, so /about, /privacy-policy, /terms-of-service
 * rendered hardcoded English for every language. The page components now fall
 * back to built-in trilingual docs AND prefer a published Page row; this seed
 * creates those rows (en+fa+ps) so the content is DB-driven and admin-editable
 * without degrading any language.
 *
 * Run: bun run scripts/r25-seed-pages.ts
 */
import { db } from '../src/lib/db';
import { ABOUT_DOC, PRIVACY_DOC, PRIVACY_ADSENSE_TAIL, TERMS_DOC, type LocalDoc } from '../src/lib/static-page-content';

function docToHtml(doc: LocalDoc, lang: 'en' | 'fa' | 'ps', withAdSenseTail = false): string {
  const t = (o: { en: string; fa: string; ps: string }) => o[lang];
  const parts: string[] = [];
  for (const s of doc.sections) {
    parts.push(`<section><h2>${t(s.heading)}</h2>`);
    for (const p of s.paragraphs ?? []) parts.push(`<p>${t(p)}</p>`);
    if (s.bullets?.length) {
      parts.push('<ul>' + s.bullets.map((b) => `<li>${t(b)}</li>`).join('') + '</ul>');
    }
    if (withAdSenseTail && s.heading.en === '3. Google AdSense & Cookies') {
      parts.push(
        `<p>${t(PRIVACY_ADSENSE_TAIL.text)} <a href="${PRIVACY_ADSENSE_TAIL.linkHref}">${t(PRIVACY_ADSENSE_TAIL.linkLabel)}</a>.</p>`,
      );
    }
    parts.push('</section>');
  }
  return parts.join('\n');
}

async function upsertPage(slug: string, doc: LocalDoc, withAdSenseTail = false) {
  const data = {
    slug,
    status: 'published' as const,
    title: doc.title.en,
    titleI18n: { en: doc.title.en, fa: doc.title.fa, ps: doc.title.ps },
    content: docToHtml(doc, 'en', withAdSenseTail),
    contentI18n: {
      en: docToHtml(doc, 'en', withAdSenseTail),
      fa: docToHtml(doc, 'fa', withAdSenseTail),
      ps: docToHtml(doc, 'ps', withAdSenseTail),
    },
  };
  const row = await db.page.upsert({
    where: { slug },
    create: data,
    update: {
      status: data.status,
      titleI18n: data.titleI18n,
      contentI18n: data.contentI18n,
      // keep admin-edited `title`/`content` base fields if a row already existed
    },
  });
  console.log(`✓ Page "${slug}" seeded (id=${row.id})`);
}

async function main() {
  await upsertPage('about', ABOUT_DOC);
  await upsertPage('privacy-policy', PRIVACY_DOC, true);
  await upsertPage('terms-of-service', TERMS_DOC);
  console.log('DONE');
}

main()
  .catch((e) => {
    console.error('FATAL', e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
