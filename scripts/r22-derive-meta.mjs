#!/usr/bin/env node
/**
 * R22 derive pass — fill `country` and (conservatively) `organization` for
 * scraped Opportunity rows using deterministic title patterns (no AI).
 * Idempotent: only touches rows where the field is NULL.
 */
import pg from 'pg';
const { Client } = pg;

const c = new Client({ connectionString: process.env.R22_DB_URL || 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
await c.connect();

// Canonical host-country names (matched as whole words, title case aware)
const COUNTRIES = [
  'Afghanistan', 'Australia', 'Austria', 'Azerbaijan', 'Bangladesh', 'Belgium', 'Brazil', 'Brunei',
  'Canada', 'China', 'Czech Republic', 'Denmark', 'Egypt', 'Estonia', 'Finland', 'France',
  'Germany', 'Ghana', 'Hungary', 'India', 'Indonesia', 'Ireland', 'Italy', 'Japan',
  'Kazakhstan', 'Kenya', 'Kuwait', 'Malaysia', 'Mexico', 'Morocco', 'Nepal', 'Netherlands',
  'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Poland', 'Portugal', 'Qatar', 'Romania',
  'Russia', 'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka',
  'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Türkiye', 'UAE', 'United Arab Emirates',
  'United Kingdom', 'United States', 'USA', 'Uzbekistan', 'Vietnam',
];

const rows = (await c.query(`
  SELECT id, title, country, organization FROM "Opportunity"
  WHERE "sourceName" IS NOT NULL AND (country IS NULL OR organization IS NULL)
`)).rows;

let setCountry = 0, setOrg = 0;
for (const r of rows) {
  const title = r.title || '';

  if (!r.country) {
    const hit = COUNTRIES.find((cc) => new RegExp(`\\b${cc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(title));
    if (hit) {
      const canonical = hit === 'USA' ? 'United States' : hit === 'UK' ? 'United Kingdom' : hit === 'UAE' ? 'United Arab Emirates' : hit === 'Türkiye' ? 'Turkey' : hit;
      await c.query(`UPDATE "Opportunity" SET country=$2, "updatedAt"=NOW() WHERE id=$1`, [r.id, canonical]);
      setCountry++;
    }
  }

  if (!r.organization) {
    // "University of X" / "X University" / "Government of Y"
    const m = title.match(/\b(University of [A-Z][\w'&.-]*(?: [A-Z][\w'&.-]*){0,3})\b/) ||
      title.match(/\b([A-Z][\w'&.-]*(?: [A-Z][\w'&.-]*){0,2}) University\b/) ||
      title.match(/\b(Government of [A-Z][\w'&.-]*(?: [A-Z][\w'&.-]*){0,2})\b/);
    if (m) {
      await c.query(`UPDATE "Opportunity" SET organization=$2, "updatedAt"=NOW() WHERE id=$1`, [r.id, m[1]]);
      setOrg++;
    }
  }
}

const left = (await c.query(`
  SELECT count(*) FILTER (WHERE country IS NULL)::int no_country,
         count(*) FILTER (WHERE organization IS NULL)::int no_org
  FROM "Opportunity" WHERE "sourceName" IS NOT NULL`)).rows[0];
console.log(`[derive] country set on ${setCountry} rows, organization set on ${setOrg} rows`);
console.log(`[derive] remaining: no_country=${left.no_country}, no_org=${left.no_org}`);
await c.end();
