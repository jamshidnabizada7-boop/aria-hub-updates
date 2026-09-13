// usage: node scripts/scan-batch.mjs fa track success-stories employers blog
const [lang, ...routes] = process.argv.slice(2);
for (const r of routes) {
  const url = `http://localhost:3000/${lang}${r ? '/' + r : ''}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(110000) });
    const html = await res.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z]+;|&#\d+;/gi,' ');
    const ar = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    const la = (text.match(/[A-Za-z]/g) || []).length;
    const ratio = ar + la ? ar / (ar + la) : -1;
    console.log(`/${lang}/${r.padEnd(20)} ${res.status}  ar ${(ratio*100).toFixed(0)}%${res.status === 200 && ratio >= 0 && ratio < 0.5 ? '  ⚠️ LOW' : ''}`);
  } catch (e) { console.log(`/${lang}/${r.padEnd(20)} ERR ${String(e.message).slice(0,50)}`); }
}
