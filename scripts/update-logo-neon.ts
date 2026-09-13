/**
 * update-logo-neon.ts
 * Updates the site logo URL in the database via Neon HTTP (port 443, no TCP needed)
 */
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

// Load .env manually
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^[\"']|[\"']$/g, '');
  }
}

const DATABASE_URL = envVars['DATABASE_URL'] || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  console.log('🌐 Connected via Neon serverless HTTP...');

  const logoUrl = '/images/logo-mark.webp';

  await sql`
    UPDATE "SiteSetting"
    SET
      "logoUrl"    = ${logoUrl},
      "logoDarkUrl"= ${logoUrl},
      "faviconUrl" = ${logoUrl},
      "updatedAt"  = now()
    WHERE id = 'singleton'
  `;

  console.log('✅ Logo updated in DB to:', logoUrl);
}

run().catch(e => {
  console.error('❌ Failed:', e?.message || e);
  process.exit(1);
});
