import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  // No hardcoded bootstrap credentials: the initial admin email/password
  // must come from the environment so the repo never reveals them.
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    console.error('✗ Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (min 8 chars) before seeding.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);

  await db.adminUser.upsert({
    where: { email },
    update: {}, // Don't overwrite the password if the user already exists
    create: {
      email,
      name: 'Super Admin',
      password: hash,
      role: 'super_admin',
    },
  });

  console.log('✅ Admin user created:');
  console.log('   Email:    admin@ariahub.com');
  console.log('   Password: (the INITIAL_ADMIN_PASSWORD you provided)');
  console.log('   Login at: /admin');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
