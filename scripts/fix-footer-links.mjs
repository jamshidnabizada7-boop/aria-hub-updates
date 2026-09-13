/**
 * One-shot repair for legacy dead `#anchor` links in FooterLink and MenuItem
 * rows (the original seed wrote label-derived anchors that don't resolve).
 *
 * Usage:  node scripts/fix-footer-links.mjs
 * (Uses DATABASE_URL from .env; idempotent — safe to re-run.)
 */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
    if (line) return line.slice('DATABASE_URL='.length).trim();
  } catch { /* fall through */ }
  throw new Error('DATABASE_URL not set and .env not found');
}

const FOOTER_ROUTES = {
  '#home': '/',
  '#aboutus': '/about',
  '#contact': '/contact',
  '#services': '/services',
  '#gallery': '/#gallery',
  '#jobs': '/opportunities?category=job',
  '#scholarships': '/opportunities?category=scholarship',
  '#internships': '/opportunities?category=internship',
  '#exchangeprograms': '/opportunities?category=exchange-program',
  '#conferences': '/opportunities?category=conference',
  '#businesssetup': '/services',
  '#consulting': '/services',
  '#legalservices': '/services',
  '#translation': '/services',
  '#visa&travel': '/visas',
};

// Label-based fallback for anchors derived differently across seed versions.
const LABEL_ROUTES = {
  'home': '/', 'about us': '/about', 'contact': '/contact', 'services': '/services',
  'gallery': '/#gallery', 'jobs': '/opportunities?category=job',
  'scholarships': '/opportunities?category=scholarship',
  'internships': '/opportunities?category=internship',
  'conferences': '/opportunities?category=conference',
  'exchange programs': '/opportunities?category=exchange-program',
  'business setup': '/services', 'legal services': '/services',
  'visa & travel': '/visas', 'translation': '/services', 'consulting': '/services',
};

const MENU_ROUTES = {
  '#home': '/', '#services': '/services', '#visas': '/visas',
  '#opportunities': '/opportunities', '#promote': '/advertise',
  '#gallery': '/#gallery', '#payments': '/#payments', '#contact': '/contact',
};

const client = new Client({ connectionString: databaseUrl() });
await client.connect();

let updated = 0;
for (const [anchor, route] of Object.entries(FOOTER_ROUTES)) {
  const r = await client.query('UPDATE "FooterLink" SET url = $1, "updatedAt" = now() WHERE url = $2', [route, anchor]);
  updated += r.rowCount;
}
// Any remaining #anchor footer rows: fall back to the row's own label.
const leftovers = await client.query('SELECT id, label, url FROM "FooterLink" WHERE url LIKE \'#%\'');
for (const row of leftovers.rows) {
  const route = LABEL_ROUTES[row.label.trim().toLowerCase()];
  if (route) {
    await client.query('UPDATE "FooterLink" SET url = $1, "updatedAt" = now() WHERE id = $2', [route, row.id]);
    updated++;
  }
}

let menuUpdated = 0;
for (const [anchor, route] of Object.entries(MENU_ROUTES)) {
  const r = await client.query('UPDATE "MenuItem" SET url = $1, "updatedAt" = now() WHERE url = $2', [route, anchor]);
  menuUpdated += r.rowCount;
}

const remainingFooter = await client.query('SELECT count(*)::int AS n FROM "FooterLink" WHERE url LIKE \'#%\'');
const remainingMenu = await client.query('SELECT count(*)::int AS n FROM "MenuItem" WHERE url LIKE \'#%\'');
console.log(`footer links fixed: ${updated}, menu items fixed: ${menuUpdated}`);
console.log(`remaining #anchors — footer: ${remainingFooter.rows[0].n}, menu: ${remainingMenu.rows[0].n}`);
await client.end();
