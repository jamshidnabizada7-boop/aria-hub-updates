const { neon } = require('@neondatabase/serverless');
const dotenv = require('fs');

const envFile = dotenv.readFileSync('.env', 'utf-8');
const envVars = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

const DATABASE_URL = envVars['DATABASE_URL'] || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function run() {
  const languages = await sql`SELECT code, translations FROM "Language" WHERE code = 'fa'`;
  for (const lang of languages) {
    if (lang.translations) {
      const tr = typeof lang.translations === 'string' ? JSON.parse(lang.translations) : lang.translations;
      if (tr['hero.subtitle']) {
         console.log('Current DB hero.subtitle for fa is:', tr['hero.subtitle']);
         tr['hero.subtitle'] = 'فرصت‌های شغلی، بورسیه‌ها و خدمات حرفه‌ای؛ همه در یک پلتفرم با اطلاعات به‌روز، قابل اعتماد و دسترسی آسان.';
         await sql`UPDATE "Language" SET translations = ${JSON.stringify(tr)}::jsonb WHERE code = 'fa'`;
         console.log('Updated DB to the new text!');
      } else {
         console.log('No hero.subtitle in DB translations object for fa.');
      }
    } else {
      console.log('No translations object for fa in DB.');
    }
  }
}

run().catch(console.error);
