#!/usr/bin/env node
/**
 * R22 — expand ImportSource coverage (idempotent upserts by name).
 * Adds 5 new sources (3 WP aggregators + 2 news feeds), re-enables ACBAR &
 * o4af (fixed URL), bumps maxPages for max volume.
 */
import { Client } from 'pg';

const LOCAL = 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';
const c = new Client({ connectionString: process.env.R22_DB_URL || LOCAL });
await c.connect();

const NEW_SOURCES = [
  {
    name: 'AfterSchoolAfrica', type: 'scholarship', scraperKey: 'wpApi',
    baseUrl: 'https://www.afterschoolafrica.com', enabled: true, autoPublish: false,
    config: {
      apiBase: 'https://www.afterschoolafrica.com/wp-json/wp/v2/posts',
      perPage: 20, maxPages: 4, defaultDeadlineDays: 45, autoDetectType: true,
      crawlDelayMs: 1200, timeoutMs: 25000,
      categoryInclude: ['Scholarship', 'Fellowship', 'Internship', 'Job', 'Grant', 'Competition', 'Award', 'Training', 'Volunteer', 'Mastercard', 'Undergraduate', 'Masters', 'PhD'],
    },
    note: 'WP REST via curl fallback (native fetch 403). Broad opportunity aggregator.',
  },
  {
    name: 'Opportunities For Youth', type: 'scholarship', scraperKey: 'wpApi',
    baseUrl: 'https://opportunitiesforyouth.org', enabled: true, autoPublish: false,
    config: {
      apiBase: 'https://opportunitiesforyouth.org/wp-json/wp/v2/posts',
      perPage: 20, maxPages: 4, defaultDeadlineDays: 60, autoDetectType: true,
      crawlDelayMs: 800, timeoutMs: 20000,
    },
    note: 'WP REST native — whole site is youth opportunities.',
  },
  {
    name: 'Scholarships Corner', type: 'scholarship', scraperKey: 'wpApi',
    baseUrl: 'https://scholarshipscorner.website', enabled: true, autoPublish: false,
    config: {
      apiBase: 'https://scholarshipscorner.website/wp-json/wp/v2/posts',
      perPage: 20, maxPages: 4, defaultDeadlineDays: 60, autoDetectType: true,
      crawlDelayMs: 800, timeoutMs: 20000,
    },
    note: 'WP REST native — fully-funded scholarships aggregator.',
  },
  {
    name: 'Amu TV News', type: 'news', scraperKey: 'rssNews',
    baseUrl: 'https://amu.tv', enabled: true, autoPublish: true,
    config: { rssUrl: 'https://amu.tv/feed/', maxItems: 30, categoryName: 'Afghanistan News' },
    note: 'Afghan news outlet EN — RSS verified 2026-09-11.',
  },
  {
    name: 'Etilaat Roz News', type: 'news', scraperKey: 'rssNews',
    baseUrl: 'https://etilaatroz.com', enabled: true, autoPublish: true,
    config: { rssUrl: 'https://etilaatroz.com/feed/', maxItems: 30, categoryName: 'Afghanistan News' },
    note: 'Farsi-language Afghan news — base title stored in Farsi; en fill via translation loop.',
  },
];

const UPDATES = [
  // OD: bump pages for volume (curl fallback handles the 403s)
  { name: 'Opportunity Desk', config: { apiBase: 'https://opportunitydesk.org/wp-json/wp/v2/posts', perPage: 20, maxPages: 5, defaultDeadlineDays: 45, autoDetectType: true, crawlDelayMs: 1200, timeoutMs: 25000, categoryInclude: ['Scholarships', 'Fellowships', 'Grants', 'Competitions', 'Awards', 'Trainings', 'Internships', 'Jobs', 'Volunteering'] } },
  // o4af: re-enable (Cloudflare currently passes curl); keep slow crawl
  { name: 'Opportunities for Afghans (o4af)', enabled: true },
  // ACBAR: re-enable — scraper fails gracefully if the CF challenge returns
  { name: 'ACBAR', enabled: true },
];

async function idFor(name) {
  const r = await c.query(`SELECT id FROM "ImportSource" WHERE name = $1`, [name]);
  return r.rows[0]?.id || null;
}

let added = 0, updated = 0;
for (const s of NEW_SOURCES) {
  const existing = await idFor(s.name);
  if (existing) {
    await c.query(
      `UPDATE "ImportSource" SET type=$2, "scraperKey"=$3, "baseUrl"=$4, enabled=$5, "autoPublish"=$6, config=$7, "updatedAt"=NOW() WHERE id=$1`,
      [existing, s.type, s.scraperKey, s.baseUrl, s.enabled, s.autoPublish, JSON.stringify(s.config)],
    );
    updated++;
    console.log(`↻ updated  ${s.name}`);
  } else {
    const id = 'src_r22_' + s.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12);
    await c.query(
      `INSERT INTO "ImportSource" (id, name, type, "scraperKey", "baseUrl", enabled, "autoPublish", config, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())`,
      [id, s.name, s.type, s.scraperKey, s.baseUrl, s.enabled, s.autoPublish, JSON.stringify(s.config)],
    );
    added++;
    console.log(`+ added    ${s.name} (${s.note})`);
  }
}

for (const u of UPDATES) {
  const id = await idFor(u.name);
  if (!id) { console.log(`? missing  ${u.name}`); continue; }
  if (u.config) {
    await c.query(`UPDATE "ImportSource" SET config=$2, "updatedAt"=NOW() WHERE id=$1`, [id, JSON.stringify(u.config)]);
  }
  if (typeof u.enabled === 'boolean') {
    await c.query(`UPDATE "ImportSource" SET enabled=$2, "updatedAt"=NOW() WHERE id=$1`, [id, u.enabled]);
  }
  updated++;
  console.log(`↻ updated  ${u.name} (enabled=${u.enabled ?? 'unchanged'})`);
}

const n = await c.query(`SELECT count(*)::int AS n, count(*) FILTER (WHERE enabled)::int AS en FROM "ImportSource"`);
console.log(`\nDONE. +${added} new, ${updated} updated. ImportSource total=${n.rows[0].n}, enabled=${n.rows[0].en}`);
await c.end();
