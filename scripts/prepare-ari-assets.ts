/** Deterministic optimization only; artwork editing is done with built-in imagegen. */
import sharp from 'sharp';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = process.cwd();
const source = JSON.parse(await readFile(process.argv[2] || 'design/ari/asset-sources.json', 'utf8')) as { sources: Record<string, string> };
const master = join(root, 'design/ari/masters');
const web = join(root, 'public/images/ari');
await mkdir(master, { recursive: true }); await mkdir(web, { recursive: true });
const inventory: object[] = [];
// Classic already has the approved happy face and wave pose: aliases deliberately avoid drift.
source.sources.happy = source.sources.classic;
source.sources.waving = source.sources.classic;
for (const [name, path] of Object.entries(source.sources)) {
  const bytes = await readFile(path);
  const meta = await sharp(bytes).metadata();
  const stats = await sharp(bytes).stats();
  if (!meta.hasAlpha || stats.channels[3].min !== 0) throw Error(`${name}: genuine transparency required`);
  if (path.replaceAll('\\', '/') !== join(master, name + '.png').replaceAll('\\', '/') && !path.endsWith('masters/' + name + '.png')) await copyFile(path, join(master, name + '.png'));
  for (const size of [64, 128, 256, 512, 1024]) {
    await sharp(bytes).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: size < 256 ? 85 : 92, alphaQuality: 100, effort: 6 }).toFile(join(web, `${name}-${size}.webp`));
  }
  inventory.push({ name, width: meta.width, height: meta.height, alpha: true, master: `design/ari/masters/${name}.png` });
}
await sharp(join(master, 'minimal.png')).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(join(web, 'profile-avatar.png'));
// Light/dark contact sheet: real derivatives composited without changing artwork pixels.
const names = Object.keys(source.sources);
const cells = [];
for (let i = 0; i < names.length; i++) for (let dark = 0; dark < 2; dark++) {
  const x = (i % 4) * 320; const y = Math.floor(i / 4) * 560 + dark * 280;
  const bg = Buffer.from(`<svg width="320" height="280"><rect width="320" height="280" fill="${dark ? '#101b34' : '#f5f8ff'}"/><text x="160" y="262" text-anchor="middle" fill="${dark ? '#ffffff' : '#1b2440'}" font-size="18" font-family="sans-serif">${names[i]} · ${dark ? 'dark' : 'light'}</text></svg>`);
  cells.push({ input: bg, left: x, top: y });
  cells.push({ input: await sharp(join(web, names[i] + '-256.webp')).resize(230, 230).toBuffer(), left: x + 45, top: y + 10 });
}
await sharp({ create: { width: 1280, height: Math.ceil(names.length / 4) * 560, channels: 4, background: '#f5f8ff' } }).composite(cells).png().toFile(join(root, 'design/ari/contact-sheet.png'));
await writeFile(join(root, 'design/ari/inventory.json'), JSON.stringify({ method: 'Reference-derived imagegen edits; happy and waving use Classic master. Not original artist source.', assets: inventory }, null, 2) + '\n');
console.log(`Prepared ${names.length} transparent masters, optimized responsive assets and light/dark proof.`);
