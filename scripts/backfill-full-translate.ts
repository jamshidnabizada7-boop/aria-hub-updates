/**
 * Backfill #2 — full trilingual content for EXISTING Opportunity rows.
 *
 * Pass 1 (cleanup): re-apply theme-junk stripping + duplicated-leading-title
 *   removal to the BASE (English) content fields — the DB then only holds
 *   display-ready content.
 * Pass 2 (translate): for every record whose descriptionI18n lacks fa/ps,
 *   translate title + description + all sections into Dari + Pashto with ONE
 *   LLM call per record, then persist into every *I18n field.
 *
 * Active (published, unexpired) records are processed first — they are what
 * visitors actually see.
 *
 * Usage:
 *   bun run scripts/backfill-full-translate.ts --limit=10
 *   bun run scripts/backfill-full-translate.ts --only=cleanup
 *   bun run scripts/backfill-full-translate.ts --only=translate
 *   bun run scripts/backfill-full-translate.ts --force   # re-translate even complete rows
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import ZAI from 'z-ai-web-dev-sdk';
import { stripHtml, stripThemeBoilerplate, cleanTitleJunk } from '../src/lib/import/utils';
import { removeLeadingTitle } from '../src/lib/content-html';
import {
  translateSections,
  type SectionInput,
  type SectionTranslations,
} from '../src/lib/ai/pipeline';

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

// ─── Pass 1: base-content cleanup ────────────────────────────────────────────

const SECTION_COLUMNS = [
  'description', 'eligibility', 'benefits', 'responsibilities',
  'requirements', 'guidelines', 'educationReq', 'experience',
] as const;

async function passCleanup(): Promise<void> {
  const rows = await db.opportunity.findMany({
    where: { status: { in: ['published', 'expired'] } },
    select: {
      id: true, title: true, titleI18n: true, description: true, eligibility: true, benefits: true,
      responsibilities: true, requirements: true, guidelines: true, educationReq: true,
      experience: true, salary: true, descriptionI18n: true, eligibilityI18n: true,
      benefitsI18n: true, responsibilitiesI18n: true, requirementsI18n: true,
      guidelinesI18n: true, educationReqI18n: true, experienceI18n: true, salaryI18n: true,
    },
  });
  console.log(`\n[cleanup] scanning ${rows.length} rows for junk + duplicated titles`);

  let touched = 0;
  let titlesFixed = 0;
  for (const row of rows) {
    const data: Record<string, unknown> = {};
    const title = cleanTitleJunk(row.title);
    if (title && title !== row.title) {
      data.title = title;
      titlesFixed++;
      // keep every language variant of the title clean too
      const ti = (row.titleI18n || {}) as Record<string, string>;
      const nextTi: Record<string, string> = {};
      let tiChanged = false;
      for (const [lang, v] of Object.entries(ti)) {
        const cleanedLang = lang === 'en' ? title : cleanTitleJunk(v);
        nextTi[lang] = cleanedLang;
        if (cleanedLang !== v) tiChanged = true;
      }
      if (tiChanged) {
        data.titleI18n = nextTi;
        data.seoTitleI18n = nextTi;
        data.ogTitleI18n = nextTi;
      }
    }

    const clean = (v: string | null): string | null => {
      if (!v) return null;
      const next = removeLeadingTitle(stripThemeBoilerplate(v), data.title as string || title);
      // Return the cleaned value even when it becomes '' (junk-only fields
      // must be blanked, not kept). null means "unchanged".
      return next !== v ? next : null;
    };

    for (const col of SECTION_COLUMNS) {
      const cleaned = clean(row[col]);
      if (cleaned !== null) data[col] = cleaned;
    }

    // Descriptions that are just the duplicated title carry no information —
    // blank them so the detail page drops the useless Overview section.
    const descNorm = (v: string): string => stripHtml(v).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const titleNorm = descNorm((data.title as string) || row.title);
    const effectiveDesc = (data.description as string) || row.description || '';
    if (effectiveDesc && titleNorm.length >= 12) {
      const descOnly = descNorm(effectiveDesc);
      if (descOnly === titleNorm || (descOnly.length <= titleNorm.length + 12 && descOnly.includes(titleNorm))) {
        data.description = '';
        const di = (row.descriptionI18n || {}) as Record<string, string>;
        if (Object.keys(di).length) data.descriptionI18n = Object.fromEntries(Object.entries(di).map(([l, v]) => [l, descNorm(v) === descOnly ? '' : v]));
      }
    }

    if (Object.keys(data).length === 0) continue;

    // Keep i18n "en" values consistent with the cleaned base fields
    for (const col of SECTION_COLUMNS) {
      if (!data[col]) continue;
      const i18nKey = `${col}I18n`;
      const current = (row as unknown as Record<string, unknown>)[i18nKey] as Record<string, string> | null;
      if (current && typeof current === 'object') {
        const next = { ...current };
        let changed = false;
        for (const lang of Object.keys(next)) {
          const before = next[lang];
          const cleanedLang = removeLeadingTitle(stripThemeBoilerplate(before), title);
          if (cleanedLang !== before) { next[lang] = cleanedLang; changed = true; }
        }
        if (changed) data[i18nKey] = JSON.stringify(next);
      }
    }

    await db.opportunity.update({ where: { id: row.id }, data: data as never });
    touched++;
  }
  console.log(`[cleanup] cleaned ${touched}/${rows.length} rows (${titlesFixed} titles fixed)`);
}

// ─── Pass 2: full trilingual translation ─────────────────────────────────────

function langs(j: unknown): string[] {
  if (!j || typeof j !== 'object') return [];
  return Object.entries(j as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'string' && (v as string).trim().length > 0)
    .map(([k]) => k);
}

function needsFullTranslation(row: {
  descriptionI18n: unknown; titleI18n: unknown; aiSummaryI18n: unknown;
}): boolean {
  if (force) return true;
  const d = langs(row.descriptionI18n);
  return !d.includes('fa') || !d.includes('ps');
}

async function passTranslate(zai: Awaited<ReturnType<typeof ZAI.create>>): Promise<void> {
  const rows = await db.opportunity.findMany({
    where: { status: { in: ['published', 'expired'] } },
    select: {
      id: true, slug: true, title: true, titleI18n: true, organization: true,
      description: true, descriptionI18n: true, eligibility: true, eligibilityI18n: true,
      benefits: true, benefitsI18n: true, responsibilities: true, responsibilitiesI18n: true,
      requirements: true, requirementsI18n: true, guidelines: true, guidelinesI18n: true,
      jobType: true, jobTypeI18n: true, salary: true, salaryI18n: true,
      educationReq: true, educationReqI18n: true, experience: true, experienceI18n: true,
      aiSummaryI18n: true, deadline: true, status: true, language: true, createdAt: true,
    },
  });

  const now = Date.now();
  const pending = rows
    .filter(needsFullTranslation)
    .sort((a, b) => {
      const expA = a.status === 'expired' || (a.deadline ? a.deadline.getTime() < now : false);
      const expB = b.status === 'expired' || (b.deadline ? b.deadline.getTime() < now : false);
      return (expA ? 1 : 0) - (expB ? 1 : 0) || b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, Number.isFinite(limit) ? limit : rows.length);

  console.log(`\n[translate] ${rows.length} rows, ${pending.length} pending full translation`);

  let ok = 0, failed = 0;

  const chat = async (system: string, user: string): Promise<string> => {
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

  for (const [idx, row] of pending.entries()) {
    const tag = `[${idx + 1}/${pending.length}]`;
    try {
      if (idx > 0) await new Promise((r) => setTimeout(r, 4000)); // pacing

      const sections: SectionInput = {
        title: row.title,
        description: row.description,
        eligibility: row.eligibility,
        benefits: row.benefits,
        responsibilities: row.responsibilities,
        requirements: row.requirements,
        guidelines: row.guidelines,
        jobType: row.jobType,
        salary: row.salary,
        educationReq: row.educationReq,
        experience: row.experience,
      };

      const t: SectionTranslations | null = await translateSections(sections, chat);
      if (!t) {
        console.log(`${tag} ✗ no usable translation — "${row.title.slice(0, 50)}"`);
        failed++;
        continue;
      }

      const baseLang = row.language || 'en';
      const data: Record<string, unknown> = {};

      // Merge each section's fa/ps into its *I18n map (never overwrite).
      const fill = (field: string, fa?: string, ps?: string, base?: string | null): void => {
        if (!fa && !ps) return;
        const current = ((row as unknown as Record<string, unknown>)[`${field}I18n`] || {}) as Record<string, string>;
        const next: Record<string, string> = { ...current };
        if (base && !next.en) next.en = base;
        if (base && baseLang !== 'en' && !next[baseLang]) next[baseLang] = base;
        if (fa && !next.fa) next.fa = fa;
        if (ps && !next.ps) next.ps = ps;
        data[`${field}I18n`] = next;
      };

      const baseOf = (col: string): string | null =>
        ((row as unknown as Record<string, unknown>)[col] as string | null) || null;

      fill('description', t.description_fa, t.description_ps, baseOf('description'));
      fill('eligibility', t.eligibility_fa, t.eligibility_ps, baseOf('eligibility'));
      fill('benefits', t.benefits_fa, t.benefits_ps, baseOf('benefits'));
      fill('responsibilities', t.responsibilities_fa, t.responsibilities_ps, baseOf('responsibilities'));
      fill('requirements', t.requirements_fa, t.requirements_ps, baseOf('requirements'));
      fill('guidelines', t.guidelines_fa, t.guidelines_ps, baseOf('guidelines'));
      fill('jobType', t.jobType_fa, t.jobType_ps, baseOf('jobType'));
      fill('salary', t.salary_fa, t.salary_ps, baseOf('salary'));
      fill('educationReq', t.educationReq_fa, t.educationReq_ps, baseOf('educationReq'));
      fill('experience', t.experience_fa, t.experience_ps, baseOf('experience'));

      // Title + SEO mirrors
      const titleI18n = { ...((row.titleI18n || {}) as Record<string, string>) };
      if (t.title_fa && !titleI18n.fa) titleI18n.fa = t.title_fa;
      if (t.title_ps && !titleI18n.ps) titleI18n.ps = t.title_ps;
      if (!titleI18n.en) titleI18n.en = row.title;
      data.titleI18n = titleI18n;
      data.seoTitleI18n = { ...titleI18n };
      data.ogTitleI18n = { ...titleI18n };

      // If summaries were never translated, derive from the (now available) sections
      const summaryI18n = { ...((row.aiSummaryI18n || {}) as Record<string, string>) };
      if (!summaryI18n.fa && t.description_fa) summaryI18n.fa = stripHtml(t.description_fa).slice(0, 220);
      if (!summaryI18n.ps && t.description_ps) summaryI18n.ps = stripHtml(t.description_ps).slice(0, 220);
      data.aiSummaryI18n = summaryI18n;
      data.seoDescriptionI18n = Object.fromEntries(
        Object.entries(summaryI18n).map(([k, v]) => [k, stripHtml(v).slice(0, 155)]),
      );
      data.ogDescriptionI18n = data.seoDescriptionI18n;

      const descLangs = langs(data.descriptionI18n);
      data.translationStatus = descLangs.includes('fa') && descLangs.includes('ps') ? 'complete' : 'partial';

      await db.opportunity.update({ where: { id: row.id }, data: data as never });
      ok++;
      if ((idx + 1) % 5 === 0 || idx === pending.length - 1) {
        console.log(`${tag} ✓ ok=${ok} failed=${failed} | "${row.title.slice(0, 45)}"`);
      }
    } catch (e) {
      failed++;
      console.log(`${tag} ✗ ${(e as Error).message.slice(0, 100)} — "${row.title.slice(0, 45)}"`);
    }
  }

  console.log(`\n[translate] DONE ok=${ok} failed=${failed}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('ARIA HUB backfill #2 — junk cleanup + FULL trilingual bodies');
  if (!only || only === 'cleanup') await passCleanup();
  if (!only || only === 'translate') {
    const zai = await ZAI.create();
    await passTranslate(zai);
  }
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => db.$disconnect());
