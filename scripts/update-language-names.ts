import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating language names...');
  console.log('   Dari → Persian');
  console.log('   دری → فارسی\n');

  // Update Persian/Dari language
  const persian = await prisma.language.updateMany({
    where: { code: 'fa' },
    data: {
      name: 'Persian',
      nativeName: 'فارسی',
    },
  });

  console.log('✅ Language names updated successfully!');
  console.log(`   Updated ${persian.count} language record(s)`);
  console.log('\n📝 Changes:');
  console.log('   English name: Dari → Persian');
  console.log('   Native name: دری → فارسی');
  
  // Fetch and display all languages
  const languages = await prisma.language.findMany({
    orderBy: { order: 'asc' },
  });
  
  console.log('\n📋 All languages in database:');
  languages.forEach(lang => {
    console.log(`   ${lang.code}: ${lang.name} (${lang.nativeName}) ${lang.isDefault ? '⭐ Default' : ''}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error updating languages:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
