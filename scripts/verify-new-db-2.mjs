// Final analysis: dates, languages, payment methods, I18n JSON contents
import pg from 'pg';

const NEW_URL = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: NEW_URL, max: 3, connectionTimeoutMillis: 15000 });

async function main() {
  // 1. Creation date ranges — is this migrated data or a fresh seed?
  console.log('=== CREATED AT RANGES (key tables) ===');
  for (const t of ['Opportunity', 'Service', 'Visa', 'News', 'MenuItem', 'Section', 'Faq', 'FooterLink', 'AdminUser', 'ImportSource', 'PaymentMethod', 'PricingPackage', 'Language', 'SiteSetting']) {
    try {
      const { rows } = await pool.query(`SELECT MIN("createdAt") AS mn, MAX("createdAt") AS mx FROM "${t}"`);
      console.log(`${t.padEnd(16)} ${rows[0].mn ? new Date(rows[0].mn).toISOString() : '-'}  ->  ${rows[0].mx ? new Date(rows[0].mx).toISOString() : '-'}`);
    } catch (e) { console.log(`${t}: ERR ${e.message.slice(0, 50)}`); }
  }

  // 2. Languages
  console.log('\n=== LANGUAGES ===');
  const { rows: langs } = await pool.query('SELECT * FROM "Language"');
  console.log(JSON.stringify(langs, null, 0).slice(0, 800));

  // 3. Payment methods (full list — Afghan market relevance)
  console.log('\n=== PAYMENT METHODS ===');
  const { rows: pm } = await pool.query('SELECT name, slug, "accountNumber", status FROM "PaymentMethod" ORDER BY "order"');
  pm.forEach(r => console.log(`${r.name.padEnd(20)} ${r.slug.padEnd(15)} acct=${r.accountNumber || '-'} ${r.status}`));

  // 4. I18n JSON content check (Service has data)
  console.log('\n=== SERVICE titleI18n SAMPLE (translation quality) ===');
  const { rows: sv } = await pool.query('SELECT title, "titleI18n" FROM "Service" LIMIT 2');
  sv.forEach(r => console.log(`${r.title} => ${JSON.stringify(r.titleI18n)?.slice(0, 300)}`));

  // 5. Opportunity categories (17) — quick look
  console.log('\n=== OPPORTUNITY CATEGORIES ===');
  const { rows: oc } = await pool.query('SELECT slug, name FROM "OpportunityCategory" ORDER BY sort LIMIT 20');
  oc.forEach(r => console.log(`${r.slug.padEnd(25)} ${String(r.name).slice(0, 40)}`));

  // 6. Any real scraped opportunities? (sourceUrl set)
  const { rows: scraped } = await pool.query(`SELECT COUNT(*)::int AS c FROM "Opportunity" WHERE "sourceUrl" IS NOT NULL`);
  const { rows: translated } = await pool.query(`SELECT COUNT(*)::int AS c FROM "Opportunity" WHERE "titleI18n" IS NOT NULL`);
  console.log(`\n=== OPPORTUNITY QUALITY === scraped(sourceUrl set): ${scraped[0].c} / 6, with titleI18n: ${translated[0].c} / 6`);

  // 7. Menu structure sample
  console.log('\n=== MENU ITEMS (top-level) ===');
  const { rows: mi } = await pool.query(`SELECT label, "labelI18n", href, location FROM "MenuItem" WHERE "parentId" IS NULL ORDER BY sort LIMIT 12`);
  mi.forEach(r => console.log(`${String(r.label).padEnd(25)} ${r.href || ''} [${r.location || ''}] i18n=${r.labelI18n ? 'YES' : 'no'}`));

  await pool.end();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
