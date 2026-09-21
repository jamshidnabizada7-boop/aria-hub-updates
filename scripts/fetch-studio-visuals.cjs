/** Download visuals from upload.wikimedia.org using MD5-hash paths (no API host). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LIST = `flag-romania.jpg|Flag_of_Romania.svg
flag-usa.jpg|Flag_of_the_United_States.svg
flag-germany.jpg|Flag_of_Germany.svg
flag-turkey.jpg|Flag_of_Turkey.svg
column-greek.jpg|The_Parthenon_in_Athens.jpg
statue-liberty.jpg|Statue_of_Liberty_7.jpg
statue-greek.jpg|Venus_de_Milo_Louvre_Ma399_n4.jpg
book-stack.jpg|Book.jpg
cap-graduation.jpg|Mortarboard.jpg`;

const UA = { 'User-Agent': 'AriaHubStudio/1.0 (contact: jamshidnabizada7@gmail.com)' };

function commonsUrls(filename, width) {
  const clean = filename.replace(/ /g, '_');
  const h = crypto.createHash('md5').update(clean).digest('hex');
  const dir = h[0] + '/' + h.slice(0, 2);
  const base = `https://upload.wikimedia.org/wikipedia/commons`;
  const isSvg = clean.toLowerCase().endsWith('.svg');
  const full = `${base}/${dir}/${encodeURIComponent(clean)}`;
  const thumb = isSvg
    ? `${base}/thumb/${dir}/${encodeURIComponent(clean)}/${width}px-${encodeURIComponent(clean)}.png`
    : `${base}/thumb/${dir}/${encodeURIComponent(clean)}/${width}px-${encodeURIComponent(clean)}`;
  return { full, thumb };
}

async function dl(url, target) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(90000), redirect: 'follow' });
  if (!r.ok) throw new Error('http ' + r.status);
  const b = Buffer.from(await r.arrayBuffer());
  if (b.length < 12000) throw new Error('too small ' + b.length);
  fs.writeFileSync(target, b);
  return b.length;
}

(async () => {
  const dir = path.resolve(process.cwd(), 'public', 'studio-visuals');
  fs.mkdirSync(dir, { recursive: true });
  let ok = 0;
  for (const line of LIST.split('\n')) {
    const [name, file] = line.trim().split('|');
    if (!name) continue;
    const target = path.join(dir, name);
    if (fs.existsSync(target) && fs.statSync(target).size > 12000) { ok++; console.log('HAVE', name); continue; }
    const { full, thumb } = commonsUrls(file, 1080);
    let size = null;
    for (const [label, url] of [['thumb', thumb], ['full', full]]) {
      try { size = await dl(url, target); console.log('OK', name, `(${label})`, ((size / 1024) | 0) + 'KB'); break; }
      catch (e) { console.log(`  ${label} fail:`, e.message); }
    }
    if (size) ok++;
    else console.log('SKIP', name);
  }
  console.log('total:', ok);
})();
