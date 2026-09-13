/**
 * update-lang-and-nav.ts
 * One-off script to:
 * 1. Update the 'fa' language to Persian/فارسی
 * 2. Update all menu items with labelI18n translations
 */
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

// Load .env manually
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

const DATABASE_URL = envVars['DATABASE_URL'] || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  console.log('🌐 Connected via Neon serverless HTTP (port 443)');

  // 1. Update language name
  console.log('→ Updating fa language to Persian/فارسی...');
  await sql`
    UPDATE "Language"
    SET name = 'Persian', "nativeName" = 'فارسی', "updatedAt" = now()
    WHERE code = 'fa'
  `;
  console.log('✅ Language updated.');

  // 2. Update menu items labelI18n by label name
  console.log('→ Updating menu item labelI18n translations...');
  const translations: Record<string, { fa: string; ps: string }> = {
    'Home':          { fa: 'خانه',      ps: 'کور' },
    'Services':      { fa: 'خدمات',     ps: 'خدمات' },
    'Visas':         { fa: 'ویزهها',    ps: 'ویزې' },
    'Opportunities': { fa: 'فرصتها',    ps: 'فرصتونه' },
    'Promote':       { fa: 'تبلیغات',   ps: 'اعلانات' },
    'Gallery':       { fa: 'گالری',     ps: 'ګالري' },
    'Payments':      { fa: 'پرداختها',  ps: 'تادیات' },
    'Contact':       { fa: 'تماس',      ps: 'اړیکه' },
    'Business Setup':{ fa: 'راه‌اندازی کسب‌وکار', ps: 'د سوداګرۍ جوړول' },
    'Legal Services':{ fa: 'خدمات حقوقی',         ps: 'قانوني خدمات' },
    'Travel & Visa': { fa: 'سفر و ویزا',            ps: 'سفر او ویزه' },
  };

  for (const [label, i18n] of Object.entries(translations)) {
    const labelI18n = JSON.stringify({ en: label, fa: i18n.fa, ps: i18n.ps });
    const result = await sql`
      UPDATE "MenuItem"
      SET "labelI18n" = ${labelI18n}::jsonb, "updatedAt" = now()
      WHERE label = ${label}
    `;
    console.log(`  ✓ ${label}`);
  }

  console.log('\n✅ Done! Language and nav i18n updated.');
}

run().catch(e => {
  console.error('❌ Failed:', e?.message || e);
  process.exit(1);
});
