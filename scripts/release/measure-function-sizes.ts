/**
 * PHASE D/F/G — measure per-route traced function footprint from Next.js
 * output file traces (.nft.json). Reports largest routes, the largest
 * traced files, and checks for accidental tracing of dev junk.
 *
 * Usage: bun scripts/release/measure-function-sizes.mjs [baseline-out.json]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverDir = path.join(root, '.next', 'server');
const nftFiles = [];
const walk = (dir: string) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.nft.json')) nftFiles.push(p);
  }
};
walk(serverDir);

// rows
const rows = [];
const fileHits = {};
const suspicious = new Set(['release-backups', '.localpg', '.stage1-integration', '_video-studio', 'temp_translator', '.env', 'pgdata', 'localpg']);

for (const nftPath of nftFiles) {
  const nftDir = path.dirname(nftPath);
  const nft = JSON.parse(fs.readFileSync(nftPath, 'utf8'));
  const route = path.relative(serverDir, nftDir).replace(/\.route$/, '').replace(/\\/g, '/') || '/';
  let bytes = 0;
  let files = 0;
  for (const rel of nft.files as string[]) {
    const abs = path.resolve(nftDir, rel);
    let st: fs.Stats;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }
    bytes += st.size;
    files += 1;
    const norm = abs.replace(/\\/g, '/').toLowerCase();
    for (const s of suspicious) {
      if (norm.includes(`${s}`)) {
        const key = s;
        fileHits[key] = fileHits[key] ?? { count: 0, bytes: 0 };
        fileHits[key].count += 1;
        fileHits[key].bytes += st.size;
      }
    }
    if (norm.includes('chromium') || norm.includes('playwright')) {
      const key = norm.includes('sparticuz') ? 'chromium-bin' : 'playwright-core';
      fileHits[key] = fileHits[key] ?? { count: 0, bytes: 0 };
      fileHits[key].count += 1;
      fileHits[key].bytes += st.size;
    }
  }
  rows.push({ route, files, bytes });
}

rows.sort((a, b) => b.bytes - a.bytes);
const totalBytes = rows.reduce((a, r) => a + r.bytes, 0);
console.log(`routes traced: ${rows.length} | total traced: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
console.log('\nTOP 15 ROUTES BY TRACED SIZE:');
for (const r of rows.slice(0, 15)) {
  console.log(`  ${(r.bytes / 1024 / 1024).toFixed(1).padStart(7)} MB  ${String(r.files).padStart(5)} files  ${r.route}`);
}
console.log('\nSPECIAL CONTRIBUTIONS (across all traces):');
for (const [k, v] of Object.entries(fileHits).sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`  ${(v.bytes / 1024 / 1024).toFixed(1).padStart(7)} MB  ${String(v.count).padStart(5)} file-hits  ${k}`);
}
if (process.argv[2]) {
  fs.writeFileSync(process.argv[2], JSON.stringify({ measuredAt: new Date().toISOString(), totalBytes, rows, fileHits }, null, 2));
  console.log(`\nbaseline written: ${process.argv[2]}`);
}

// ─── PHASE S guardrail: run with --check to enforce measured thresholds ─────
// Baselines measured 2026-10-04 (docs/function-size-baseline.json):
//   CV PDF function ≤ 340 MB traced; any pipeline function ≤ 285 MB;
//   playwright-core ≤ 15 MB total; chromium only inside the PDF function;
//   zero .env files in any trace.
if (process.argv.includes('--check')) {
  const fail: string[] = [];
  const pdf = rows.find((r) => r.route === 'app/api/cv-builder/pdf');
  if (pdf && pdf.bytes > 340 * 1024 * 1024) fail.push(`CV PDF function grew: ${(pdf.bytes / 1048576).toFixed(1)} MB > 340 MB`);
  const pipeline = rows.find((r) => r.route === 'app/api/admin/pipeline/tick');
  if (pipeline && pipeline.bytes > 285 * 1024 * 1024) fail.push(`pipeline tick grew: ${(pipeline.bytes / 1048576).toFixed(1)} MB > 285 MB`);
  if ((fileHits['playwright-core']?.bytes ?? 0) > 15 * 1024 * 1024) fail.push(`playwright-core re-entering traces: ${((fileHits['playwright-core']?.bytes ?? 0) / 1048576).toFixed(1)} MB > 15 MB`);
  if (fileHits['chromium-bin'] && !rows.some((r) => r.route === 'app/api/cv-builder/pdf')) fail.push('chromium traced but PDF route missing');
  if (fileHits['.env']) fail.push(`.env files traced into functions (${fileHits['.env'].count} hits) — SECRET LEAK`);
  if (fail.length) {
    console.error('\nGUARDRAIL FAILURES:');
    for (const f of fail) console.error('  ✗ ' + f);
    process.exit(1);
  }
  console.log('\nGUARDRAIL OK — function footprints within measured baselines.');
}
