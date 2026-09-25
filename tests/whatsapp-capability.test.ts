import { describe, expect, test } from 'bun:test';
import { resolveWhatsAppMode } from '../src/lib/social/channels';

describe('WhatsApp destination modes', () => {
  test('uses an explicit destination mode', () => {
    expect(resolveWhatsAppMode({ mode: 'individual' })).toBe('individual');
    expect(resolveWhatsAppMode({ mode: 'group' })).toBe('group');
    expect(resolveWhatsAppMode({ mode: 'channel' })).toBe('channel');
  });

  test('recognizes old channelId-only configuration as legacy channel mode', () => {
    expect(resolveWhatsAppMode({ channelId: 'legacy-channel-id' })).toBe('channel');
  });

  test('recognizes groupId configuration as group mode', () => {
    expect(resolveWhatsAppMode({ groupId: 'group-123' })).toBe('group');
  });

  test('defaults new configuration to individual messaging', () => {
    expect(resolveWhatsAppMode({})).toBe('individual');
  });
});
