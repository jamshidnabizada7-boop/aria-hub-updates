import { describe, expect, test } from 'bun:test';
import { appendPostDetails, ARIA_WHATSAPP_CHANNEL, ARIA_WHATSAPP_CONTACT, opportunityLocation, postDetailLines } from '../src/lib/social/post-details';

describe('social post attachments', () => {
  test('uses verified opportunity location and never invents a specific place', () => {
    expect(opportunityLocation([{ city: 'Uncertain city', province: null, country: 'Afghanistan', confidence: 0.7 }], 'Afghanistan')).toBe('Afghanistan');
    expect(opportunityLocation([{ city: null, province: 'Paktia', country: 'Afghanistan', confidence: 1 }])).toBe('Paktia, Afghanistan');
    expect(opportunityLocation([], null)).toBe('');
  });
  test('localizes all three languages and links to the actual map query', () => {
    for (const lang of ['en', 'fa', 'ps'] as const) {
      const lines = postDetailLines('Balkh, Afghanistan', lang);
      expect(new URL(lines[1].match(/https:\/\/\S+/)![0]).searchParams.get('query')).toBe('Balkh, Afghanistan');
      expect(lines[2]).toContain(ARIA_WHATSAPP_CHANNEL);
      expect(lines[3]).toContain(ARIA_WHATSAPP_CONTACT);
    }
    expect(postDetailLines('', 'fa', true).join('\n')).not.toContain('maps');
  });
  test('keeps complete opportunity and WhatsApp links within platform budgets', () => {
    const primary = 'https://www.myariahub.com/fa/opportunities/example';
    const caption = `A real job\n\n${'Long description '.repeat(180)}\n\n🔗 ${primary}\n\n#Jobs`;
    const result = appendPostDetails(caption, postDetailLines('Paktia, Afghanistan', 'fa'), 1000);
    expect(result.length).toBeLessThanOrEqual(1000);
    expect(result).toContain(primary);
    expect(result).toContain(ARIA_WHATSAPP_CHANNEL);
    expect(result).toContain(ARIA_WHATSAPP_CONTACT);
    expect(result).toContain('query=Paktia%2C+Afghanistan');
  });
  test('reapplying attachments does not duplicate them', () => {
    const lines = postDetailLines('Balkh, Afghanistan', 'en');
    const first = appendPostDetails('Real campaign\n\n🔗 https://www.myariahub.com/en/discover/jobs-balkh', lines, 4500);
    expect(appendPostDetails(first, lines, 4500)).toBe(first);
  });
});
