import { db } from '../src/lib/db';

async function main() {
  try {
    const result = await db.siteSetting.update({
      where: { id: 'singleton' },
      data: {
        logoUrl: '/images/logo-mark.webp',
        logoDarkUrl: '/images/logo-mark.webp',
        faviconUrl: '/images/logo-mark.webp',
      },
    });
    
    console.log('✅ Logo URLs updated successfully!');
    console.log('   - Logo URL:', result.logoUrl);
    console.log('   - Dark Logo URL:', result.logoDarkUrl);
    console.log('   - Favicon URL:', result.faviconUrl);
    console.log('\n🎨 You can also edit the logo from the Admin panel:');
    console.log('   1. Go to http://localhost:3000/admin');
    console.log('   2. Navigate to Settings');
    console.log('   3. Update Logo URL field');
  } catch (error) {
    console.error('❌ Error updating logo:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
