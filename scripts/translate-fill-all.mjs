#!/usr/bin/env node
/**
 * translate-fill-all.mjs — ARIA HUB trilingual completeness loop (R21-c).
 *
 * Dynamically scans information_schema for EVERY table's `%I18n%` json columns,
 * finds rows where fa or ps is missing (source content = sibling base column
 * `x` or the JSON's own `en` member), and fills them with LLM translations
 * (fa = Farsi/Persian, ps = Pashto) via z-ai-web-dev-sdk. ONE LLM call per row
 * (all missing columns of the row batched together). Resumable via
 * scripts/.translate-progress.json checkpoint written after every row.
 *
 * SPECIAL HANDLING
 * - Pure symbols/numbers (e.g. "+", "%", "85%", "$160") are copied verbatim.
 * - Opportunity SEO mirror fields are DERIVED without the LLM:
 *     seoTitleI18n/ogTitleI18n   ← titleI18n
 *     seoDescriptionI18n/ogDescriptionI18n ← aiSummaryI18n (≈155 chars, word-safe)
 *     seoKeywordsI18n            ← tagsI18n (array) when available
 * - News.contentI18n (long HTML/markdown): translated in full; if >4000 chars
 *   the model may compress to ~60% while keeping ALL key facts (never
 *   hard-truncated). Text >12000 chars is translated per paragraph-chunk.
 *
 * USAGE
 *   node scripts/translate-fill-all.mjs                        # local (.env DATABASE_URL)
 *   node scripts/translate-fill-all.mjs postgresql://…         # explicit URL
 *   DATABASE_URL=postgres://… node scripts/translate-fill-all.mjs
 *   OWNER (after hosting): bun run scripts/translate-fill-all.mjs process.env.DATABASE_URL
 *   Flags: --dry  (scan + report only)   --force  (re-translate even complete cells)
 *
 * z-ai-web-dev-sdk runs SERVER-SIDE only (backend script — never import in client code).
 */
import pg from 'pg';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = join(here, '.translate-progress.json');

// ── args / db url ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const argUrl =
  argv.find((a) => a.startsWith('postgres')) ||
  (argv.find((a) => a.startsWith('DATABASE_URL=')) || '').replace(/^DATABASE_URL=/, '') ||
  process.env.DATABASE_URL ||
  '';
function envUrl() {
  try {
    const raw = readFileSync(join(here, '..', '.env'), 'utf8');
    const m = raw.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch { return ''; }
}
const DB_URL = argUrl.startsWith('postgres') ? argUrl : envUrl();
if (!DB_URL.startsWith('postgres')) {
  console.error('FATAL: no postgres DATABASE_URL (pass argv, DATABASE_URL=…, or .env)');
  process.exit(1);
}
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');

const pool = new pg.Pool({ connectionString: DB_URL, max: 2, connectionTimeoutMillis: 15000 });
const qi = (id) => `"${id.replace(/"/g, '""')}"`;

// ── checkpoint ───────────────────────────────────────────────────────────────
let progress = { done: {}, stats: { ok: 0, failed: 0, derived: 0, skipped: 0 }, startedAt: null };
if (existsSync(PROGRESS_FILE)) {
  try {
    const prev = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
    if (prev && prev.done) progress = prev;
  } catch { /* corrupt file → fresh start */ }
}
function saveProgress() {
  try { writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch { /* best effort */ }
}
const key = (t, id, c) => `${t}.${id}.${c}`;

// ── helpers ──────────────────────────────────────────────────────────────────
const SYMBOL_RE = /^[\s\d.,+%~×x°–—\-/$€£#&*'"()\[\]]+$/u;
const isSymbol = (s) => s.length <= 12 && SYMBOL_RE.test(s) && /[\d+%+]/.test(s);

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}
function toText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(', ');
  if (typeof v === 'object') return Object.values(v).map(toText).filter(Boolean).join(', ');
  return String(v);
}
function trimWords(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
function chunkText(s, max = 8000) {
  if (s.length <= max) return [s];
  const parts = [];
  let rest = s;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf('. ', max);
    if (cut < max * 0.5) cut = max;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^[\s\n]+/, '');
  }
  if (rest.trim()) parts.push(rest);
  return parts;
}

// ── LLM (z-ai-web-dev-sdk, backend only) ─────────────────────────────────────
let zai = null;
async function getZai() {
  if (zai) return zai;
  const mod = await import('z-ai-web-dev-sdk');
  const ZAI = mod.default || mod;
  zai = await ZAI.create();
  return zai;
}

const SYSTEM_PROMPT = `You are a professional translator for ARIA HUB, an Afghan opportunities portal (jobs, scholarships, visas, interviews).
Translate the given English fields into TWO languages:
- "fa": Farsi/Persian (فارسی فارسی)
- "ps": Pashto (پښتو)
Rules:
- Natural, fluent, concise, professional tone for an Afghan audience. Correct RTL script.
- Keep URLs, emails, phone numbers, dates' numerals, org/brand names (UNICEF, IELTS, TOEFL, Chevening), and technical terms as-is.
- If a field contains simple HTML or markdown, translate the text and PRESERVE the tags/structure exactly (same headings, paragraphs, list items).
- Never invent facts. If a value is a proper noun with no sensible translation, transliterate naturally.
- Respond ONLY with strict JSON: {"<fieldKey>": {"fa": "<translation>", "ps": "<translation>"}, ...} — one entry per input field, no markdown fences, no commentary.
- If the input for a field is a JSON array of strings, return arrays of translated strings for fa and ps.`;

// global circuit breaker: survive 429 storms by pausing long instead of failing
let consecutive429 = 0;
let stormSkips = 0;
async function chatWithRetry(system, user, attempts = 5) {
  const client = await getZai();
  let lastErr;
  for (let a = 0; a < attempts; a++) {
    try {
      const res = await client.chat.completions.create({
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      });
      consecutive429 = 0;
      return res?.choices?.[0]?.message?.content || '';
    } catch (e) {
      lastErr = e;
      const msg = (e && e.message) || '';
      const is429 = msg.includes('429') || msg.toLowerCase().includes('too many');
      if (is429 && a < attempts - 1) {
        const wait = 30000 * Math.pow(2, a); // 30s → 60s → 120s → 240s
        console.log(`      (429 rate-limited — waiting ${wait / 1000}s, retry ${a + 2}/${attempts})`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function parseJsonLoose(raw) {
  if (!raw) return null;
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

const asLangValue = (v) => {
  if (typeof v === 'string') return v.trim() || null;
  if (Array.isArray(v)) {
    const arr = v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
    return arr.length ? arr : null;
  }
  return null;
};

/** Translate a batch of fields {key: text} → {key: {fa, ps}} */
async function translateFields(fields, opts = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = { fa: null, ps: null };
  const compress = opts.allowCompress
    ? '\n- The "content" field is long: translate the FULL text; you MAY tighten the wording to roughly 60-70% of the length but keep every key fact (deadlines, requirements, amounts, how to apply). Do NOT cut the ending.'
    : '';
  const prompt = `Translate these fields to fa (Farsi/Persian) and ps (Pashto).\nReturn JSON: {"<fieldKey>":{"fa":"…","ps":"…"}}.\n\n${JSON.stringify(fields, null, 1)}`;
  let raw;
  try {
    raw = await chatWithRetry(SYSTEM_PROMPT + compress, prompt);
  } catch (e) {
    console.log(`      LLM error: ${(e && e.message || String(e)).slice(0, 120)}`);
    return null;
  }
  const parsed = parseJsonLoose(raw);
  if (!parsed) return null;
  let allFilled = true;
  for (const k of Object.keys(fields)) {
    const got = parsed[k] || parsed[k.replace(/I18n$/, '')] || null;
    if (!got || typeof got !== 'object') { allFilled = false; continue; }
    out[k].fa = asLangValue(got.fa);
    out[k].ps = asLangValue(got.ps);
    if (!out[k].fa || !out[k].ps) allFilled = false;
  }
  return allFilled ? out : (Object.values(out).some((x) => x.fa || x.ps) ? out : null);
}

/** Long-content path: chunked full translation for fa and ps. */
async function translateLongField(text) {
  const chunks = chunkText(text, 8000);
  const result = { fa: [], ps: [] };
  for (let i = 0; i < chunks.length; i++) {
    const prompt = `Translate this section (part ${i + 1}/${chunks.length} of one document) to fa and ps. Preserve HTML/markdown structure exactly. Respond ONLY as JSON: {"fa":"…","ps":"…"}\n\n${chunks[i]}`;
    const raw = await chatWithRetry(SYSTEM_PROMPT, prompt);
    const parsed = parseJsonLoose(raw);
    if (!parsed || !parsed.fa || !parsed.ps) return null;
    result.fa.push(String(parsed.fa));
    result.ps.push(String(parsed.ps));
    await new Promise((r) => setTimeout(r, 3500));
  }
  return { fa: result.fa.join('\n'), ps: result.ps.join('\n') };
}

// ── scan: build the work list dynamically ────────────────────────────────────
const TABLE_PRIORITY = [
  // small/fast tables first — maximizes progress during LLM rate-limit windows;
  // News (huge content) deliberately LAST.
  'CtaBanner', 'Counter', 'Department', 'SiteSetting', 'NewsCategory',
  'OpportunityCategory', 'FooterLink', 'GalleryItem', 'TeamMember', 'Branch',
  'Testimonial', 'WhyChooseUsFeature', 'ProcessStep', 'PricingPackage',
  'Visa', 'VisaCategory', 'VisaCountry', 'VisaDocument', 'VisaRejection',
  'Page', 'News',
];

async function scanAll() {
  const { rows: cols } = await pool.query(`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND c.column_name LIKE '%I18n%' AND c.data_type IN ('json', 'jsonb')
  `);
  const { rows: allCols } = await pool.query(`
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  `);
  const has = (t, c) => allCols.some((r) => r.table_name === t && r.column_name === c);
  const typeOf = (t, c) => (allCols.find((r) => r.table_name === t && r.column_name === c) || {}).data_type;

  const tables = [...new Set(cols.map((c) => c.table_name))];
  const work = [];
  for (const table of tables) {
    const targets = cols.filter((c) => c.table_name === table).map((c) => c.column_name);
    const selectCols = new Set(['id']);
    for (const col of targets) {
      selectCols.add(qi(col)); // the i18n column itself (pg parses json/jsonb to objects)
      const base = col.replace(/I18n$/, '');
      if (has(table, base)) selectCols.add(qi(base));
    }
    // opportunity SEO mirrors need these sources even when their own base is null
    if (table === 'Opportunity') {
      for (const extra of ['titleI18n', 'aiSummaryI18n', 'descriptionI18n', 'tagsI18n', 'tags', 'title']) {
        if (has(table, extra)) selectCols.add(qi(extra));
      }
    }
    const sel = [...selectCols].join(', ');
    let rows;
    try {
      rows = (await pool.query(`SELECT ${sel} FROM ${qi(table)}`)).rows;
    } catch (e) {
      console.log(`  ! scan ${table}: ${(e.message || e).slice(0, 100)}`);
      continue;
    }
    for (const row of rows) {
      const seen = new Set();
      for (const col of targets) {
        const base = col.replace(/I18n$/, '');
        let json = null;
        try { json = row[col] ? (typeof row[col] === 'string' ? JSON.parse(row[col]) : row[col]) : null; } catch { json = null; }
        const baseVal = has(table, base) ? row[base] : null;
        const en = (json && typeof json.en === 'string' && json.en.trim()) || (Array.isArray(json?.en) && json.en.length ? json.en : null) || toText(baseVal).trim() || '';
        if (!en) continue;
        const faOk = !!(json?.fa && (typeof json.fa === 'string' ? json.fa.trim() : (Array.isArray(json.fa) && json.fa.length)));
        const psOk = !!(json?.ps && (typeof json.ps === 'string' ? json.ps.trim() : (Array.isArray(json.ps) && json.ps.length)));
        if (!FORCE && faOk && psOk) continue;
        seen.add(key(table, row.id, col));
        work.push({ table, id: row.id, col, base, en, faOk, psOk, json, row });
      }
      // Opportunity SEO mirror columns have no own base content — DERIVE them
      // from the already-translated title/summary/tags i18n (matches the
      // backfill-full-translate.ts precedent). Pushed even with empty base.
      if (table === 'Opportunity') {
        const mirrors = ['ogTitleI18n', 'ogDescriptionI18n', 'seoTitleI18n', 'seoDescriptionI18n', 'seoKeywordsI18n'];
        for (const col of mirrors) {
          if (!targets.includes(col) || seen.has(key(table, row.id, col))) continue;
          let json = null;
          try { json = row[col] ? (typeof row[col] === 'string' ? JSON.parse(row[col]) : row[col]) : null; } catch { json = null; }
          const faOk = !!(json?.fa && (typeof json.fa === 'string' ? json.fa.trim() : (Array.isArray(json.fa) && json.fa.length)));
          const psOk = !!(json?.ps && (typeof json.ps === 'string' ? json.ps.trim() : (Array.isArray(json.ps) && json.ps.length)));
          if (!FORCE && faOk && psOk) continue;
          const summaryI18n = parseJsonSafe(row.aiSummaryI18n) || parseJsonSafe(row.descriptionI18n);
          const tagsI18n = parseJsonSafe(row.tagsI18n);
          const en = col.includes('Description') ? (summaryI18n?.en || '')
            : col === 'seoKeywordsI18n' ? (Array.isArray(tagsI18n?.en) ? tagsI18n.en.join(', ') : '')
            : (parseJsonSafe(row.titleI18n)?.en || row.title || '');
          work.push({ table, id: row.id, col, base: col.replace(/I18n$/, ''), en, faOk, psOk, json, row, deriveOnly: true });
        }
      }
    }
  }
  // priority ordering: known table order first, then table name
  const prio = (t) => { const i = TABLE_PRIORITY.indexOf(t); return i === -1 ? 100 + t.charCodeAt(0) : i; };
  work.sort((a, b) => prio(a.table) - prio(b.table) || a.table.localeCompare(b.table) || String(a.id).localeCompare(String(b.id)));
  return { work, has };
}

// ── derivation rules (no LLM) ────────────────────────────────────────────────
function wordSafeTrim(i18n, max) {
  const out = {};
  for (const [lang, v] of Object.entries(i18n)) {
    if (typeof v === 'string') out[lang] = trimWords(stripHtml(v), max);
    else out[lang] = v;
  }
  return out;
}
function parseJsonSafe(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

function deriveOpportunityMirrors(item) {
  const { row, table } = item;
  if (table !== 'Opportunity') return null;
  const titleI18n = parseJsonSafe(row.titleI18n);
  const summaryI18n = parseJsonSafe(row.aiSummaryI18n) || parseJsonSafe(row.descriptionI18n);
  const tagsI18n = parseJsonSafe(row.tagsI18n);
  const tagsBase = row.tags ? (Array.isArray(row.tags) ? row.tags : toText(row.tags).split(',').map((s) => s.trim()).filter(Boolean)) : null;
  if (item.col === 'seoTitleI18n' || item.col === 'ogTitleI18n') {
    if (!titleI18n) return null;
    const next = { ...item.json, ...titleI18n };
    return { fa: next.fa || null, ps: next.ps || null, next };
  }
  if (item.col === 'seoDescriptionI18n' || item.col === 'ogDescriptionI18n') {
    if (!summaryI18n) return null;
    const next = wordSafeTrim({ ...item.json, ...summaryI18n }, 158);
    return { fa: next.fa || null, ps: next.ps || null, next };
  }
  if (item.col === 'seoKeywordsI18n') {
    const src = tagsI18n || (tagsBase ? { en: tagsBase } : null);
    if (!src) return null;
    const merged = { ...item.json };
    for (const [lang, v] of Object.entries(src)) if (merged[lang] == null) merged[lang] = v;
    return { fa: merged.fa || null, ps: merged.ps || null, next: merged };
  }
  return null;
}

// ── write ────────────────────────────────────────────────────────────────────
async function writeCell(item, nextJson) {
  await pool.query(
    `UPDATE ${qi(item.table)} SET ${qi(item.col)} = $1::jsonb WHERE "id" = $2`,
    [JSON.stringify(nextJson), item.id],
  );
}

// ── main loop ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`translate-fill-all — db: ${DB_URL.replace(/:[^:@/]+@/, ':***@')}`);
  const { work, has } = await scanAll();
  console.log(`scan: ${work.length} cells to fill (fa/ps incomplete)`);
  if (DRY) {
    const byTable = {};
    for (const w of work) byTable[w.table] = (byTable[w.table] || 0) + 1;
    for (const [t, n] of Object.entries(byTable).sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${n}`);
    process.exit(0);
  }
  if (!work.length) { console.log('✅ nothing to fill'); return; }

  // group into LLM calls: one call per (table,row) — all missing cols of the row
  const groups = new Map();
  for (const w of work) {
    const gk = `${w.table}::${w.id}`;
    if (!groups.has(gk)) groups.set(gk, { table: w.table, id: w.id, items: [] });
    groups.get(gk).items.push(w);
  }
  console.log(`groups: ${groups.size} rows → ~${groups.size} LLM calls`);

  const PACE_MS = 3500;
  let callIdx = 0;

  const groupList = [...groups.entries()];
  let gi = 0;
  while (gi < groupList.length) {
    const [gk, group] = groupList[gi];
    const pendingItems = group.items.filter((it) => !progress.done[key(it.table, it.id, it.col)]);
    if (!pendingItems.length) { gi++; continue; }
    callIdx++;
    const tag = `[${callIdx}/${groups.size}] ${group.table}#${String(group.id).slice(-8)}`;

    // 1. derivation-only cells (opportunity SEO mirrors, symbols)
    for (const it of group.items) {
      if (progress.done[key(it.table, it.id, it.col)]) continue;
      const merged = { ...(it.json || {}) };
      let handled = false;

      if (isSymbol(it.en)) {
        if (!merged.fa) merged.fa = it.en;
        if (!merged.ps) merged.ps = it.en;
        await writeCell(it, merged);
        progress.done[key(it.table, it.id, it.col)] = 'verbatim';
        progress.stats.derived++;
        handled = true;
        continue;
      }
      const derived = deriveOpportunityMirrors(it);
      if (derived && derived.fa && derived.ps) {
        await writeCell(it, derived.next);
        progress.done[key(it.table, it.id, it.col)] = 'derived';
        progress.stats.derived++;
        handled = true;
      }
    }
    const stillPending = group.items.filter((it) => !progress.done[key(it.table, it.id, it.col)]);
    if (!stillPending.length) { saveProgress(); console.log(`${tag} ✓ derived`); gi++; continue; }

    // 2. LLM path — one call per row with all missing fields
    const fields = {};
    for (const it of stillPending) {
      const text = it.en;
      if (typeof text !== 'string' || !text.trim()) {
        // genuinely nothing to translate from (e.g. empty base + no en) — skip forever
        progress.done[key(it.table, it.id, it.col)] = 'skipped-empty';
        progress.stats.skipped++;
        continue;
      }
      fields[it.base] = text;
    }
    if (!Object.keys(fields).length) {
      saveProgress();
      console.log(`${tag} ✓ nothing translatable (empty sources)`);
      gi++;
      continue;
    }
    const hasLong = stillPending.some((it) => it.table === 'News' && it.col === 'contentI18n' && String(it.en || '').length > 4000);
    const hasHuge = stillPending.find((it) => String(it.en || '').length > 12000);

    let result = null;
    try {
      if (callIdx > 1) await new Promise((r) => setTimeout(r, PACE_MS));
      if (hasHuge) {
        // per-field chunked translation (rare)
        for (const it of stillPending) {
          const long = await translateLongField(String(it.en));
          if (long) {
            const merged = { ...(it.json || {}) };
            if (!merged.fa) merged.fa = long.fa;
            if (!merged.ps) merged.ps = long.ps;
            await writeCell(it, merged);
            progress.done[key(it.table, it.id, it.col)] = 'llm-chunked';
            progress.stats.ok++;
          } else {
            progress.stats.failed++;
          }
          saveProgress();
        }
        console.log(`${tag} ✓ chunked`);
        gi++;
        continue;
      }
      result = await translateFields(fields, { allowCompress: hasLong });
    } catch (e) {
      const msg = (e && e.message) || String(e);
      console.log(`${tag} ✗ ${msg.slice(0, 140)}`);
      progress.stats.failed++;
      saveProgress();
      if (msg.includes('429') || msg.toLowerCase().includes('too many')) {
        consecutive429++;
        stormSkips++;
        if (consecutive429 >= 2) {
          const pause = Math.min(600000, 300000 * consecutive429); // 5min, 10min cap
          console.log(`      ⏸ 429 storm (${consecutive429} consecutive) — pausing ${pause / 1000}s${stormSkips < 3 ? ', will RETRY same group' : ''}`);
          await new Promise((r) => setTimeout(r, pause));
        }
        // rewind: retry the same group while the storm is young; after 3 storm
        // failures on the same group, move on (checkpoint keeps it resumable)
        if (stormSkips < 3) continue;
        console.log(`      → skipping group after 3 storm failures`);
        stormSkips = 0;
      }
      gi++;
      continue;
    }
    if (!result) {
      console.log(`${tag} ✗ unparseable/empty LLM response (${Object.keys(fields).join(',')})`);
      progress.stats.failed++;
      saveProgress();
      gi++;
      continue;
    }
    let wrote = 0;
    for (const it of stillPending) {
      const got = result[it.base];
      if (!got || (!got.fa && !got.ps)) continue;
      const merged = { ...(it.json || {}), en: typeof it.en === 'string' ? it.en : (it.json?.en ?? it.en) };
      // array-typed sources (keywords/tags): split comma responses back into arrays
      const toArray = (v, orig) => {
        if (Array.isArray(orig)) {
          if (Array.isArray(v)) return v;
          if (typeof v === 'string') return v.split(/[,،;]/).map((s) => s.trim()).filter(Boolean);
        }
        return v;
      };
      const fa = toArray(got.fa, it.json?.en ?? it.en);
      const ps = toArray(got.ps, it.json?.en ?? it.en);
      if (!merged.fa && fa) merged.fa = fa;
      if (!merged.ps && ps) merged.ps = ps;
      if ((it.faOk || merged.fa) && (it.psOk || merged.ps)) {
        try {
          await writeCell(it, merged);
          progress.done[key(it.table, it.id, it.col)] = 'llm';
          progress.stats.ok++;
          wrote++;
        } catch (e) {
          console.log(`${tag} ✗ write fail ${it.col}: ${(e && e.message || '').slice(0, 100)}`);
          progress.stats.failed++;
        }
      }
    }
    saveProgress();
    const sample = stillPending[0];
    const faSample = (result[sample.base]?.fa || '').slice(0, 40);
    console.log(`${tag} ✓ wrote ${wrote}/${stillPending.length} | "${String(sample.en).slice(0, 38)}" → ${faSample}…`);
    stormSkips = 0;
    gi++;
  }

  console.log(`\nDONE ok=${progress.stats.ok} derived=${progress.stats.derived} failed=${progress.stats.failed}`);
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exitCode = 1; })
  .finally(() => pool.end());
