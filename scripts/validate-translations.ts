#!/usr/bin/env node

/**
 * Translation Validation Script
 * 
 * This script validates translation completeness across all supported languages (en, fa, ps).
 * It checks for:
 * 1. Missing keys in fa or ps that exist in en
 * 2. Keys with empty strings
 * 3. Keys with placeholder values (TODO, FIXME, etc.)
 * 4. Keys that appear to be untranslated (same as English)
 * 
 * Usage:
 *   npm run validate:translations
 *   
 * Exit codes:
 *   0 - All translations are complete
 *   1 - Issues found (missing keys, empty values, or placeholders)
 */

import { translations } from '../src/lib/i18n';

interface ValidationIssue {
  key: string;
  language: string;
  issue: 'missing' | 'empty' | 'placeholder' | 'untranslated';
  details?: string;
}

const PLACEHOLDER_PATTERNS = [
  /TODO/i,
  /FIXME/i,
  /TBD/i,
  /XXX/i,
  /\[placeholder\]/i,
  /\[translation needed\]/i,
];

// Keys that are intentionally the same across all languages
// (brand names, technical placeholders, etc.)
const EXCLUDED_UNTRANSLATED_KEYS = [
  'comparison.aria',                      // Brand name
  'admin.settings.mapEmbedPlaceholder',   // Technical HTML placeholder
  'footer.isoCertified',                  // ISO is international
  'footer.sslSecured',                    // SSL is international
  'hero.bankSecurity',                    // May contain technical terms
];

function validateTranslations(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const enKeys = Object.keys(translations.en);
  const faKeys = Object.keys(translations.fa);
  const psKeys = Object.keys(translations.ps);

  console.log('🔍 Validating translations...\n');
  console.log(`Total keys in English: ${enKeys.length}`);
  console.log(`Total keys in Persian: ${faKeys.length}`);
  console.log(`Total keys in Pashto: ${psKeys.length}\n`);

  // Check for missing keys in fa
  for (const key of enKeys) {
    if (!faKeys.includes(key)) {
      issues.push({
        key,
        language: 'fa',
        issue: 'missing',
      });
    }
  }

  // Check for missing keys in ps
  for (const key of enKeys) {
    if (!psKeys.includes(key)) {
      issues.push({
        key,
        language: 'ps',
        issue: 'missing',
      });
    }
  }

  // Check for empty strings in fa
  for (const key of faKeys) {
    const value = translations.fa[key];
    if (value === '') {
      issues.push({
        key,
        language: 'fa',
        issue: 'empty',
      });
    }
  }

  // Check for empty strings in ps
  for (const key of psKeys) {
    const value = translations.ps[key];
    if (value === '') {
      issues.push({
        key,
        language: 'ps',
        issue: 'empty',
      });
    }
  }

  // Check for placeholder values in fa
  for (const key of faKeys) {
    const value = translations.fa[key];
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(value)) {
        issues.push({
          key,
          language: 'fa',
          issue: 'placeholder',
          details: value,
        });
        break;
      }
    }
  }

  // Check for placeholder values in ps
  for (const key of psKeys) {
    const value = translations.ps[key];
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(value)) {
        issues.push({
          key,
          language: 'ps',
          issue: 'placeholder',
          details: value,
        });
        break;
      }
    }
  }

  // Check for untranslated strings (same as English) in fa
  // Only flag if the English text is in Latin script and fa value is identical
  for (const key of enKeys) {
    if (faKeys.includes(key) && !EXCLUDED_UNTRANSLATED_KEYS.includes(key)) {
      const enValue = translations.en[key];
      const faValue = translations.fa[key];
      // Simple heuristic: if values are identical and contain Latin characters
      if (enValue === faValue && /[a-zA-Z]/.test(enValue)) {
        issues.push({
          key,
          language: 'fa',
          issue: 'untranslated',
          details: enValue,
        });
      }
    }
  }

  // Check for untranslated strings in ps
  for (const key of enKeys) {
    if (psKeys.includes(key) && !EXCLUDED_UNTRANSLATED_KEYS.includes(key)) {
      const enValue = translations.en[key];
      const psValue = translations.ps[key];
      if (enValue === psValue && /[a-zA-Z]/.test(enValue)) {
        issues.push({
          key,
          language: 'ps',
          issue: 'untranslated',
          details: enValue,
        });
      }
    }
  }

  return issues;
}

function groupIssuesByType(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
  const grouped: Record<string, ValidationIssue[]> = {
    missing: [],
    empty: [],
    placeholder: [],
    untranslated: [],
  };

  for (const issue of issues) {
    grouped[issue.issue].push(issue);
  }

  return grouped;
}

function printReport(issues: ValidationIssue[]): void {
  if (issues.length === 0) {
    console.log('✅ All translations are complete! No issues found.\n');
    return;
  }

  console.log(`❌ Found ${issues.length} translation issue(s):\n`);

  const grouped = groupIssuesByType(issues);

  // Report missing keys
  if (grouped.missing.length > 0) {
    console.log(`\n📋 Missing Keys (${grouped.missing.length}):`);
    console.log('=' .repeat(60));
    
    const missingByLang = {
      fa: grouped.missing.filter(i => i.language === 'fa'),
      ps: grouped.missing.filter(i => i.language === 'ps'),
    };

    if (missingByLang.fa.length > 0) {
      console.log(`\n  Persian (fa) - ${missingByLang.fa.length} missing key(s):`);
      missingByLang.fa.forEach(issue => {
        console.log(`    • ${issue.key}`);
      });
    }

    if (missingByLang.ps.length > 0) {
      console.log(`\n  Pashto (ps) - ${missingByLang.ps.length} missing key(s):`);
      missingByLang.ps.forEach(issue => {
        console.log(`    • ${issue.key}`);
      });
    }
  }

  // Report empty strings
  if (grouped.empty.length > 0) {
    console.log(`\n\n⚠️  Empty Values (${grouped.empty.length}):`);
    console.log('=' .repeat(60));
    
    const emptyByLang = {
      fa: grouped.empty.filter(i => i.language === 'fa'),
      ps: grouped.empty.filter(i => i.language === 'ps'),
    };

    if (emptyByLang.fa.length > 0) {
      console.log(`\n  Persian (fa) - ${emptyByLang.fa.length} empty value(s):`);
      emptyByLang.fa.forEach(issue => {
        console.log(`    • ${issue.key}`);
      });
    }

    if (emptyByLang.ps.length > 0) {
      console.log(`\n  Pashto (ps) - ${emptyByLang.ps.length} empty value(s):`);
      emptyByLang.ps.forEach(issue => {
        console.log(`    • ${issue.key}`);
      });
    }
  }

  // Report placeholder values
  if (grouped.placeholder.length > 0) {
    console.log(`\n\n🚧 Placeholder Values (${grouped.placeholder.length}):`);
    console.log('=' .repeat(60));
    
    const placeholderByLang = {
      fa: grouped.placeholder.filter(i => i.language === 'fa'),
      ps: grouped.placeholder.filter(i => i.language === 'ps'),
    };

    if (placeholderByLang.fa.length > 0) {
      console.log(`\n  Persian (fa) - ${placeholderByLang.fa.length} placeholder(s):`);
      placeholderByLang.fa.forEach(issue => {
        console.log(`    • ${issue.key}: "${issue.details}"`);
      });
    }

    if (placeholderByLang.ps.length > 0) {
      console.log(`\n  Pashto (ps) - ${placeholderByLang.ps.length} placeholder(s):`);
      placeholderByLang.ps.forEach(issue => {
        console.log(`    • ${issue.key}: "${issue.details}"`);
      });
    }
  }

  // Report untranslated strings
  if (grouped.untranslated.length > 0) {
    console.log(`\n\n🔤 Potentially Untranslated (${grouped.untranslated.length}):`);
    console.log('=' .repeat(60));
    console.log('(Keys where the value is identical to English)');
    
    const untranslatedByLang = {
      fa: grouped.untranslated.filter(i => i.language === 'fa'),
      ps: grouped.untranslated.filter(i => i.language === 'ps'),
    };

    if (untranslatedByLang.fa.length > 0) {
      console.log(`\n  Persian (fa) - ${untranslatedByLang.fa.length} untranslated:`);
      untranslatedByLang.fa.forEach(issue => {
        console.log(`    • ${issue.key}: "${issue.details}"`);
      });
    }

    if (untranslatedByLang.ps.length > 0) {
      console.log(`\n  Pashto (ps) - ${untranslatedByLang.ps.length} untranslated:`);
      untranslatedByLang.ps.forEach(issue => {
        console.log(`    • ${issue.key}: "${issue.details}"`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n💡 Summary: ${issues.length} issue(s) found`);
  console.log(`   • Missing keys: ${grouped.missing.length}`);
  console.log(`   • Empty values: ${grouped.empty.length}`);
  console.log(`   • Placeholders: ${grouped.placeholder.length}`);
  console.log(`   • Untranslated: ${grouped.untranslated.length}`);
  console.log('');
}

// Main execution
try {
  const issues = validateTranslations();
  printReport(issues);

  // Exit with error code if issues found (for CI/CD integration)
  if (issues.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Error running validation:', error);
  process.exit(1);
}
