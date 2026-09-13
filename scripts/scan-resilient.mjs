// Resilient per-route scanner: waits for server revival after OOM kills.
const routes = process.argv.slice(2);
async function waitUp(maxMs = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const r = await fetch('http://localhost:3000/en', { signal: AbortSignal.timeout(20000) });
      if (r.status === 200) return true;
    } catch { /* down */ }
    await new Promise(r => setTimeout(r, 5000));
  }
  return false;
}
for (const full of routes) {
  const ok = await waitUp();
  if (!ok) { console.log(`${full}  SERVER-DOWN`); continue; }
  try {
    const res = await fetch(`http://localhost:3000${full}`, { signal: AbortSignal.timeout(110000) });
    const html = await res.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z]+;|&#\d+;/gi,' ');
    const ar = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    const la = (text.match(/[A-Za-z]/g) || []).length;
    const ratio = ar + la ? ar / (ar + la) : -1;
    console.log(`${full.padEnd(26)} ${res.status}  ar ${(ratio*100).toFixed(0)}%${res.status === 200 && ratio >= 0 && ratio < 0.5 ? '  ⚠️ LOW' : ''}`);
  } catch (e) { console.log(`${full.padEnd(26)} ERR ${String(e.message).slice(0,50)}`); }
}
console.log('BATCH-DONE');
