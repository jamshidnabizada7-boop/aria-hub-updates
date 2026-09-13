#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  ARIA HUB — Seed the NEW import sources (R21-a)
//
//  Idempotent: INSERT … ON CONFLICT (name) DO NOTHING, so admin runtime
//  state (enabled/autoPublish toggles, lastRun*) is never overwritten on
//  re-run. Run again any time:
//    node scripts/seed-new-sources.mjs
//    (or: bun run scripts/seed-new-sources.mjs)
// ═══════════════════════════════════════════════════════════════════
import pg from 'pg';
import { readFileSync } from 'fs';

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    return process.env.DATABASE_URL;
  }
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m && m[1].trim().startsWith('postgres')) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* fallthrough */ }
  throw new Error('No PostgreSQL DATABASE_URL found (.env or env)');
}

/** The 7 new sources: 3× wpApi, 1× jobsaf, 1× reliefweb, 2× rssNews. */
const SOURCES = [
  {
    name: 'Opportunity Desk', type: 'scholarship', scraperKey: 'wpApi',
    baseUrl: 'https://opportunitydesk.org',
    config: {
      apiBase: 'https://opportunitydesk.org/wp-json/wp/v2/posts',
      perPage: 20, maxPages: 3, defaultDeadlineDays: 45,
      autoDetectType: true,
      categoryInclude: ['Scholarships', 'Fellowships', 'Grants', 'Competitions', 'Awards', 'Trainings', 'Conferences'],
    },
    autoPublish: false, enabled: true, defaultCategory: 'scholarships',
  },
  {
    name: 'Mladiinfo', type: 'scholarship', scraperKey: 'wpApi',
    baseUrl: 'https://mladiinfo.eu',
    config: {
      apiBase: 'https://mladiinfo.eu/wp-json/wp/v2/posts',
      perPage: 20, maxPages: 2, defaultDeadlineDays: 60,
      autoDetectType: true,
    },
    autoPublish: false, enabled: true, defaultCategory: null,
  },
  {
    name: 'Scholarship Roar', type: 'scholarship', scraperKey: 'wpApi',
    baseUrl: 'https://scholarshiproar.com',
    config: {
      apiBase: 'https://scholarshiproar.com/wp-json/wp/v2/posts',
      perPage: 20, maxPages: 2, defaultDeadlineDays: 60,
      autoDetectType: true,
    },
    autoPublish: false, enabled: true, defaultCategory: null,
  },
  {
    name: 'Jobs.af', type: 'job', scraperKey: 'jobsaf',
    baseUrl: 'https://www.jobs.af',
    config: { maxPages: 3, detailFetch: true },
    autoPublish: false, enabled: true, defaultCategory: null,
  },
  {
    name: 'ReliefWeb Jobs', type: 'job', scraperKey: 'reliefweb',
    baseUrl: 'https://reliefweb.int',
    // reliefwebAppname: request a FREE approved appname at
    // https://apidoc.reliefweb.int and put it here (or env RELIEFWEB_APPNAME).
    config: { reliefwebAppname: '', limit: 50, country: 'Afghanistan' },
    autoPublish: false, enabled: false, defaultCategory: null,
  },
  {
    name: 'Ariana News', type: 'news', scraperKey: 'rssNews',
    baseUrl: 'https://www.ariananews.af',
    config: { rssUrl: 'https://www.ariananews.af/rss/', maxItems: 30, categoryName: 'Afghanistan News' },
    autoPublish: true, enabled: true, defaultCategory: null,
  },
  {
    name: 'ToloNews', type: 'news', scraperKey: 'rssNews',
    baseUrl: 'https://tolonews.com',
    config: { rssUrl: 'https://tolonews.com/rss.xml', maxItems: 30, categoryName: 'Afghanistan News' },
    autoPublish: true, enabled: true, defaultCategory: null,
  },
];

async function main() {
  const url = resolveDatabaseUrl();
  const pool = new pg.Pool({ connectionString: url, max: 2 });

  let inserted = 0;
  let existing = 0;
  for (const s of SOURCES) {
    const res = await pool.query(
      `INSERT INTO "ImportSource"
         (id, name, type, "scraperKey", "baseUrl", enabled, "autoPublish",
          "scheduleMinutes", "defaultCategory", config, "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 60, $7, $8, NOW(), NOW())
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      [s.name, s.type, s.scraperKey, s.baseUrl, s.enabled, s.autoPublish, s.defaultCategory, JSON.stringify(s.config)],
    );
    if (res.rowCount > 0) {
      inserted++;
      console.log(`  ✓ inserted  ${s.name} (${s.scraperKey}, type=${s.type}, autoPublish=${s.autoPublish})`);
    } else {
      existing++;
      console.log(`  • already   ${s.name} (${s.scraperKey}) — left untouched`);
    }
  }
  console.log(`\nDone: ${inserted} inserted, ${existing} already existed, ${SOURCES.length} total.`);
  await pool.end();
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
