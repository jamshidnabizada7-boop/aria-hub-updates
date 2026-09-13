import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Creating default menu items...\n');

  // Check if menu items already exist
  const existingItems = await prisma.menuItem.findMany();
  
  if (existingItems.length > 0) {
    console.log(`⚠️  Found ${existingItems.length} existing menu items.`);
    console.log('   Deleting old menu items to create fresh ones...\n');
    await prisma.menuItem.deleteMany();
  }

  // Create default menu items with multilingual labels
  const menuItems = [
    {
      label: 'Home',
      labelI18n: {
        en: 'Home',
        fa: 'خانه',
        ps: 'کور'
      },
      url: '#home',
      order: 1,
      visible: true,
      openInNewTab: false
    },
    {
      label: 'Services',
      labelI18n: {
        en: 'Services',
        fa: 'خدمات',
        ps: 'خدمات'
      },
      url: '#services',
      order: 2,
      visible: true,
      openInNewTab: false
    },
    {
      label: 'Visas',
      labelI18n: {
        en: 'Visas',
        fa: 'ویزاها',
        ps: 'ویزې'
      },
      url: '#visas',
      order: 3,
      visible: true,
      openInNewTab: false
    },
    {
      label: 'Opportunities',
      labelI18n: {
        en: 'Opportunities',
        fa: 'فرصت‌ها',
        ps: 'فرصتونه'
      },
      url: '#opportunities',
      order: 4,
      visible: true,
      openInNewTab: false
    },
    {
      label: 'About',
      labelI18n: {
        en: 'About',
        fa: 'درباره ما',
        ps: 'زموږ په اړه'
      },
      url: '#why',
      order: 5,
      visible: true,
      openInNewTab: false
    },
    {
      label: 'Contact',
      labelI18n: {
        en: 'Contact',
        fa: 'تماس',
        ps: 'اړیکه'
      },
      url: '#contact',
      order: 6,
      visible: true,
      openInNewTab: false
    }
  ];

  console.log('✨ Creating menu items...\n');
  
  for (const item of menuItems) {
    const created = await prisma.menuItem.create({
      data: item
    });
    console.log(`   ✓ ${item.label} (${item.labelI18n.fa} / ${item.labelI18n.ps})`);
  }

  console.log('\n✅ Default menu items created successfully!');
  console.log(`   Total: ${menuItems.length} menu items\n`);

  // Display all menu items
  const allItems = await prisma.menuItem.findMany({
    orderBy: { order: 'asc' }
  });

  console.log('📋 Menu Items in Database:');
  allItems.forEach(item => {
    const i18n = item.labelI18n as any;
    console.log(`   ${item.order}. ${item.label} → ${item.url}`);
    console.log(`      EN: ${i18n?.en || item.label}`);
    console.log(`      FA: ${i18n?.fa || 'N/A'}`);
    console.log(`      PS: ${i18n?.ps || 'N/A'}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error creating menu items:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
