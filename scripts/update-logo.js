// Simple script to update logo URL using Prisma
import { db } from '../src/lib/db.js';

async function main() {
  try {
    await db.siteSetting.update({
      where: { id: 'singleton' },
      data: {
        logoUrl: '/images/logo-mark.png',
        logoDarkUrl: '/images/logo-mark.png',
        faviconUrl: '/images/logo-mark.png',
      },
    });
    
    console.log('✅ Logo URLs updated successfully!');
    console.log('   - Logo URL: /images/logo-mark.png');
    console.log('   - Dark Logo URL: /images/logo-mark.png');
    console.log('   - Favicon URL: /images/logo-mark.png');
    console.log('\n🎨 You can also edit the logo from the Admin panel:');
    console.log('   1. Go to http://localhost:3000/admin');
    console.log('   2. Navigate to Settings');
    console.log('   3. Update Logo URL field');
  } catch (error) {
    console.error('Error updating logo:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
