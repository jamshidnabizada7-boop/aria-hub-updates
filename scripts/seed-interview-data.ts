/**
 * Seed InterviewCategory + InterviewQuestion tables with fully trilingual
 * (en/fa/ps) starter content for the interview-prep suite.
 *
 * Idempotent: categories upserted by slug; questions matched by (categoryId,
 * English question text) — existing rows get their i18n fields refreshed,
 * new rows created.
 *
 * Usage:
 *   bun run scripts/seed-interview-data.ts            # seed
 *   bun run scripts/seed-interview-data.ts --verify   # verify only
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { SEED_CATEGORIES, SEED_QUESTIONS_PART1 } from './interview-seed-data-1';
import { SEED_QUESTIONS_PART2 } from './interview-seed-data-2';

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
const verifyOnly = process.argv.includes('--verify');

const QUESTIONS = [...SEED_QUESTIONS_PART1, ...SEED_QUESTIONS_PART2];

async function verify() {
  const cats = await db.interviewCategory.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { order: 'asc' },
  });
  console.log('\n=== Interview content verification ===');
  for (const c of cats) {
    console.log(`  ${c.slug} — ${c.name} — ${c._count.questions} questions`);
  }
  const questions = await db.interviewQuestion.findMany({
    include: { category: true },
  });
  let incomplete = 0;
  for (const q of questions) {
    const qI = q.questionI18n as Record<string, string> | null;
    const saI = q.sampleAnswerI18n as Record<string, string> | null;
    const cmI = q.commonMistakesI18n as Record<string, string[]> | null;
    const ok =
      qI?.fa && qI?.ps && saI?.fa && saI?.ps && cmI?.fa?.length && cmI?.ps?.length;
    if (!ok) {
      incomplete++;
      console.log(`  ⚠ INCOMPLETE i18n: [${q.category?.slug}] ${q.question.slice(0, 50)}...`);
    }
  }
  console.log(
    `\nTotals: ${cats.length} categories, ${questions.length} questions, ${incomplete} incomplete`
  );
  if (verifyOnly && (cats.length === 0 || incomplete > 0)) process.exitCode = 1;
}

async function seed() {
  console.log(`Seeding ${SEED_CATEGORIES.length} categories, ${QUESTIONS.length} questions...`);

  const slugToId = new Map<string, string>();
  for (const cat of SEED_CATEGORIES) {
    const row = await db.interviewCategory.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: cat.name.en,
        nameI18n: cat.name,
        description: cat.description.en,
        descriptionI18n: cat.description,
        icon: cat.icon,
        order: cat.order,
      },
      update: {
        name: cat.name.en,
        nameI18n: cat.name,
        description: cat.description.en,
        descriptionI18n: cat.description,
        icon: cat.icon,
        order: cat.order,
      },
    });
    slugToId.set(cat.slug, row.id);
    console.log(`  ✓ category ${cat.slug}`);
  }

  let created = 0, updated = 0;
  const perCategory = new Map<string, number>();
  for (const q of QUESTIONS) {
    const categoryId = slugToId.get(q.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${q.categorySlug}`);
    const order = perCategory.get(q.categorySlug) ?? 0;
    perCategory.set(q.categorySlug, order + 1);

    const existing = await db.interviewQuestion.findFirst({
      where: { categoryId, question: q.question.en },
    });

    const payload = {
      question: q.question.en,
      questionI18n: q.question,
      difficulty: q.difficulty,
      sampleAnswer: q.sampleAnswer.en,
      sampleAnswerI18n: q.sampleAnswer,
      strongExample: q.strongExample.en,
      strongExampleI18n: q.strongExample,
      weakExample: q.weakExample.en,
      weakExampleI18n: q.weakExample,
      tips: q.tips.en,
      tipsI18n: q.tips,
      commonMistakes: q.commonMistakes.en,
      commonMistakesI18n: q.commonMistakes,
      followUpQuestions: q.followUps.en,
      followUpQuestionsI18n: q.followUps,
      expectedDuration: q.expectedDuration,
      status: 'published',
      order,
    };

    if (existing) {
      await db.interviewQuestion.update({ where: { id: existing.id }, data: payload });
      updated++;
    } else {
      await db.interviewQuestion.create({ data: { ...payload, categoryId } });
      created++;
    }
  }
  console.log(`\nQuestions: ${created} created, ${updated} updated`);
  await verify();
}

const mode = verifyOnly ? verify : seed;
mode()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
