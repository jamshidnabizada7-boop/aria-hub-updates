/**
 * seed-admin-neon-http.ts
 * Seeds the admin user into Neon via HTTP (port 443).
 */
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';

// Load .env
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=\r]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
}

const DATABASE_URL = envVars['DATABASE_URL'] || process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('❌ DATABASE_URL not found'); process.exit(1); }

const sql = neon(DATABASE_URL);

async function run() {
  // No hardcoded bootstrap credentials: the initial admin email/password
  // must come from the environment so the repo never reveals them.
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    console.error('✗ Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (min 8 chars) before seeding.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  const id = 'admin-' + Date.now();

  await sql`
    INSERT INTO "AdminUser" (id, email, password, name, role, "createdAt", "updatedAt")
    VALUES (${id}, ${email}, ${hash}, 'Super Admin', 'super_admin', now(), now())
    ON CONFLICT (email) DO NOTHING
  `;

  console.log('✅ Admin user created:');
  console.log('   Email:    admin@ariahub.com');
  console.log('   Password: (the INITIAL_ADMIN_PASSWORD you provided)');
  console.log('   Login at: /admin');
}

run().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
