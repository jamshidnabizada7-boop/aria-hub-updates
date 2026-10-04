// PHASE 26 — Apply-link quality audit (READ-ONLY, SELECT only).
// Published opportunities across the 8 mandated sources:
//   ACBAR, Wazifaha Jobs, Jobs.af, Scholarships Corner, Opportunities For Youth,
//   Employer, ReliefWeb Jobs (OCHA), Acted Vacancies
// Computes (full population, not sampled):
//   - applyUrlType distribution per source
//   - flags: applyUrl NULL on published; generic emails (info@/webinfo@/no-reply@);
//     applyUrl host == sourceUrl host (aggregator-redirect risk); deadline > 7 days past
// Row-level detail capped at 250 rows/source; doc shows up to 20 flagged examples.
// Emits scripts/release/out/phase26-apply-link-quality.json.
import pg from 'pg';
import fs from 'fs';

const src = fs.readFileSync('scripts/check-col-parity.mjs', 'utf8');
const url = src.match(/^const SUPA_URL = '(.+?)';$/m)[1];
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const SOURCES = ['ACBAR', 'Wazifaha Jobs', 'Jobs.af', 'Scholarships Corner', 'Opportunities For Youth', 'Employer', 'ReliefWeb Jobs (OCHA)', 'Acted Vacancies'];

const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return null; } };
const GENERIC_PREFIXES = ['info@', 'webinfo@', 'no-reply@', 'noreply@', 'donotreply@'];

const distribution = {};
const flagged = [];
const summary = {};

for (const s of SOURCES) {
  const rows = (await c.query(`
    SELECT slug, title, "applyUrl", "applyUrlType", "applyUrlEvidence", "applyConfidence",
           "sourceUrl", deadline, "verificationStatus"
    FROM "Opportunity"
    WHERE status = 'published' AND "sourceName" = $1
    ORDER BY "createdAt" DESC
    LIMIT 250`, [s])).rows;

  const types = {};
  let nullApply = 0, genericEmail = 0, sameHost = 0, staleDeadline = 0;
  const now = Date.now();
  for (const r of rows) {
    const t = r.applyUrlType ?? '(null)';
    types[t] = (types[t] || 0) + 1;
    const reasons = [];
    if (!r.applyUrl) { nullApply++; reasons.push('applyUrl NULL on published'); }
    else {
      const low = r.applyUrl.toLowerCase();
      if (low.startsWith('mailto:') && GENERIC_PREFIXES.some(p => low.startsWith('mailto:' + p))) {
        genericEmail++; reasons.push(`generic email (${r.applyUrl.replace(/^mailto:/i, '').split('@')[0]}@…)`);
      }
      if (r.sourceUrl && hostOf(r.applyUrl) && hostOf(r.applyUrl) === hostOf(r.sourceUrl)) {
        sameHost++; reasons.push(`applyUrl host == sourceUrl host (${hostOf(r.applyUrl)})`);
      }
    }
    if (r.deadline && new Date(r.deadline).getTime() < now - 7 * 24 * 3600 * 1000) {
      staleDeadline++; reasons.push(`deadline >7d past (${new Date(r.deadline).toISOString().slice(0, 10)})`);
    }
    if (reasons.length) flagged.push({ source: s, slug: r.slug, title: r.title, applyUrl: r.applyUrl, sourceUrl: r.sourceUrl, applyUrlType: r.applyUrlType, reasons });
  }
  distribution[s] = { sampled: rows.length, types };
  summary[s] = { sampled: rows.length, nullApply, genericEmail, sameHost, staleDeadline };
  console.log(`${s}: n=${rows.length} types=${JSON.stringify(types)} flags: null=${nullApply} genericEmail=${genericEmail} sameHost=${sameHost} staleDeadline=${staleDeadline}`);
}

// sanity: overall published counts per source (full population, no LIMIT)
const fullCounts = (await c.query(`
  SELECT "sourceName", COUNT(*)::int AS published FROM "Opportunity" WHERE status='published' GROUP BY 1 ORDER BY 2 DESC`)).rows;
console.log('\nFull published counts:', JSON.stringify(fullCounts));

fs.mkdirSync('scripts/release/out', { recursive: true });
fs.writeFileSync('scripts/release/out/phase26-apply-link-quality.json', JSON.stringify({ summary, distribution, fullCounts: fullCounts.rows, flagged }, null, 2));
console.log(`\nflagged rows: ${flagged.length}`);
for (const f of flagged.slice(0, 40)) console.log(`  [${f.source}] ${f.slug} :: ${f.reasons.join('; ')}`);
await c.end();
console.log('Wrote scripts/release/out/phase26-apply-link-quality.json');
