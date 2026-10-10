import { expect, test } from 'bun:test';
import type { PrismaClient } from '@prisma/client';
import { runAIPipeline } from '../src/lib/ai/pipeline';

test('bounded import keeps source content and queues full translation', async () => {
  const output = await runAIPipeline({
    title: 'Community Health Officer',
    description: 'Support community health visits and report findings to the clinic.',
    organization: 'Example Clinic',
    sourceUrl: 'https://example.org/jobs/community-health-officer',
    sourceName: 'Example source',
    sourceLanguage: 'en',
  }, { db: null as unknown as PrismaClient, knownCategorySlugs: ['jobs'] }, 'en', { skipEnrichment: true });

  expect(output.translationStatus).toBe('pending');
  expect(output.data.description).toContain('Support community health visits');
  expect(output.data.descriptionI18n).toEqual({ en: output.data.description });
  expect(output.data.titleI18n).toEqual({ en: 'Community Health Officer' });
});

test('provider-free import saves a complete overview independently of the SEO preview', async () => {
  const sentence = 'The selected officer supports community health services, trains volunteers and reports programme outcomes to the project team.';
  const output = await runAIPipeline({
    title: 'Community Health Officer', description: Array(8).fill(sentence).join(' '),
    requirements: 'Applicants need a relevant degree and three years of community health experience.',
    sourceUrl: 'https://example.org/jobs/community-health-officer', sourceName: 'Example source',
  }, { db: null as unknown as PrismaClient, knownCategorySlugs: [] }, 'en', { skipEnrichment: true });
  expect((output.data.aiSummary as string).length).toBeGreaterThan(155);
  expect(output.data.aiSummary).toContain('Applicants need');
  expect(output.data.aiSummary).not.toMatch(/(?:\.{3}|…)$/);
  expect((output.data.aiSummaryI18n as { en: string }).en).toBe(output.data.aiSummary as string);
  expect((output.data.seoDescription as string).length).toBeLessThanOrEqual(158);
});
