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
