import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=\r]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
}

const DATABASE_URL = envVars['DATABASE_URL'] || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function run() {
  const rows = await sql`SELECT label, "labelI18n" FROM "MenuItem"`;
  console.log(JSON.stringify(rows, null, 2));
}

run().catch(console.error);
