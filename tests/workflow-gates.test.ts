/**
 * PHASES 20/21/22 — schedule tiers, translation queue buckets, publication gates.
 */
import { describe, test, expect } from 'bun:test';

const { SCHEDULE_TIERS, tierForSource, evaluatePublicationGates, bucketTranslationQueue } =
  await import('../src/lib/import/workflow-gates');

describe('PHASE 20 — schedule tiers', () => {
  test('tiers follow the mandate policy by role/key', () => {
    expect(tierForSource({ sourceRole: 'official_feed' }).tier).toBe('P0_BREAKING_FEEDS');
    expect(tierForSource({ sourceRole: 'official_careers', type: 'job' }).tier).toBe('P1_OFFICIAL_ATS');
    expect(tierForSource({ sourceRole: 'official_feed', type: 'scholarship' }).tier).toBe('P1_SCHOLARSHIP_FEEDS');
    expect(tierForSource({ scraperKey: 'acbar' }).tier).toBe('AGGREGATORS_PRIMARY');
    expect(tierForSource({ scraperKey: 'wpApi', sourceRole: 'aggregator' }).tier).toBe('AGGREGATORS_SECONDARY');
    expect(tierForSource({ sourceRole: 'discovery' }).tier).toBe('LONG_TAIL');
    expect(SCHEDULE_TIERS.P0_BREAKING_FEEDS.minutes).toBe(10);
    expect(SCHEDULE_TIERS.AGGREGATORS_PRIMARY.minutes).toBe(45);
  });
});

describe('PHASE 22 — publication gates', () => {
  const base = {
    status: 'draft', deadline: new Date(Date.now() + 7 * 86400_000),
    applyUrl: 'mailto:jobs@x.org', applyUrlType: 'application_email',
    faStatus: 'complete', psStatus: 'complete',
    title: 'A valid title', description: 'A real description with content.',
    duplicateOf: null as string | null,
  };

  test('a fully prepared draft is READY', () => {
    const r = evaluatePublicationGates(base, true);
    expect(r.ready).toBe(true);
    expect(r.gates.every((g: any) => g.passed)).toBe(true);
  });

  test('each failing gate blocks and explains', () => {
    expect(evaluatePublicationGates({ ...base, faStatus: 'pending' }, true).ready).toBe(false);
    const expired = evaluatePublicationGates({ ...base, deadline: new Date(Date.now() - 5 * 86400_000) }, true);
    expect(expired.gates.find((g: any) => g.gate === 'deadline-sane')?.passed).toBe(false);
    const noApply = evaluatePublicationGates({ ...base, applyUrlType: 'source_article_fallback' }, true);
    expect(noApply.gates.find((g: any) => g.gate === 'apply-valid')?.passed).toBe(false);
  });

  test('translation gates bypassed when the source does not require translation', () => {
    const r = evaluatePublicationGates({ ...base, faStatus: null, psStatus: null }, false);
    expect(r.ready).toBe(true);
  });
});

describe('PHASE 21 — translation queue buckets', () => {
  test('buckets partition by fa/ps gate state with stale detection', () => {
    const rows = [
      { faStatus: 'complete', psStatus: 'complete', stale: false },
      { faStatus: 'pending', psStatus: null, stale: false },
      { faStatus: 'complete', psStatus: 'pending', stale: false },
      { faStatus: 'complete', psStatus: 'complete', stale: true },
    ];
    const b = bucketTranslationQueue(rows);
    expect(b.ready).toBe(1);
    expect(b.needsPersian).toBe(1);
    expect(b.needsPashto).toBe(1);
    expect(b.staleAfterSourceChange).toBe(1);
  });
});
