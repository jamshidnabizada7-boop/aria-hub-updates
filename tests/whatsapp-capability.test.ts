import { describe, expect, test } from 'bun:test';
import { resolveWhatsAppMode,checkPlatformConnection } from '../src/lib/social/channels';

describe('WhatsApp destination modes', () => {
  test('a reachable Meta Test Number does not prove production delivery',async()=>{
    const original=globalThis.fetch;
    globalThis.fetch=async()=>new Response(JSON.stringify({id:'test',display_phone_number:'+1 555-174-3607',verified_name:'Test Number'}),{status:200});
    try{
      const result=await checkPlatformConnection('whatsapp',{mode:'individual',phoneNumberId:'test',accessToken:'test-only',recipient:'example'});
      expect(result.ok).toBe(false);expect(result.details?.testNumber).toBe(true);expect(result.details?.deliveryVerified).toBe(false);
    }finally{globalThis.fetch=original;}
  });
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
