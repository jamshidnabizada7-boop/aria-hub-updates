import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating ARIA logo...');

  const result = await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      siteName: 'ARIA',
      tagline: 'Professional Business Services Platform',
      description: 'Premium business, visa, and global opportunity services — your gateway to the world.',
      logoUrl: '/images/aria-logo.png',
      logoDarkUrl: '/images/aria-logo.png',
      faviconUrl: '/images/aria-logo.png',
      appleIconUrl: '/images/aria-logo.png',
      primaryColor: '#2E4A6F',
      secondaryColor: '#F4D9A6',
      accentColor: '#F4D9A6',
      fontFamily: 'Inter',
      currency: 'AFN',
      timezone: 'Asia/Kabul',
      dateFormat: 'YYYY-MM-DD',
      maintenanceMode: false,
      socialPosition: 'right',
      socialHideOnScroll: false,
    },
    update: {
      logoUrl: '/images/aria-logo.png',
      logoDarkUrl: '/images/aria-logo.png',
      faviconUrl: '/images/aria-logo.png',
      appleIconUrl: '/images/aria-logo.png',
    },
  });

  console.log('✅ ARIA logo updated successfully!');
  console.log('   - Logo URL:', result.logoUrl);
  console.log('   - Dark Logo URL:', result.logoDarkUrl);
  console.log('   - Favicon URL:', result.faviconUrl);
  console.log('   - Apple Icon URL:', result.appleIconUrl);
  console.log('\n📝 You can now edit these URLs from the Admin Panel → Settings');
}

main()
  .catch((e) => {
    console.error('❌ Error updating logo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
