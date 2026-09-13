import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const IMG_DIR = '/home/z/my-project/public/images';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.png')) out.push(p);
  }
  return out;
}

async function main() {
  const files = walk(IMG_DIR);
  let fixed = 0;
  let skipped = 0;
  for (const f of files) {
    const buf = fs.readFileSync(f);
    const magic = buf.slice(0, 4).toString('hex');
    const isJpeg = magic === 'ffd8ffe0' || magic === 'ffd8ffe1';
    if (!isJpeg) {
      // already a real PNG (or other) — skip
      skipped++;
      continue;
    }
    // Re-encode as true PNG
    const out = await sharp(buf).png({ quality: 90 }).toBuffer();
    fs.writeFileSync(f, out);
    fixed++;
    console.log(`[fixed] ${path.relative(IMG_DIR, f)} (${buf.length} → ${out.length})`);
  }
  console.log(`\nDone. Fixed: ${fixed}, Skipped: ${skipped}, Total: ${files.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
