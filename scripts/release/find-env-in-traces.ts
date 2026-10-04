import fs from 'node:fs';
import path from 'node:path';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const nfts = walk('.next/server/app').filter(f => f.endsWith('.nft.json'));
let found = 0;
for (const n of nfts) {
  const j = JSON.parse(fs.readFileSync(n, 'utf8'));
  const hits = j.files.filter(f => /(^|\/|\\)\.env($|\.|\\)|(^|\\|\/)\.env$/.test(f));
  if (hits.length) {
    found++;
    console.log(n.replace(/\\/g, '/'), '→', hits.join(', '));
  }
}
if (!found) console.log('no .env files found in traces (the earlier hit was likely ".env.production.local"-style name match inside chromium/prisma)?');
