/**
 * Data Migration Script: Migrate existing single-language content to multilingual i18n fields
 * 
 * This script populates the new *I18n fields with existing content, assuming it's in English.
 * It can be run multiple times safely (idempotent).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ModelConfig {
  name: string;
  fields: string[];
}

const models: ModelConfig[] = [
  { name: 'service', fields: ['title', 'excerpt', 'description'] },
  { 
    name: 'visa', 
    fields: ['country', 'visaType', 'eligibility', 'applicationProcess', 'description', 'requirements', 'documents'] 
  },
  { name: 'opportunity', fields: ['title', 'description', 'eligibility', 'benefits'] },
  { name: 'news', fields: ['title', 'excerpt', 'content'] },
  { name: 'testimonial', fields: ['name', 'role', 'company', 'content'] },
  { name: 'faq', fields: ['question', 'answer'] },
  { name: 'processStep', fields: ['title', 'description'] },
  { name: 'pricingPackage', fields: ['name', 'description', 'features'] },
  { name: 'teamMember', fields: ['name', 'role', 'bio'] },
  { name: 'ctaBanner', fields: ['title', 'subtitle', 'buttonText'] }
];

async function migrateToMultilingual() {
  console.log('🚀 Starting multilingual migration...\n');
  
  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const { name, fields } of models) {
    console.log(`📦 Migrating ${name}...`);
    
    try {
      // Get all items from the model
      const items = await (prisma as any)[name].findMany();
      
      let migrated = 0;
      let skipped = 0;

      for (const item of items) {
        const updates: any = {};
        let hasUpdates = false;

        for (const field of fields) {
          const i18nField = `${field}I18n`;
          
          // Only migrate if:
          // 1. The base field has content
          // 2. The i18n field doesn't already have content (idempotent)
          if (item[field] && (!item[i18nField] || Object.keys(item[i18nField] || {}).length === 0)) {
            // Check if it's a JSON field that needs special handling
            if (field === 'requirements' || field === 'documents' || field === 'features') {
              // For JSON array fields, wrap the entire array in i18n structure
              try {
                const parsed = typeof item[field] === 'string' ? JSON.parse(item[field]) : item[field];
                updates[i18nField] = { en: parsed };
              } catch (e) {
                // If parsing fails, treat as regular string
                updates[i18nField] = { en: item[field] };
              }
            } else {
              // Regular text fields
              updates[i18nField] = { en: item[field] };
            }
            hasUpdates = true;
          }
        }

        if (hasUpdates) {
          await (prisma as any)[name].update({
            where: { id: item.id },
            data: updates
          });
          migrated++;
        } else {
          skipped++;
        }
      }

      totalMigrated += migrated;
      totalSkipped += skipped;

      console.log(`   ✓ Migrated ${migrated} ${name} records${skipped > 0 ? `, skipped ${skipped} (already migrated)` : ''}`);
    } catch (error) {
      console.error(`   ✗ Error migrating ${name}:`, error);
    }
  }

  console.log('\n✨ Migration complete!');
  console.log(`   Total migrated: ${totalMigrated} records`);
  console.log(`   Total skipped: ${totalSkipped} records (already had i18n data)`);
}

// Run the migration
migrateToMultilingual()
  .then(() => {
    console.log('\n🎉 All done!');
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
