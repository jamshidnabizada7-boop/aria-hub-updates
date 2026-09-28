import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const width = 1200;
const height = 630;

const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c14"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#0a1122"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="50%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
    <linearGradient id="border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.1"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="30" y="30" width="${width - 60}" height="${height - 60}" rx="24" fill="none" stroke="url(#border)" stroke-width="2"/>

  <rect x="80" y="80" width="280" height="44" rx="22" fill="#0284c7" fill-opacity="0.15" stroke="#38bdf8" stroke-opacity="0.3" stroke-width="1.5"/>
  <text x="220" y="108" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#38bdf8" text-anchor="middle">AFGHANISTAN OPPORTUNITIES</text>

  <text x="80" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="76" font-weight="900" fill="#ffffff" letter-spacing="-1.5">ARIA <tspan fill="url(#accent)">HUB</tspan></text>

  <text x="80" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="700" fill="#e2e8f0">Jobs, Scholarships &amp; Opportunities</text>

  <text x="80" y="385" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#94a3b8">Discover verified global scholarships, fellowships, international employment</text>
  <text x="80" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#94a3b8">and visa pathways for Afghan youth and professionals.</text>

  <g transform="translate(80, 480)">
    <rect x="0" y="0" width="170" height="44" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="85" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#f8fafc" text-anchor="middle">Verified Jobs</text>

    <rect x="190" y="0" width="190" height="44" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="285" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#f8fafc" text-anchor="middle">Top Scholarships</text>

    <rect x="400" y="0" width="170" height="44" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="485" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#f8fafc" text-anchor="middle">Visa Guides</text>

    <rect x="590" y="0" width="220" height="44" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="700" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#f8fafc" text-anchor="middle">Dari · Pashto · English</text>
  </g>

  <text x="1110" y="575" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="#64748b" text-anchor="end">www.myariahub.com</text>
</svg>
`;

async function main() {
  const root = process.cwd();
  const outPath1 = path.join(root, 'public', 'og-image.png');
  const outPath2 = path.join(root, 'public', 'images', 'og-image.png');

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outPath1);

  fs.copyFileSync(outPath1, outPath2);
  console.log('og-image.png successfully generated at:', outPath1, 'and', outPath2);
}

main().catch(console.error);
