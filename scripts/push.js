require('dotenv').config({ path: '.env' });
const { execSync } = require('child_process');

try {
  console.log('Pushing schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('Generating client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Success!');
} catch (error) {
  console.error('Failed', error);
  process.exit(1);
}
