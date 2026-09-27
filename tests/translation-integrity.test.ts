import { describe, expect, test } from 'bun:test';
import { chunkTranslationText } from '../src/lib/ai/translate-core';

describe('translation integrity chunking', () => {
  test('does not hard-truncate long opportunity content', () => {
    const source = Array.from({ length: 300 }, (_, i) =>
      'Requirement ' + (i + 1) + ': applicants must provide complete supporting documentation.'
    ).join('\n');
    const chunks = chunkTranslationText(source, 500);
    expect(chunks.length).toBeGreaterThan(1);
    const normalizedSource = source.replace(/\s+/g, ' ').trim();
    const normalizedChunks = chunks.join(' ').replace(/\s+/g, ' ').trim();
    expect(normalizedChunks).toBe(normalizedSource);
  });

  test('keeps short fields as one complete unit', () => {
    expect(chunkTranslationText('Bachelor degree required', 500)).toEqual(['Bachelor degree required']);
  });
});
