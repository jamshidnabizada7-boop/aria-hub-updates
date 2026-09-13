// Translation key naming convention audit script
import { translations } from '../src/lib/i18n';

const enKeys = Object.keys(translations.en);
console.log('========== TRANSLATION KEY AUDIT ==========\n');
console.log(`Total translation keys: ${enKeys.length}\n`);

// Documented naming patterns from design.md
const documentedPatterns = {
  'Admin panel (admin.*)': /^admin\./,
  'Common actions (common.*)': /^common\./,
  'Form labels (form.*)': /^form\./,
  'Status messages (status.*)': /^status\./,
  'Error messages (error.*)': /^error\./,
  'Placeholder text (placeholder.*)': /^placeholder\./,
  'Frontend sections': /^(nav|hero|services|visas|opportunities|gallery|testimonials|counters|faqs|news|contact|payments|footer|theme|lang|scroll|section|process|pricing|team|detail|comparison|ctaBanner|promote|search|newsletter|cookie|trust|empty)\./,
};

// Categorize all keys
const categorized: Record<string, string[]> = {};
const uncategorized: string[] = [];

enKeys.forEach(key => {
  let found = false;
  for (const [pattern, regex] of Object.entries(documentedPatterns)) {
    if (regex.test(key)) {
      if (!categorized[pattern]) categorized[pattern] = [];
      categorized[pattern].push(key);
      found = true;
      break;
    }
  }
  if (!found) {
    uncategorized.push(key);
  }
});

// Display categories
console.log('========== KEY CATEGORIES ==========\n');
for (const [pattern, keys] of Object.entries(categorized).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${pattern}: ${keys.length} keys`);
}

if (uncategorized.length > 0) {
  console.log(`\n⚠️  Uncategorized keys: ${uncategorized.length}`);
  uncategorized.forEach(key => console.log(`  - ${key}`));
}

// Check admin panel sub-patterns
console.log('\n========== ADMIN PANEL KEY BREAKDOWN ==========\n');
const adminKeys = enKeys.filter(k => k.startsWith('admin.'));
const adminSubPatterns = {
  'admin.nav.*': /^admin\.nav\./,
  'admin.button.*': /^admin\.button\./,
  'admin.dashboard.*': /^admin\.dashboard\./,
  'admin.stat.*': /^admin\.stat\./,
  'admin.table.*': /^admin\.table\./,
  'admin.form.*': /^admin\.form\./,
  'admin.toast.*': /^admin\.toast\./,
  'admin.confirm.*': /^admin\.confirm\./,
  'admin.panel.*': /^admin\.panel\./,
  'admin.settings.*': /^admin\.settings\./,
  'admin.empty.*': /^admin\.empty\./,
};

const adminCategorized: Record<string, string[]> = {};
const adminUncategorized: string[] = [];

adminKeys.forEach(key => {
  let found = false;
  for (const [pattern, regex] of Object.entries(adminSubPatterns)) {
    if (regex.test(key)) {
      if (!adminCategorized[pattern]) adminCategorized[pattern] = [];
      adminCategorized[pattern].push(key);
      found = true;
      break;
    }
  }
  if (!found) {
    adminUncategorized.push(key);
  }
});

for (const [pattern, keys] of Object.entries(adminCategorized)) {
  console.log(`${pattern}: ${keys.length} keys`);
}

if (adminUncategorized.length > 0) {
  console.log(`\n⚠️  Non-compliant admin keys: ${adminUncategorized.length}`);
  adminUncategorized.forEach(key => console.log(`  ❌ ${key}`));
}

// Validate naming conventions
console.log('\n========== NAMING CONVENTION COMPLIANCE ==========\n');

const nonCompliantKeys: { key: string; reason: string }[] = [];

enKeys.forEach(key => {
  // Check for inconsistent casing (should be camelCase after dot)
  const parts = key.split('.');
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    // Check if it's camelCase (starts with lowercase letter or number)
    if (!/^[a-z0-9]/.test(lastPart)) {
      nonCompliantKeys.push({
        key,
        reason: `Last segment '${lastPart}' doesn't follow camelCase convention`
      });
    }
  }
});

if (nonCompliantKeys.length > 0) {
  console.log('Keys with naming convention issues:');
  nonCompliantKeys.forEach(({ key, reason }) => console.log(`  ❌ ${key} - ${reason}`));
} else {
  console.log('✅ All keys follow documented naming conventions!');
}

// Summary
console.log('\n========== SUMMARY ==========\n');
console.log(`Total keys: ${enKeys.length}`);
console.log(`Admin keys: ${adminKeys.length}`);
console.log(`Common keys: ${enKeys.filter(k => k.startsWith('common.')).length}`);
console.log(`Form keys: ${enKeys.filter(k => k.startsWith('form.')).length}`);
console.log(`Status keys: ${enKeys.filter(k => k.startsWith('status.')).length}`);
console.log(`Error keys: ${enKeys.filter(k => k.startsWith('error.')).length}`);
console.log(`Placeholder keys: ${enKeys.filter(k => k.startsWith('placeholder.')).length}`);
console.log(`Frontend section keys: ${enKeys.length - adminKeys.length - enKeys.filter(k => k.startsWith('common.') || k.startsWith('form.') || k.startsWith('status.') || k.startsWith('error.') || k.startsWith('placeholder.')).length}`);

if (adminUncategorized.length === 0 && uncategorized.length === 0 && nonCompliantKeys.length === 0) {
  console.log('\n✅ ALL TRANSLATION KEYS FOLLOW NAMING CONVENTIONS!');
} else {
  console.log(`\n⚠️  Found ${adminUncategorized.length + uncategorized.length + nonCompliantKeys.length} keys that need attention.`);
}
