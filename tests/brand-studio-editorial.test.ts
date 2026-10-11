import { describe, expect, test } from 'bun:test';
import {
  EDITORIAL_PILLARS, CREATIVE_RECIPES, editorialSimilarity,
  normalizeEditorialText, recipesForPillar, reviewEditorialDraft,
} from '../src/lib/social/editorial/strategy';

const draft = {
  pillar: 'career-skills' as const,
  title: 'Five important mistakes in your CV',
  note: 'Practical, original advice for students',
  caption: 'A detailed caption with a clear useful takeaway.',
  sourceUrl: '',
  consentConfirmed: false,
};

describe('Brand Studio original editorial planning', () => {
  test('covers more than opportunity and deadline announcements', () => {
    expect(EDITORIAL_PILLARS.length).toBeGreaterThanOrEqual(20);
    expect(EDITORIAL_PILLARS.some(x => x.id === 'student-humor')).toBe(true);
    expect(EDITORIAL_PILLARS.some(x => x.id === 'ai-tools')).toBe(true);
    for (const item of EDITORIAL_PILLARS) {
      expect(item.label.en.length).toBeGreaterThan(0);
      expect(item.label.fa.length).toBeGreaterThan(0);
      expect(item.label.ps.length).toBeGreaterThan(0);
      expect(recipesForPillar(item.id)).toHaveLength(3);
    }
    expect(new Set(CREATIVE_RECIPES.map(x => x.family)).size).toBeGreaterThan(4);
  });

  test('reviews ordinary manual drafts without requiring an irrelevant source', () => {
    expect(reviewEditorialDraft(draft).publishReady).toBe(true);
  });

  test('does not approve unsourced factual news or deadline content', () => {
    const failed = reviewEditorialDraft({ ...draft, pillar: 'verified-news' });
    expect(failed.publishReady).toBe(false);
    expect(failed.warnings.join(' ')).toContain('primary source');
    const success = reviewEditorialDraft({ ...draft, pillar: 'verified-news', sourceUrl: 'https://example.edu/official' });
    expect(success.publishReady).toBe(true);
  });

  test('does not approve real stories without consent', () => {
    expect(reviewEditorialDraft({ ...draft, pillar: 'real-stories' }).publishReady).toBe(false);
    expect(reviewEditorialDraft({ ...draft, pillar: 'real-stories', consentConfirmed: true }).publishReady).toBe(true);
  });

  test('normalizes Persian glyph variants and detects duplicates', () => {
    expect(normalizeEditorialText('كتاب يک')).toBe(normalizeEditorialText('کتاب یک'));
    expect(editorialSimilarity('Five important mistakes in your CV', 'Five important mistakes in your CV')).toBe(1);
    expect(reviewEditorialDraft(draft, ['Five important mistakes in your CV']).publishReady).toBe(false);
  });

  test('flags overlong and empty copy', () => {
    expect(reviewEditorialDraft({ ...draft, title: 'x'.repeat(116), caption: '' }).publishReady).toBe(false);
  });
});
