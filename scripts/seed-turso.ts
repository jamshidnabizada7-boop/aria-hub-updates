/**
 * Seed Turso Database with Initial Data
 * This script creates tables and populates with admin user and sample data
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🚀 Seeding Turso database...\n');

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

  const adapter = new PrismaLibSql(libsql);
  const db = new PrismaClient({ adapter });

  try {
    // 1. Push schema to Turso
    console.log('📦 Schema will be created automatically by Prisma...\n');

    // 2. Create admin user
    console.log('👤 Creating admin user...');
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!initialPassword || initialPassword.length < 8) {
      console.error('✗ Set INITIAL_ADMIN_PASSWORD (min 8 chars) before seeding.');
      process.exit(1);
    }
    const hashedPassword = await bcrypt.hash(initialPassword, 10);
    
    await db.admin.upsert({
      where: { email: 'admin@ariahub.com' },
      create: {
        email: 'admin@ariahub.com',
        password: hashedPassword,
        fullName: 'ARIA HUB Administrator',
      },
      update: {
        password: hashedPassword,
        fullName: 'ARIA HUB Administrator',
      },
    });
    console.log('✅ Admin user created: admin@ariahub.com / (INITIAL_ADMIN_PASSWORD)\n');

    // 3. Create default site settings
    console.log('⚙️  Creating site settings...');
    await db.siteSetting.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        siteName: 'ARIA HUB',
        tagline: 'Professional Business Services Platform',
        description: 'Premium business, visa and opportunity services.',
      },
      update: {},
    });
    console.log('✅ Site settings created\n');

    // 4. Create opportunity categories
    console.log('📁 Creating opportunity categories...');
    const categories = [
      { slug: 'it-technology', name: 'IT & Technology', nameI18n: { en: 'IT & Technology', fa: 'فناوری اطلاعات', ps: 'معلوماتي ټکنالوژي' } },
      { slug: 'healthcare', name: 'Healthcare', nameI18n: { en: 'Healthcare', fa: 'مراقبت‌های بهداشتی', ps: 'روغتیا پاملرنه' } },
      { slug: 'education', name: 'Education', nameI18n: { en: 'Education', fa: 'آموزش', ps: 'زده کړه' } },
      { slug: 'engineering', name: 'Engineering', nameI18n: { en: 'Engineering', fa: 'مهندسی', ps: 'انجینرۍ' } },
      { slug: 'business', name: 'Business & Management', nameI18n: { en: 'Business & Management', fa: 'کسب و کار و مدیریت', ps: 'سوداګرۍ او مدیریت' } },
      { slug: 'arts', name: 'Arts & Humanities', nameI18n: { en: 'Arts & Humanities', fa: 'هنر و علوم انسانی', ps: 'هنرونه او بشري علوم' } },
      { slug: 'science', name: 'Science', nameI18n: { en: 'Science', fa: 'علوم', ps: 'ساینس' } },
      { slug: 'social-sciences', name: 'Social Sciences', nameI18n: { en: 'Social Sciences', fa: 'علوم اجتماعی', ps: 'ټولنیز علوم' } },
      { slug: 'law', name: 'Law', nameI18n: { en: 'Law', fa: 'حقوق', ps: 'قانون' } },
      { slug: 'finance', name: 'Finance', nameI18n: { en: 'Finance', fa: 'مالی', ps: 'مالیه' } },
      { slug: 'other', name: 'Other', nameI18n: { en: 'Other', fa: 'سایر', ps: 'نور' } },
    ];

    for (const cat of categories) {
      await db.opportunityCategory.upsert({
        where: { slug: cat.slug },
        create: cat,
        update: cat,
      });
    }
    console.log(`✅ ${categories.length} categories created\n`);

    // 5. Create import sources
    console.log('🔗 Creating import sources...');
    await db.importSource.upsert({
      where: { scraperKey: 'wazifaha' },
      create: {
        name: 'Wazifaha Jobs',
        type: 'job',
        scraperKey: 'wazifaha',
        baseUrl: 'https://wazifaha.org',
        enabled: true,
        autoPublish: true,
        scheduleMinutes: 360,
      },
      update: {},
    });

    await db.importSource.upsert({
      where: { scraperKey: 'scholarshipsAf' },
      create: {
        name: 'Scholarships.af',
        type: 'scholarship',
        scraperKey: 'scholarshipsAf',
        baseUrl: 'https://scholarships.af',
        enabled: true,
        autoPublish: true,
        scheduleMinutes: 360,
      },
      update: {},
    });
    console.log('✅ 2 import sources created\n');

    console.log('🎉 Seeding completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   ✅ Admin user: admin@ariahub.com / (INITIAL_ADMIN_PASSWORD)');
    console.log('   ✅ Site settings configured');
    console.log('   ✅ 11 opportunity categories');
    console.log('   ✅ 2 import sources');
    console.log('\n🎯 Next steps:');
    console.log('   1. Login to admin panel: https://www.myariahub.com/admin');
    console.log('   2. Go to Auto Import tab');
    console.log('   3. Click "Run All Imports" to populate opportunities\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
