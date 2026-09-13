import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = '/home/z/my-project/public/images';

const jobs: { prompt: string; file: string; size: string }[] = [
  { file: 'hero/hero-bg.png', size: '1344x768', prompt: 'Ultra premium abstract corporate background, deep navy blue to electric blue gradient mesh, flowing silk-like waves, soft glowing particles, glassmorphism light refractions, luxurious fintech aesthetic, dark elegant, cinematic depth, 8k render, no text' },
  { file: 'logo-mark.png', size: '1024x1024', prompt: 'Minimalist geometric letter A logo mark, gradient blue to cyan, premium tech brand, glassmorphism, on transparent dark background, ultra clean, no extra text' },
  { file: 'hero/hero-globe.png', size: '1024x1024', prompt: 'Glowing 3D holographic globe with interconnected network nodes and flight paths, corporate blue and cyan, dark transparent background, premium tech aesthetic, glass material, soft glow, ultra detailed render' },
  { file: 'services/business.png', size: '1024x1024', prompt: 'Premium 3D isometric illustration of business consultation, sleek modern office, glass desk with holographic charts, corporate blue palette, soft shadows, luxury minimal, no text' },
  { file: 'services/legal.png', size: '1024x1024', prompt: 'Elegant 3D illustration of legal services, golden scales of justice with blue gradient backdrop, glassmorphism, premium corporate, soft studio lighting, no text' },
  { file: 'services/travel.png', size: '1024x1024', prompt: 'Premium 3D illustration of travel and passport services, stylized passport with boarding pass and airplane, corporate blue gradient, glassmorphism, luxury minimal, no text' },
  { file: 'services/translation.png', size: '1024x1024', prompt: 'Premium 3D illustration of translation services, floating language characters and speech bubbles, corporate blue gradient, glassmorphism, luxury minimal, no text' },
  { file: 'services/consulting.png', size: '1024x1024', prompt: 'Premium 3D illustration of strategic consulting, chess king piece with growth chart, corporate blue gradient, glassmorphism, luxury minimal, no text' },
  { file: 'services/finance.png', size: '1024x1024', prompt: 'Premium 3D illustration of financial services, golden coins and growth arrow with bank building, corporate blue gradient, glassmorphism, luxury minimal, no text' },
  { file: 'visas/usa.png', size: '1344x768', prompt: 'Iconic New York skyline with Statue of Liberty silhouette at golden hour, premium cinematic travel photography, warm tones, ultra detailed, no text' },
  { file: 'visas/canada.png', size: '1344x768', prompt: 'Canadian rocky mountains with turquoise lake and autumn forest, premium cinematic travel photography, ultra detailed, no text' },
  { file: 'visas/uk.png', size: '1344x768', prompt: 'London skyline with Big Ben and Tower Bridge at blue hour, premium cinematic travel photography, ultra detailed, no text' },
  { file: 'visas/australia.png', size: '1344x768', prompt: 'Sydney opera house and harbour bridge at sunset, premium cinematic travel photography, ultra detailed, no text' },
  { file: 'visas/germany.png', size: '1344x768', prompt: 'Neuschwanstein castle in Bavarian alps with autumn forest, premium cinematic travel photography, ultra detailed, no text' },
  { file: 'visas/uae.png', size: '1344x768', prompt: 'Dubai marina skyline with Burj Khalifa at dusk, premium cinematic travel photography, ultra detailed, no text' },
  { file: 'gallery/g1.png', size: '1344x768', prompt: 'Modern corporate office interior with glass walls and city view, premium architectural photography, warm natural light, ultra detailed' },
  { file: 'gallery/g2.png', size: '1344x768', prompt: 'Diverse professional business team meeting around glass table, premium corporate photography, natural light, candid, ultra detailed' },
  { file: 'gallery/g3.png', size: '1344x768', prompt: 'Business handshake close-up with soft bokeh background, premium corporate photography, warm tones, ultra detailed' },
  { file: 'gallery/g4.png', size: '1344x768', prompt: 'Graduation ceremony celebration with diverse students, premium photography, joyful, natural light, ultra detailed' },
  { file: 'gallery/g5.png', size: '1344x768', prompt: 'Modern airport departure hall with travelers, premium architectural photography, blue hour light, ultra detailed' },
  { file: 'gallery/g6.png', size: '1344x768', prompt: 'International conference keynote stage with large screen and audience, premium event photography, dramatic lighting, ultra detailed' },
  { file: 'news/n1.png', size: '1344x768', prompt: 'Abstract data visualization with glowing blue network connections and charts, premium tech illustration, dark background, ultra detailed' },
  { file: 'news/n2.png', size: '1344x768', prompt: 'Premium illustration of global mobility and immigration concept, passport stamps and world map, blue gradient, ultra detailed' },
  { file: 'news/n3.png', size: '1344x768', prompt: 'Premium illustration of education scholarship concept, graduation cap on stack of books with soft glow, blue gradient, ultra detailed' },
  { file: 'avatars/a1.png', size: '1024x1024', prompt: 'Professional headshot portrait of confident middle eastern businessman in navy suit, neutral studio background, premium photography, ultra detailed' },
  { file: 'avatars/a2.png', size: '1024x1024', prompt: 'Professional headshot portrait of confident south asian businesswoman in elegant blazer, neutral studio background, premium photography, ultra detailed' },
  { file: 'avatars/a3.png', size: '1024x1024', prompt: 'Professional headshot portrait of confident european businessman with glasses, navy blazer, neutral studio background, premium photography, ultra detailed' },
  { file: 'avatars/a4.png', size: '1024x1024', prompt: 'Professional headshot portrait of confident middle eastern businesswoman in elegant hijab, neutral studio background, premium photography, ultra detailed' },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function genWithRetry(zai: any, prompt: string, size: string, retries = 8) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await zai.images.generations.create({ prompt, size });
      return res.data[0].base64;
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('429') || msg.includes('Too many')) {
        const wait = 15000 * (attempt + 1);
        console.log(`  rate-limited (attempt ${attempt + 1}), waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  throw new Error('max retries exceeded');
}

async function main() {
  const zai = await ZAI.create();
  let done = 0;
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const outPath = path.join(OUT, job.file);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
      console.log(`[skip ${i + 1}/${jobs.length}] ${job.file}`);
      done++;
      continue;
    }
    try {
      const b64 = await genWithRetry(zai, job.prompt, job.size);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
      done++;
      console.log(`[ok ${done}/${jobs.length}] ${job.file}`);
    } catch (e: any) {
      console.error(`[fail] ${job.file}: ${e.message}`);
    }
    await sleep(10000);
  }
  console.log('ALL DONE', done);
}
main().catch(e => { console.error(e); process.exit(1); });
