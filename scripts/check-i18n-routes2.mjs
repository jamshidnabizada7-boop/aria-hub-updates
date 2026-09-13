// Sequential scan, key pages only, resumable output
const routes = ['', 'opportunities', 'about', 'services', 'visas', 'contact', 'deadlines', 'cv-builder'];
function ratioOf(text) {
  const arabic = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const total = arabic + latin;
  return total ? arabic / total : -1;
}
const extract = (html) => html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z]+;|&#\d+;/gi,' ');
for (const lang of ['fa', 'ps']) {
  for (const r of routes) {
    const url = `http://localhost:3000/${lang}${r ? '/' + r : ''}`;
    const label = `/${lang}/${r}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(110000) });
      const ratio = ratioOf(extract(await res.text()));
      const flag = res.status === 200 && ratio >= 0 && ratio < 0.5 ? '  ⚠️ LOW' : '';
      console.log(`${label.padEnd(20)} ${res.status}  ar ${(ratio*100).toFixed(0)}%${flag}`);
    } catch (e) { console.log(`${label.padEnd(20)} ERR ${String(e.message).slice(0,60)}`); }
  }
}
console.log('SCAN-DONE');
