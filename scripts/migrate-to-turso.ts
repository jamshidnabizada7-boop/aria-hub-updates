/**
 * Migrate local SQLite database to Turso
 * This script copies all data from local db/custom.db to Turso cloud database
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL as LibSQLAdapter } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

async function migrate() {
  console.log('🚀 Starting migration to Turso...\n');

  // Local SQLite client
  const localDb = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./db/custom.db'
      }
    }
  });

  // Turso client
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
    process.exit(1);
  }

  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  const adapter = new LibSQLAdapter(libsql);
  const tursoDb = new PrismaClient({ adapter });

  try {
    // Get counts from local DB
    const [
      opportunitiesCount,
      categoriesCount,
      importSourcesCount,
      adminsCount
    ] = await Promise.all([
      localDb.opportunity.count(),
      localDb.opportunityCategory.count(),
      localDb.importSource.count(),
      localDb.admin.count()
    ]);

    console.log('📊 Local Database Stats:');
    console.log(`   - Opportunities: ${opportunitiesCount}`);
    console.log(`   - Categories: ${categoriesCount}`);
    console.log(`   - Import Sources: ${importSourcesCount}`);
    console.log(`   - Admins: ${adminsCount}\n`);

    // Migrate data (order matters due to relationships)
    console.log('📦 Migrating data...\n');

    // 1. Site Settings
    const siteSettings = await localDb.siteSetting.findFirst();
    if (siteSettings) {
      await tursoDb.siteSetting.upsert({
        where: { id: siteSettings.id },
        create: siteSettings,
        update: siteSettings
      });
      console.log('✅ Site settings migrated');
    }

    // 2. Admins
    const admins = await localDb.admin.findMany();
    for (const admin of admins) {
      await tursoDb.admin.upsert({
        where: { id: admin.id },
        create: admin,
        update: admin
      });
    }
    console.log(`✅ ${admins.length} admins migrated`);

    // 3. Opportunity Categories
    const categories = await localDb.opportunityCategory.findMany();
    for (const category of categories) {
      await tursoDb.opportunityCategory.upsert({
        where: { id: category.id },
        create: category,
        update: category
      });
    }
    console.log(`✅ ${categories.length} categories migrated`);

    // 4. Import Sources
    const sources = await localDb.importSource.findMany();
    for (const source of sources) {
      await tursoDb.importSource.upsert({
        where: { id: source.id },
        create: source,
        update: source
      });
    }
    console.log(`✅ ${sources.length} import sources migrated`);

    // 5. Opportunities
    const opportunities = await localDb.opportunity.findMany();
    for (const opp of opportunities) {
      await tursoDb.opportunity.upsert({
        where: { id: opp.id },
        create: opp,
        update: opp
      });
    }
    console.log(`✅ ${opportunities.length} opportunities migrated`);

    // 6. Import Runs
    const runs = await localDb.importRun.findMany();
    for (const run of runs) {
      await tursoDb.importRun.upsert({
        where: { id: run.id },
        create: run,
        update: run
      });
    }
    console.log(`✅ ${runs.length} import runs migrated`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ All data has been copied to Turso\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await localDb.$disconnect();
    await tursoDb.$disconnect();
  }
}

migrate()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
