/**
 * AI provider failover tests — pure logic with fake providers, no network.
 *
 * Run: bun test tests/ai-failover.test.ts
 */
import { describe, expect, beforeEach, test } from 'bun:test';

import { chatWithFailover, resetFailover, type ProviderSlot } from '../src/lib/ai/failover';

function slot(name: string, behavior: () => Promise<string>): ProviderSlot {
  return { name, provider: { chat: behavior } as unknown as import('../src/lib/ai/provider').AIProvider };
}

beforeEach(() => resetFailover());

describe('chatWithFailover', () => {
  test('first provider serves when healthy', async () => {
    const slots = [
      slot('groq', async () => 'ok from groq'),
      slot('cerebras', async () => 'ok from cerebras'),
    ];
    const r = await chatWithFailover(slots, 'sys', 'prompt');
    expect(r.text).toBe('ok from groq');
    expect(r.provider).toBe('groq');
  });

  test('rate-limited provider is skipped and the next one serves', async () => {
    const slots = [
      slot('groq', async () => { throw new Error('groq: 429 rate limit exceeded'); }),
      slot('cerebras', async () => 'ok from cerebras'),
    ];
    const r = await chatWithFailover(slots, 'sys', 'prompt');
    expect(r.provider).toBe('cerebras');
    expect(r.text).toBe('ok from cerebras');
  });

  test('a rate-limited provider sits in cooldown for the next call', async () => {
    let groqCalls = 0;
    const slots = [
      slot('groq', async () => { groqCalls++; throw new Error('429'); }),
      slot('cerebras', async () => 'ok from cerebras'),
    ];
    await chatWithFailover(slots, 'sys', 'prompt'); // groq fails → cooldown
    groqCalls = 0;
    await chatWithFailover(slots, 'sys', 'prompt'); // groq must be SKIPPED
    expect(groqCalls).toBe(0);
  });

  test('non-rate-limit errors also fail over but do not cool down', async () => {
    let boomCalls = 0;
    const slots = [
      slot('a', async () => { boomCalls++; throw new Error('socket closed'); }),
      slot('b', async () => 'ok from b'),
    ];
    const r = await chatWithFailover(slots, 'sys', 'prompt');
    expect(r.provider).toBe('b');
    // next call: 'a' is tried AGAIN (no cooldown for transient errors)
    const r2 = await chatWithFailover(slots, 'sys', 'prompt');
    expect(r2.provider).toBe('b');
    expect(boomCalls).toBe(2);
  });

  test('throws a per-provider error summary when the whole chain fails', async () => {
    const slots = [
      slot('groq', async () => { throw new Error('429'); }),
      slot('cerebras', async () => { throw new Error('nope'); }),
    ];
    try {
      await chatWithFailover(slots, 'sys', 'prompt');
      throw new Error('should have thrown');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('all AI providers failed');
      expect(msg).toContain('groq');
      expect(msg).toContain('cerebras');
    }
  });

  test('empty chain throws with a clear message', async () => {
    try {
      await chatWithFailover([], 'sys', 'prompt');
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('chain empty');
    }
  });
});
