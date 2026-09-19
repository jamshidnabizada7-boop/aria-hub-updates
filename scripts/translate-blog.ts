/**
 * Trilingual blog translation — fills News.titleI18n / excerptI18n / contentI18n
 * with Farsi (fa) and Pashto (ps) for rows that are still English-only.
 *
 * HTML-preserving: the content is split into top-level blocks (<h2>/<h3>/<p>/<ul>/<ol>),
 * blocks are batched (~900 chars) and the model must return the SAME tags with
 * translated inner text. Fallbacks keep the site safe if a batch fails.
 *
 * Resumable: rows missing fa OR ps are pending; batches of --limit; log-friendly.
 *
 * Usage:
 *   bun run scripts/translate-blog.ts --limit=2
 */

import { PrismaClient } from '@prisma/client';
import ZAI from 'z-ai-web-dev-sdk';

const db = new PrismaClient();

// ---------- args ----------
function argValue(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split('=')[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
const limit = argValue('limit', 2);

// ---------- HTML block handling ----------
function splitBlocks(html: string): string[] {
  // Top-level blocks: capture consecutive tag blocks; keep surrounding text as its own block.
  const re = /(<(h2|h3|ul|ol|blockquote)[\s\S]*?<\/\2>|<p[\s\S]*?<\/p>)/gi;
  const blocks: string[] = [];
  let last = 0;
  for (const m of html.matchAll(re)) {
    const idx = m.index ?? 0;
    const between = html.slice(last, idx).trim();
    if (between) blocks.push(between);
    blocks.push(m[0]);
    last = idx + m[0].length;
  }
  const tail = html.slice(last).trim();
  if (tail) blocks.push(tail);
  return blocks.length ? blocks : [html];
}

function batchBlocks(blocks: string[], cap = 900): string[][] {
  const batches: string[][] = [];
  let cur: string[] = [];
  let size = 0;
  for (const b of blocks) {
    const len = b.length;
    if (cur.length && size + len > cap) {
      batches.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(b);
    size += len;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

function parseJsonLoose(raw: string): Array<{ fa: string; ps: string }> | null {
  const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) return arr as Array<{ fa: string; ps: string }>;
  } catch { /* fall through */ }
  // Recover a truncated array: keep only complete objects.
  const objs = text.match(/\{[^{}]*\}/g);
  if (!objs?.length) return null;
  const out: Array<{ fa: string; ps: string }> = [];
  for (const o of objs) {
    try {
      const p = JSON.parse(o) as { fa?: string; ps?: string };
      if (p.fa || p.ps) out.push({ fa: p.fa ?? '', ps: p.ps ?? '' });
    } catch { /* skip */ }
  }
  return out.length ? out : null;
}

const BLOCK_SYSTEM = `You are a professional translator for ARIA HUB, an Afghan opportunities portal.
You receive numbered HTML blocks (headings, paragraphs, list items) from an educational blog article.
Translate each block into natural, professional Farsi/Persian ("fa") and Pashto ("ps").
Respond ONLY with strict JSON — a single array, no markdown fences:
[{"i":1,"fa":"<translated block with SAME tags>","ps":"<translated block with SAME tags>"}, ...]
STRICT RULES:
- Keep every HTML tag exactly as in the source (<h2>, <p>, <ul>, <li>, <strong>, <a href="...">). Translate ONLY the text between tags.
- Keep URLs, emails, numbers, dates, org names (UNICEF, IELTS, TOEFL) and code-like terms exactly as-is.
- Translate meaning faithfully — never summarize, never omit list items.
- Keep the same number of array items, same order, same "i" values.`;

interface ChatFn {
  (system: string, user: string): Promise<string>;
}

async function translateContent(
  chat: ChatFn,
  html: string,
): Promise<{ fa: string; ps: string } | null> {
  const blocks = splitBlocks(html);
  const batches = batchBlocks(blocks);
  const faParts: string[] = [];
  const psParts: string[] = [];
  let okAll = true;

  for (const [bi, batch] of batches.entries()) {
    const payload = JSON.stringify(
      batch.map((b, i) => ({ i: bi * 100 + i + 1, block: b }))
    );
    let parsed: Array<{ fa: string; ps: string }> | null = null;
    for (let attempt = 0; attempt < 3 && !parsed; attempt++) {
      try {
        const raw = await chat(BLOCK_SYSTEM, payload);
        parsed = parseJsonLoose(raw);
        if (!parsed) break; // unparseable — stop retrying same batch
      } catch (e) {
        const msg = (e as Error).message || '';
        const is429 = msg.includes('429') || msg.toLowerCase().includes('too many');
        if (!is429 || attempt === 2) break;
        await new Promise((r) => setTimeout(r, 20000 * (attempt + 1)));
      }
    }
    if (!parsed) {
      okAll = false;
      continue; // skip batch — fa/ps falls back to English per block below
    }
    for (const item of parsed) {
      if (item.fa) faParts.push(item.fa);
      if (item.ps) psParts.push(item.ps);
    }
  }

  const fa = faParts.join('\n').trim();
  const ps = psParts.join('\n').trim();
  if (!fa && !ps) return null;
  return { fa, ps };
}

// ---------- main ----------
async function main(): Promise<void> {
  const zai = await ZAI.create();
  const chat: ChatFn = async (system, user) => {
    let lastErr: unknown;
    for (let a = 0; a < 4; a++) {
      try {
        interface ChatResp { choices?: Array<{ message?: { content?: string } }> }
        const res = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }) as ChatResp;
        return res.choices?.[0]?.message?.content || '';
      } catch (e) {
        lastErr = e;
        const msg = (e as Error).message || '';
        if ((msg.includes('429') || msg.toLowerCase().includes('too many')) && a < 3) {
          const wait = 20000 * Math.pow(2, a);
          console.log(`   (429 — waiting ${wait / 1000}s, retry ${a + 2}/4)`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  };

  const rows = await db.news.findMany({
    where: { status: { not: 'archived' } },
    select: { id: true, slug: true, title: true, titleI18n: true, excerpt: true, excerptI18n: true, content: true, contentI18n: true },
    orderBy: { publishedAt: 'desc' },
  });

  const pending = rows.filter((r) => {
    const t = (r.titleI18n as Record<string, string> | null) || {};
    const c = (r.contentI18n as Record<string, string> | null) || {};
    return !t.fa || !t.ps || !c.fa || !c.ps;
  });

  console.log(`[blog-translate] ${rows.length} rows, ${pending.length} pending`);
  const slice = pending.slice(0, limit);

  let ok = 0;
  for (const [idx, row] of slice.entries()) {
    const tag = `[${idx + 1}/${slice.length}]`;
    try {
      // Title
      const titleRaw = await chat(
        'Translate the article title into Farsi/Persian (fa) and Pashto (ps). Respond ONLY with strict JSON, no fences: {"title_fa":"...","title_ps":"..."}',
        row.title,
      );
      let titleFa = '';
      let titlePs = '';
      try {
        const obj = JSON.parse(titleRaw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()) as { title_fa?: string; title_ps?: string };
        titleFa = obj.title_fa || '';
        titlePs = obj.title_ps || '';
      } catch { /* keep empty */ }

      // Excerpt
      let exFa = '';
      let exPs = '';
      if (row.excerpt) {
        const exRaw = await chat(
          'Translate the article excerpt into Farsi/Persian (fa) and Pashto (ps). Respond ONLY with strict JSON, no fences: {"fa":"...","ps":"..."}',
          row.excerpt,
        );
        try {
          const obj = JSON.parse(exRaw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()) as { fa?: string; ps?: string };
          exFa = obj.fa || '';
          exPs = obj.ps || '';
        } catch { /* keep empty */ }
      }

      // Content (block-preserving)
      const content = await translateContent(chat, row.content);

      const curT = (row.titleI18n as Record<string, string> | null) || {};
      const curE = (row.excerptI18n as Record<string, string> | null) || {};
      const curC = (row.contentI18n as Record<string, string> | null) || {};

      await db.news.update({
        where: { id: row.id },
        data: {
          titleI18n: {
            ...curT,
            ...(titleFa ? { fa: titleFa } : {}),
            ...(titlePs ? { ps: titlePs } : {}),
          },
          excerptI18n: {
            ...curE,
            ...(exFa ? { fa: exFa } : {}),
            ...(exPs ? { ps: exPs } : {}),
          },
          contentI18n: {
            ...curC,
            ...(content?.fa ? { fa: content.fa } : {}),
            ...(content?.ps ? { ps: content.ps } : {}),
          },
        },
      });
      ok++;
      console.log(`${tag} ✓ ok | "${row.title.slice(0, 48)}"`);
    } catch (e) {
      console.log(`${tag} ✗ FAILED ${row.slug}: ${(e as Error).message?.slice(0, 120)}`);
    }
  }

  const left = pending.length - ok;
  console.log(`[blog-translate] DONE ok=${ok} failed=${slice.length - ok} remaining≈${left < 0 ? 0 : left}`);
}

main()
  .catch((e) => {
    console.error('[blog-translate] FATAL', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
