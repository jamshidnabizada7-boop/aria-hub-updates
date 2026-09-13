import { createClient } from '@libsql/client';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

console.log('Testing Turso connection...');
console.log('URL:', tursoUrl);

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

async function test() {
  try {
    // Create tables
    console.log('\n📦 Creating schema...');
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS Admin (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fullName TEXT NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        lastLogin INTEGER
      )
    `);
    
    console.log('✅ Schema created successfully!');
    console.log('🎉 Turso connection working!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
