/**
 * Backfill — AI summaries + Dari/Pashto translations + apply-link extraction
 * + expired-status marking for ALL existing Opportunity rows.
 *
 * Resumable: only processes rows whose titleI18n is missing 'fa' or 'ps',
 * or whose aiSummary is missing/short (pre-pipeline truncation).
 *
 * Usage:
 *   bun run scripts/backfill-translate.ts                # everything pending
 *   bun run scripts/backfill-translate.ts --limit=20     # cap rows this run
 *   bun run scripts/backfill-translate.ts --only=links   # only apply-link pass
 *   bun run scripts/backfill-translate.ts --only=expire  # only expired pass
 *
 * Flags:
 *   --limit=<n>    max rows to translate this run (default: all)
 *   --only=<mode>  links | expire | translate (default: all passes)
 *   --force        re-translate rows even if fa/ps already present
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const here = fileURLToPath(new URL('.', import.meta.url));

function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || '';
  if (envUrl.startsWith('postgres')) return envUrl;
  try {
    const raw = readFileSync(join(here, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (v.startsWith('postgres')) return v;
    }
  } catch { /* fallthrough */ }
  throw new Error('No PostgreSQL DATABASE_URL found');
}

const db = new PrismaClient({ datasources: { db: { url: resolveDatabaseUrl() } } });

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
};
const limit = flag('limit') ? parseInt(flag('limit')!, 10) : Infinity;
const only = flag('only');
const force = args.includes('--force');

// ─── AI setup (mirrors src/lib/ai/pipeline.ts prompt) ────────────────────────

import ZAI from 'z-ai-web-dev-sdk';

const ENRICH_SYSTEM = `You are an editor and translator for ARIA HUB, an Afghan opportunities portal (jobs, scholarships, internships).
Given a scraped job/scholarship posting, respond ONLY with strict JSON:
{
  "summary_en": "<120-180 word summary in English: what the role/program is, the organization, location, top 3 requirements, salary if stated, and how to apply. Skip company boilerplate and legal disclaimers. Plain text, no markdown headings.>",
  "title_fa": "<Dari/Persian translation of the title, natural and fluent, RTL script. Keep org names like UNICEF/WHO transliterated or as-is>",
  "summary_fa": "<Dari/Persian translation of summary_en, natural fluent professional tone, ~120 words, RTL script. Keep URLs, emails, dates, org names, and technical terms (TOEFL, IELTS) as-is>",
  "title_ps": "<Pashto translation of the title, natural and fluent, RTL script>",
  "summary_ps": "<Pashto translation of summary_en, natural fluent professional tone, ~120 words, RTL script. Keep URLs, emails, dates, org names, technical terms as-is>",
  "category": "<one of: jobs, scholarships, internships, competitions, conferences, volunteer, exchange-programs, training>"
}
Rules: never invent facts not present in the posting; if salary/deadline missing, omit them; if the posting is a scholarship use scholarship wording, if a job use job wording.`;

interface Enrichment {
  summary_en?: string;
  title_fa?: string;
  summary_fa?: string;
  title_ps?: string;
  summary_ps?: string;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function buildPrompt(row: {
  title: string; organization?: string | null; country?: string | null;
  deadline?: Date | null; jobType?: string | null; salary?: string | null;
  educationReq?: string | null; experience?: string | null;
  description?: string | null; requirements?: string | null; guidelines?: string | null;
}): string {
  const parts: string[] = [`TITLE: ${row.title}`];
  if (row.organization) parts.push(`ORGANIZATION: ${row.organization}`);
  if (row.country) parts.push(`LOCATION: ${row.country}`);
  if (row.deadline) parts.push(`DEADLINE: ${row.deadline.toISOString().slice(0, 10)}`);
  if (row.jobType) parts.push(`TYPE: ${row.jobType}`);
  if (row.salary) parts.push(`SALARY: ${row.salary}`);
  if (row.educationReq) parts.push(`EDUCATION: ${stripHtml(row.educationReq).slice(0, 300)}`);
  if (row.experience) parts.push(`EXPERIENCE: ${stripHtml(row.experience).slice(0, 300)}`);
  const desc = stripHtml(row.description).slice(0, 5000);
  if (desc) parts.push(`DESCRIPTION:\n${desc}`);
  if (row.requirements) parts.push(`REQUIREMENTS:\n${stripHtml(row.requirements).slice(0, 1500)}`);
  if (row.guidelines) parts.push(`SUBMISSION GUIDELINES:\n${stripHtml(row.guidelines).slice(0, 800)}`);
  return parts.join('\n\n');
}

function parseEnrichment(raw: string): Enrichment | null {
  if (!raw) return null;
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Enrichment) : null;
  } catch {
    return null;
  }
}

// ─── Apply-link extraction (deterministic) ───────────────────────────────────

const NON_APPLY_EMAILS = ['webinfo@acbar.org', 'info@acbar.org', 'acbar.org', 'wazifaha.org', 'scholarships.af', 'o4af.com'];
const EXPLICIT_APPLY_URL_RE = /(?:apply|application|submit)[^\n]{0,80}(https?:\/\/[^\s)"'<>]+)/gi;

function extractApplyLink(row: { guidelines?: string | null; description?: string | null; requirements?: string | null }): string | null {
  const candidates: string[] = [];
  const haystacks = [row.guidelines || '', row.description || '', row.requirements || ''];
  for (const text of haystacks) {
    const emails = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) || [];
    for (const email of emails) {
      const lower = email.toLowerCase();
      if (NON_APPLY_EMAILS.some((bad) => lower.includes(bad))) continue;
      if (!candidates.includes(`mailto:${email}`)) candidates.push(`mailto:${email}`);
    }
    if (candidates.length) break;
  }
  for (const text of haystacks) {
    const forms = text.match(/https?:\/\/(?:forms\.|docs\.google\.com\/forms\/|survey)[^\s)"'<>]+/gi) || [];
    for (const url of forms) if (!candidates.includes(url)) candidates.push(url);
  }
  for (const text of haystacks) {
    EXPLICIT_APPLY_URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EXPLICIT_APPLY_URL_RE.exec(text)) !== null) {
      const url = m[1];
      if (!NON_APPLY_EMAILS.some((bad) => url.toLowerCase().includes(bad)) && !candidates.includes(url)) candidates.push(url);
    }
  }
  return candidates[0] || null;
}

// ─── Pass 1: apply links ─────────────────────────────────────────────────────

async function passApplyLinks(): Promise<void> {
  const missing = await db.opportunity.findMany({
    where: { applyUrl: null },
    select: { id: true, guidelines: true, description: true, requirements: true, sourceUrl: true },
  });
  console.log(`\n[links] ${missing.length} opportunities missing applyUrl`);
  let fixed = 0;
  for (const row of missing) {
    const link = extractApplyLink(row);
    if (link) {
      await db.opportunity.update({ where: { id: row.id }, data: { applyUrl: link } });
      fixed++;
    }
  }
  console.log(`[links] filled ${fixed}/${missing.length} apply links`);
}

// ─── Pass 2: mark expired ────────────────────────────────────────────────────

async function passMarkExpired(): Promise<void> {
  const now = new Date();
  const expired = await db.opportunity.updateMany({
    where: { status: 'published', deadline: { lt: now } },
    data: { status: 'expired' },
  });
  console.log(`\n[expire] marked ${expired.count} opportunities as expired (deadline in the past)`);
}

// ─── Pass 3: translate + summarize ───────────────────────────────────────────

async function passTranslate(): Promise<void> {
  const where = force
    ? { status: { in: ['published', 'expired'] as string[] } }
    : {
        OR: [
          { titleI18n: { path: ['fa'], equals: null } },
          { titleI18n: { path: ['fa'], equals: '' } },
          { aiSummary: null },
        ],
      };
  // Prisma JSON path filters: simpler to fetch all and filter in JS
  const all = await db.opportunity.findMany({
    where: { status: { in: ['published', 'expired'] } },
    select: {
      id: true, title: true, organization: true, country: true, deadline: true, jobType: true,
      salary: true, educationReq: true, experience: true, description: true, requirements: true,
      guidelines: true, titleI18n: true, aiSummary: true, language: true, createdAt: true,
    },
  });
  const pending = all.filter((r) => {
    if (force) return true;
    const i18n = (r.titleI18n ?? {}) as Record<string, string>;
    const needsFa = !i18n.fa || !i18n.fa.trim();
    const needsPs = !i18n.ps || !i18n.ps.trim();
    const needsSummary = !r.aiSummary || r.aiSummary.length < 200;
    return needsFa || needsPs || needsSummary;
  });
  // Prioritize ACTIVE opportunities (published + not yet expired) — they are
  // what visitors see; expired ones are backfilled afterwards.
  const now = Date.now();
  const rank = (r: { status: string; deadline: Date | null }): number => {
    const expired = r.status === 'expired' || (r.deadline ? r.deadline.getTime() < now : false);
    return expired ? 1 : 0;
  };
  pending.sort((a, b) => rank(a) - rank(b) || b.createdAt.getTime() - a.createdAt.getTime());
  const todo = pending.slice(0, limit);
  console.log(`\n[translate] ${all.length} total, ${pending.length} pending, ${todo.length} this run`);

  const zai = await ZAI.create();
  let ok = 0, failed = 0;

  /** Call the LLM with retry + backoff on rate limits (429). */
  async function chatWithRetry(system: string, user: string, attempts = 4): Promise<string> {
    let lastErr: unknown;
    for (let a = 0; a < attempts; a++) {
      try {
        const res = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        });
        return (res as any).choices?.[0]?.message?.content || '';
      } catch (e) {
        lastErr = e;
        const msg = (e as Error).message || '';
        const is429 = msg.includes('429') || msg.toLowerCase().includes('too many');
        if (is429 && a < attempts - 1) {
          // Exponential-ish backoff: 20s, 40s, 80s
          const wait = 20000 * Math.pow(2, a);
          console.log(`      (429 rate-limited, waiting ${wait / 1000}s before retry ${a + 2}/${attempts})`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  }

  for (const [idx, row] of todo.entries()) {
    const progress = `[${idx + 1}/${todo.length}]`;
    try {
      const user = buildPrompt(row);
      // Gentle pacing to stay under the rate limit (~4s between calls)
      if (idx > 0) await new Promise((r) => setTimeout(r, 4000));
      const raw = await chatWithRetry(ENRICH_SYSTEM, user);
      const parsed = parseEnrichment(raw);
      if (!parsed || !parsed.summary_en || !parsed.title_fa || !parsed.title_ps) {
        console.log(`${progress} ✗ unparseable response for "${row.title.slice(0, 60)}"`);
        failed++;
        continue;
      }

      const baseLang = row.language || 'en';
      const titleI18n: Record<string, string> = {
        [baseLang]: row.title,
        en: row.title,
        fa: parsed.title_fa,
        ps: parsed.title_ps,
      };
      const summaryI18n: Record<string, string> = {
        [baseLang]: parsed.summary_en,
        en: parsed.summary_en,
        fa: parsed.summary_fa || parsed.summary_en,
        ps: parsed.summary_ps || parsed.summary_en,
      };

      await db.opportunity.update({
        where: { id: row.id },
        data: {
          aiSummary: parsed.summary_en,
          aiSummaryI18n: summaryI18n,
          titleI18n,
          seoTitleI18n: titleI18n,
          seoDescriptionI18n: Object.fromEntries(
            Object.entries(summaryI18n).map(([k, v]) => [k, v.slice(0, 155)])
          ),
          ogTitleI18n: titleI18n,
          ogDescriptionI18n: Object.fromEntries(
            Object.entries(summaryI18n).map(([k, v]) => [k, v.slice(0, 155)])
          ),
          translationStatus: 'complete',
        },
      });
      ok++;
      if ((idx + 1) % 10 === 0 || idx === todo.length - 1) {
        console.log(`${progress} ✓ ok=${ok} failed=${failed} | "${row.title.slice(0, 50)}" → ${parsed.title_fa.slice(0, 30)}…`);
      }
    } catch (e) {
      failed++;
      console.log(`${progress} ✗ error: ${(e as Error).message.slice(0, 120)} — "${row.title.slice(0, 50)}"`);
    }
  }
  console.log(`\n[translate] DONE ok=${ok} failed=${failed}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('ARIA HUB backfill — summaries, translations, apply links, expiry');
  if (!only || only === 'links') await passApplyLinks();
  if (!only || only === 'expire') await passMarkExpired();
  if (!only || only === 'translate') await passTranslate();
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => db.$disconnect());
