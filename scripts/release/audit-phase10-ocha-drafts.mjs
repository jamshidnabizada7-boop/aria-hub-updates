// PHASE 10 — ReliefWeb Jobs (OCHA) draft review (READ-ONLY, SELECT only).
// Fetches the 15 drafts, inspects RSS description HTML for ReliefWeb tag divs
// (class="tag country" / "tag organization"), checks duplicate risk against all
// other opportunities (sourceUrl / title / contentHash), emits
// scripts/release/out/phase10-ocha-drafts.json.
import pg from 'pg';
import fs from 'fs';

const src = fs.readFileSync('scripts/check-col-parity.mjs', 'utf8');
const url = src.match(/^const SUPA_URL = '(.+?)';$/m)[1];
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const drafts = (await c.query(`
  SELECT id, slug, title, description, deadline, "applyUrl", "applyUrlType", "applyUrlEvidence",
         "extractedData", "sourceUrl", "originalUrl", "verificationStatus", "organization",
         "organizationId", "jobType", country, "contentHash", "createdAt", "importStatus"
  FROM "Opportunity"
  WHERE "sourceName" = 'ReliefWeb Jobs (OCHA)' AND status = 'draft'
  ORDER BY "createdAt" DESC`)).rows;
console.log(`OCHA drafts: ${drafts.length}`);

// duplicate-risk checks against ALL other opportunities
const dupChecks = [];
for (const d of drafts) {
  const bySourceUrl = d.sourceUrl
    ? (await c.query(`SELECT slug, status, "sourceName" FROM "Opportunity" WHERE "sourceUrl" = $1 AND id <> $2`, [d.sourceUrl, d.id])).rows
    : [];
  const byOriginalUrl = d.originalUrl
    ? (await c.query(`SELECT slug, status, "sourceName" FROM "Opportunity" WHERE "originalUrl" = $1 AND id <> $2`, [d.originalUrl, d.id])).rows
    : [];
  const byTitle = (await c.query(`SELECT slug, status, "sourceName", deadline FROM "Opportunity" WHERE lower(title) = lower($1) AND id <> $2`, [d.title, d.id])).rows;
  const byHash = d.contentHash
    ? (await c.query(`SELECT slug, status, "sourceName" FROM "Opportunity" WHERE "contentHash" = $1 AND id <> $2`, [d.contentHash, d.id])).rows
    : [];
  dupChecks.push({ slug: d.slug, bySourceUrl, byOriginalUrl, byTitle, byHash });
}

// ReliefWeb RSS tag divs: <div class="tag country"><a ...>Afghanistan</a></div> etc.
const tagRe = /<div class="tag ([a-z-]+)"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/gi;
function extractTags(html) {
  const out = {};
  let m;
  tagRe.lastIndex = 0;
  while ((m = tagRe.exec(html)) !== null) {
    const kind = m[1];
    (out[kind] ||= []).push(m[2].trim());
  }
  return out;
}
const stripHtml = (h) => h
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

const out = drafts.map((d, i) => {
  const tags = extractTags(d.description);
  return {
    idx: i + 1,
    id: d.id, slug: d.slug, title: d.title,
    descFirst400: stripHtml(d.description).slice(0, 400),
    descLength: d.description.length,
    tags,
    deadline: d.deadline, applyUrl: d.applyUrl, applyUrlType: d.applyUrlType,
    applyUrlEvidence: d.applyUrlEvidence, extractedData: d.extractedData,
    sourceUrl: d.sourceUrl, originalUrl: d.originalUrl,
    verificationStatus: d.verificationStatus, organization: d.organization,
    organizationId: d.organizationId, jobType: d.jobType, country: d.country,
    createdAt: d.createdAt, importStatus: d.importStatus,
    dup: dupChecks[i],
  };
});

fs.mkdirSync('scripts/release/out', { recursive: true });
fs.writeFileSync('scripts/release/out/phase10-ocha-drafts.json', JSON.stringify(out, null, 2));

for (const d of out) {
  console.log(`\n#${d.idx} ${d.slug}`);
  console.log(`  title: ${d.title}`);
  console.log(`  deadline: ${d.deadline} | jobType: ${d.jobType} | country: ${d.country} | verificationStatus: ${d.verificationStatus}`);
  console.log(`  applyUrl: ${d.applyUrl} (${d.applyUrlType}) evidence=${d.applyUrlEvidence}`);
  console.log(`  sourceUrl: ${d.sourceUrl} | originalUrl: ${d.originalUrl}`);
  console.log(`  organization: ${d.organization} / ${d.organizationId}`);
  console.log(`  extractedData: ${JSON.stringify(d.extractedData)}`);
  console.log(`  tags: ${JSON.stringify(d.tags)}`);
  console.log(`  desc[:400]: ${d.descFirst400}`);
  const dv = d.dup;
  const dupHits = [
    ...dv.bySourceUrl.map(x => `sourceUrl→${x.slug}(${x.status}/${x.sourceName})`),
    ...dv.byOriginalUrl.map(x => `originalUrl→${x.slug}(${x.status}/${x.sourceName})`),
    ...dv.byTitle.map(x => `title→${x.slug}(${x.status}/${x.sourceName})`),
    ...dv.byHash.map(x => `hash→${x.slug}(${x.status}/${x.sourceName})`),
  ];
  console.log(`  dupRisk: ${dupHits.length ? dupHits.join(', ') : 'none'}`);
}
await c.end();
console.log('\nWrote scripts/release/out/phase10-ocha-drafts.json');
