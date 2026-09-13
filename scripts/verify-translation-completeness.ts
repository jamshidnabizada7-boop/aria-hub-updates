// Verify all translation keys exist across all languages
import { translations } from '../src/lib/i18n';

console.log('========== TRANSLATION COMPLETENESS VERIFICATION ==========\n');

const languages = ['en', 'fa', 'ps'];
const enKeys = Object.keys(translations.en);

console.log(`Total keys in English: ${enKeys.length}\n`);

// Check each language for missing keys
languages.forEach(lang => {
  if (lang === 'en') return; // Skip English as it's the source
  
  const langKeys = Object.keys(translations[lang]);
  console.log(`${lang.toUpperCase()} Keys: ${langKeys.length}`);
  
  const missingKeys = enKeys.filter(key => !translations[lang][key]);
  const extraKeys = langKeys.filter(key => !translations.en[key]);
  
  if (missingKeys.length > 0) {
    console.log(`  ❌ Missing ${missingKeys.length} keys in ${lang}:`);
    missingKeys.slice(0, 10).forEach(key => console.log(`     - ${key}`));
    if (missingKeys.length > 10) {
      console.log(`     ... and ${missingKeys.length - 10} more`);
    }
  } else {
    console.log(`  ✅ All English keys present in ${lang}`);
  }
  
  if (extraKeys.length > 0) {
    console.log(`  ⚠️  ${extraKeys.length} extra keys not in English:`);
    extraKeys.slice(0, 10).forEach(key => console.log(`     - ${key}`));
  }
  
  console.log();
});

// Summary
console.log('\n========== SUMMARY ==========\n');
const faKeys = Object.keys(translations.fa);
const psKeys = Object.keys(translations.ps);

const faMissing = enKeys.filter(key => !translations.fa[key]).length;
const psMissing = enKeys.filter(key => !translations.ps[key]).length;

if (faMissing === 0 && psMissing === 0) {
  console.log('✅ ALL LANGUAGES HAVE COMPLETE TRANSLATIONS!');
  console.log(`   English: ${enKeys.length} keys`);
  console.log(`   Persian: ${faKeys.length} keys`);
  console.log(`   Pashto: ${psKeys.length} keys`);
} else {
  console.log('⚠️  TRANSLATION GAPS DETECTED:');
  if (faMissing > 0) console.log(`   Persian missing: ${faMissing} keys`);
  if (psMissing > 0) console.log(`   Pashto missing: ${psMissing} keys`);
}
