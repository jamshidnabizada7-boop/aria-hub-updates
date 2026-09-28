import pg from 'pg';
const { Client } = pg;

const LOCAL_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/ariahub';
const SUPA_URL = process.env.SUPABASE_AUDIT_DATABASE_URL;

const CJK_RE = /[\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uFF01-\uFF60\uFFE0-\uFFE6]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const HTML_RE = /<\/?[a-z][\s\S]*>/i;

const DUMMY_17_IDS = [
  'cmtx43med006ho573l7nwe02k', 'cmtx43pah006jo573yutk86vh', 'cmtx43s6g006lo5739tu47unx', 'cmtx43uhg006no5730a9ndm98',
  'cmtx45ntw006ro5730pabtv4h', 'cmtx45sa1006vo5736extilcm', 'cmtx45unu006xo573gl6obcql', 'cmtx45xcs006zo5732otfze9v',
  'cmtx45z730071o573drlofkjy', 'cmtx461ic0073o573furx3ilw', 'cmtx46yz9007po5736dh1flfm', 'cmtx48gep0081o573tlqlqa6v',
  'cmtx5ustl000bo5zpqgfw7fsg',
  'cmtx5b2ii0005o52ss1bycv4l', 'cmtx5dl6f0007o52srpkj5bhm', 'cmtx5fg80000do52sspbv5r7j', 'cmtx5fi6q000fo52slieb5cep'
];

const PURE_ENG_OPP_DESC_IDS = ['cmtzkwa57000tuby8c0a0j0rs', 'cmu8wae4o0010ubo4qg9oatig', 'cmu8wa0ns000mubo4wyi50jsw', 'cmu8wa8ez000uubo4xo231uki', 'cmtzkwb74000vuby86i7t2yr4'];
const PURE_ENG_OPP_TITLE_IDS = ['cmu0a7jwr000kub4ge96y8d21', 'cmu0a7twa0016ub4geheeu89h', 'cmu8wb5wm001iubo4zq3300sr'];
const PURE_ENG_NEWS_IDS = ['cmtx575hn000lo52dq47hfl5r', 'cmtx575gl0009o52dtvftgzid', 'cmtx575hq000no52d8hfgsfyj', 'cmtx575id0013o52dzl7r5bxp'];

function isEnglishLeak(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.replace(/https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
  const engWords = (clean.match(/[a-zA-Z]{3,}/g) || []).length;
  const arWords = (clean.match(/[\u0600-\u06FF]{2,}/g) || []).length;
  return engWords > 10 && (arWords < 10 || engWords > arWords);
}

export async function runDeepAudit(dbName, connStr, ssl = false) {
  const client = new Client({ connectionString: connStr, ssl: ssl ? { rejectUnauthorized: false } : false });
  await client.connect();

  console.log(`\n======================================================`);
  console.log(`  DEEP COMPREHENSIVE TRANSLATION AUDIT: ${dbName}`);
  console.log(`======================================================`);

  let failures = 0;

  // 1. Production Dummy Text
  const dummyRes = await client.query(`
    SELECT id, "titleI18n", "descriptionI18n", "aiSummaryI18n"
    FROM "Opportunity"
  `);

  let dummyCount = 0;
  for (const r of dummyRes.rows) {
    const s = JSON.stringify([r.titleI18n, r.descriptionI18n, r.aiSummaryI18n]);
    if (/Dummy/i.test(s)) {
      dummyCount++;
      console.error(`  ❌ [FAIL] Dummy text found in ${r.id}`);
    }
  }
  if (dummyCount === 0) {
    console.log(`  ✅ [PASS] Zero Dummy records across ALL ${dummyRes.rows.length} opportunities.`);
  } else {
    failures++;
  }

  // 2. Pure English in fa/ps (Opportunity & News)
  let oppEngLeaks = 0;
  for (const r of dummyRes.rows) {
    const fa_t = r.titleI18n?.fa || '';
    const ps_t = r.titleI18n?.ps || '';
    const fa_s = r.aiSummaryI18n?.fa || '';
    const ps_s = r.aiSummaryI18n?.ps || '';
    const fa_d = r.descriptionI18n?.fa || '';
    const ps_d = r.descriptionI18n?.ps || '';

    if (isEnglishLeak(fa_t) || isEnglishLeak(ps_t) || isEnglishLeak(fa_s) || isEnglishLeak(ps_s) || isEnglishLeak(fa_d) || isEnglishLeak(ps_d)) {
      oppEngLeaks++;
      console.error(`  ❌ [FAIL] English leak in Opportunity ${r.id}`);
    }
  }
  if (oppEngLeaks === 0) {
    console.log(`  ✅ [PASS] Zero English leaks across ALL ${dummyRes.rows.length} opportunities.`);
  } else {
    failures++;
  }

  // News English leaks
  const newsRows = (await client.query(`SELECT id, title, "titleI18n", "excerptI18n", "contentI18n" FROM "News"`)).rows;
  let newsEngLeaks = 0;
  for (const n of newsRows) {
    const fa_t = n.titleI18n?.fa || '';
    const ps_t = n.titleI18n?.ps || '';
    const fa_e = n.excerptI18n?.fa || '';
    const ps_e = n.excerptI18n?.ps || '';
    const fa_c = n.contentI18n?.fa || '';
    const ps_c = n.contentI18n?.ps || '';

    if (isEnglishLeak(fa_t) || isEnglishLeak(ps_t) || isEnglishLeak(fa_e) || isEnglishLeak(ps_e) || isEnglishLeak(fa_c) || isEnglishLeak(ps_c)) {
      newsEngLeaks++;
      console.error(`  ❌ [FAIL] English leak in News ${n.id}`);
    }
    // Check Pashto leak in Farsi
    if (/^د\s+/i.test(fa_c.trim()) || /^د\s+/i.test(fa_e.trim())) {
      newsEngLeaks++;
      console.error(`  ❌ [FAIL] Pashto text in News Farsi field ${n.id}`);
    }
  }
  if (newsEngLeaks === 0) {
    console.log(`  ✅ [PASS] Zero English leaks or language mixing across ALL ${newsRows.length} news articles.`);
  } else {
    failures++;
  }

  // 3. Foreign Script Contamination across ALL 34 I18n tables
  const colsRes = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_name LIKE '%I18n%'
    ORDER BY table_name, column_name
  `);
  const tablesMap = {};
  for (const r of colsRes.rows) {
    if (!tablesMap[r.table_name]) tablesMap[r.table_name] = [];
    tablesMap[r.table_name].push(r.column_name);
  }

  let foreignScriptCount = 0;
  for (const [tbl, cols] of Object.entries(tablesMap)) {
    const selectCols = ['id', ...cols.map(col => `"${col}"`)].join(', ');
    const res = await client.query(`SELECT ${selectCols} FROM "${tbl}"`);
    for (const r of res.rows) {
      for (const col of cols) {
        const val = r[col];
        if (!val || typeof val !== 'object') continue;
        const s = JSON.stringify(val);
        if (CJK_RE.test(s) || CYRILLIC_RE.test(s) || DEVANAGARI_RE.test(s)) {
          foreignScriptCount++;
          console.error(`  ❌ [FAIL] Foreign script in ${tbl}.${col} (id=${r.id})`);
        }
      }
    }
  }
  if (foreignScriptCount === 0) {
    console.log(`  ✅ [PASS] Zero Foreign Script Contamination across ALL ${Object.keys(tablesMap).length} tables.`);
  } else {
    failures++;
  }

  // 4. Severely Truncated Opportunities (< 400 chars or missing or ending in dots)
  let truncCount = 0;
  for (const r of dummyRes.rows) {
    const fa_d = r.descriptionI18n?.fa;
    const ps_d = r.descriptionI18n?.ps;
    if (!fa_d || !ps_d || fa_d.length < 400 || ps_d.length < 400 || /[\.…]{2,}$/.test(fa_d.trim()) || /[\.…]{2,}$/.test(ps_d.trim())) {
      truncCount++;
      console.error(`  ❌ [FAIL] Truncated/missing description in Opportunity ${r.id} (fa: ${fa_d?.length}, ps: ${ps_d?.length})`);
    }
  }
  if (truncCount === 0) {
    console.log(`  ✅ [PASS] Zero Truncated / Short descriptions across ALL ${dummyRes.rows.length} opportunities (all >= 400 chars, substantive).`);
  } else {
    failures++;
  }

  // 5. News completeness
  let newsIncomplete = 0;
  for (const n of newsRows) {
    const fa_c = n.contentI18n?.fa || '';
    const ps_c = n.contentI18n?.ps || '';
    if (fa_c.length < 300 || ps_c.length < 300) {
      newsIncomplete++;
      console.error(`  ❌ [FAIL] Incomplete/short News content in ${n.id} (fa: ${fa_c.length}, ps: ${ps_c.length})`);
    }
  }
  if (newsIncomplete === 0) {
    console.log(`  ✅ [PASS] All ${newsRows.length} News articles complete with substantive content (>= 300 chars each).`);
  } else {
    failures++;
  }

  // 6. 27 Scraped Local Opportunities
  const scrapedRes = await client.query(`
    SELECT id, "titleI18n", "descriptionI18n", "aiSummaryI18n"
    FROM "Opportunity"
    WHERE id LIKE 'cmubtv%' OR id LIKE 'cmubu%'
  `);
  let scrapedDefects = 0;
  for (const r of scrapedRes.rows) {
    const fa_t = r.titleI18n?.fa;
    const ps_t = r.titleI18n?.ps;
    const fa_d = r.descriptionI18n?.fa;
    const ps_d = r.descriptionI18n?.ps;

    if (!fa_t || !ps_t || !fa_d || !ps_d) scrapedDefects++;
    if (isEnglishLeak(fa_t) || isEnglishLeak(ps_t) || isEnglishLeak(fa_d) || isEnglishLeak(ps_d)) scrapedDefects++;
    if (fa_d === ps_d && (fa_d.match(/[a-zA-Z]/g) || []).length > 10) scrapedDefects++;
  }
  if (scrapedRes.rows.length === 27 && scrapedDefects === 0) {
    console.log(`  ✅ [PASS] All 27 scraped opportunities fully translated, authentic, and present.`);
  } else {
    console.error(`  ❌ [FAIL] Scraped opportunities have ${scrapedDefects} defects! Count=${scrapedRes.rows.length}/27`);
    failures++;
  }

  // 7. Clean Plain Text (Zero HTML tags in fa/ps fields)
  let htmlCount = 0;
  for (const r of dummyRes.rows) {
    const fa_d = r.descriptionI18n?.fa || '';
    const ps_d = r.descriptionI18n?.ps || '';
    if (HTML_RE.test(fa_d) || HTML_RE.test(ps_d)) {
      htmlCount++;
      console.error(`  ❌ [FAIL] HTML in Opportunity ${r.id}`);
    }
  }
  if (htmlCount === 0) {
    console.log(`  ✅ [PASS] Clean plain text (0 HTML tags across all Opportunity descriptions).`);
  } else {
    failures++;
  }

  // 8. Row count check
  console.log(`  Row count in ${dbName}: Opportunities = ${dummyRes.rows.length}, News = ${newsRows.length}`);

  await client.end();
  return failures === 0;
}

async function main() {
  if (!SUPA_URL) throw new Error('SUPABASE_AUDIT_DATABASE_URL is required for the production read-only audit');
  const localOk = await runDeepAudit('Local PostgreSQL', LOCAL_URL, false);
  const supaOk = await runDeepAudit('Production Supabase', SUPA_URL, true);

  console.log('\n======================================================');
  if (localOk && supaOk) {
    console.log('🎉 ALL DEEP VERIFICATIONS PASSED ON BOTH LOCAL AND SUPABASE!');
  } else {
    console.log('⚠️ VERIFICATION FAILED — PLEASE REVIEW ERRORS ABOVE.');
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify-all-complete-deep.mjs')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
