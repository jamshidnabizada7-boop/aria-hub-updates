import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding tools menu items...');

  // Create the parent "Tools" menu
  const toolsMenu = await prisma.menuItem.create({
    data: {
      label: 'Tools',
      labelI18n: {
        en: 'Tools',
        fa: 'ابزارها',
        ps: 'وسیلې'
      },
      url: '#', // Parent menu usually has no URL, but we can put '#'
      order: 99,
      visible: true,
      openInNewTab: false,
    }
  });

  console.log(`Created parent menu: Tools (ID: ${toolsMenu.id})`);

  // Create CV Builder child
  await prisma.menuItem.create({
    data: {
      label: 'CV Builder',
      labelI18n: {
        en: 'CV Builder',
        fa: 'رزومه ساز',
        ps: 'سی وي جوړونکی'
      },
      url: '/cv-builder',
      parentId: toolsMenu.id,
      order: 1,
      visible: true,
      openInNewTab: false,
    }
  });
  console.log(`Created child menu: CV Builder`);

  // Create Opportunity Matcher child
  await prisma.menuItem.create({
    data: {
      label: 'Opportunity Matcher',
      labelI18n: {
        en: 'Opportunity Matcher',
        fa: 'فرصت یاب',
        ps: 'د فرصت موندونکی'
      },
      url: '/opportunity-matcher',
      parentId: toolsMenu.id,
      order: 2,
      visible: true,
      openInNewTab: false,
    }
  });
  console.log(`Created child menu: Opportunity Matcher`);

  console.log('Tools menu seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
