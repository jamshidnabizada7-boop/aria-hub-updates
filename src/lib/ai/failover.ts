/**
 * Multi-provider failover for chat completions.
 *
 * Free-tier providers throttle aggressively, and the tick used to lock onto
 * ONE provider — when it hit a 429, translation backed off for 30 minutes
 * even though other configured providers had quota. This module runs a
 * PRIORITY CHAIN of providers (AI_PROVIDERS=groq,cerebras,gemini) and
 * transparently fails over:
 *
 *   - a provider that returns a rate-limit error gets a short cooldown and
 *     the next provider is tried immediately (ToS-clean: each provider's own
 *     free tier, no multi-account rotation)
 *   - a provider in cooldown is skipped until its window passes
 *   - every attempt is recorded for the admin Automation panel
 *
 * Only providers with a `chat` method participate; the chain is rebuilt when
 * the AI_PROVIDERS env changes (per-process cache).
 */
import type { AIProvider } from './provider';
import { buildProvider } from './provider';

export interface ProviderSlot {
  name: string;
  provider: AIProvider;
}

export interface ProviderHealth {
  name: string;
  configured: boolean;
  cooling: boolean;
  cooldownSecondsLeft: number;
  lastError: string | null;
  lastUsedAt: string | null;
  usedCount: number;
}

interface SlotState {
  cooldownUntil: number;
  lastError: string | null;
  lastUsedAt: number | null;
  usedCount: number;
}

const COOLDOWN_MS = Math.max(60_000, Number(process.env.AI_PROVIDER_COOLDOWN_MS) || 60_000);
const TRANSIENT_COOLDOWN_MS = Math.max(30_000, Number(process.env.AI_PROVIDER_TRANSIENT_COOLDOWN_MS) || 120_000);

const states = new Map<string, SlotState>();
const instances = new Map<string, AIProvider | null>();
let cachedChain: string[] | null = null;

const stateOf = (name: string): SlotState => {
  let st = states.get(name);
  if (!st) {
    st = { cooldownUntil: 0, lastError: null, lastUsedAt: null, usedCount: 0 };
    states.set(name, st);
  }
  return st;
};

/** Priority chain from AI_PROVIDERS (comma-separated), falling back to AI_PROVIDER/zai. */
export function getProviderChain(): string[] {
  if (cachedChain) return cachedChain;
  const raw = process.env.AI_PROVIDERS || process.env.AI_PROVIDER || 'zai';
  cachedChain = raw
    .split(',')
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
  return cachedChain;
}

/** Invalidate the cached chain (after env changes / in tests). */
export function resetFailover(): void {
  cachedChain = null;
  states.clear();
  instances.clear();
}

async function slot(name: string): Promise<ProviderSlot | null> {
  if (!instances.has(name)) {
    instances.set(name, await buildProvider(name));
  }
  const provider = instances.get(name);
  return provider ? { name, provider } : null;
}

/** Build the configured, key-available chain in priority order. */
export async function getProviderSlots(): Promise<ProviderSlot[]> {
  const slots: ProviderSlot[] = [];
  for (const name of getProviderChain()) {
    const s = await slot(name);
    if (s) slots.push(s);
  }
  return slots;
}

function isRateLimitError(msg: string): boolean {
  return /\b429\b|rate.?limit|quota|too many requests/i.test(msg);
}

function isTransientProviderError(msg: string): boolean {
  return /\b(500|502|503|504)\b|timeout|temporar|overload|service unavailable|network|fetch failed/i.test(msg);
}

export interface FailoverResult {
  text: string;
  provider: string;
}

/**
 * Try each provider in priority order; on rate-limit errors cool the provider
 * down (1 min) and fall through to the next. Throws with a per-provider error
 * summary when nothing can serve.
 */
export async function chatWithFailover(
  slots: ProviderSlot[],
  system: string,
  prompt: string,
): Promise<FailoverResult> {
  const errors: string[] = [];
  const now = Date.now();

  for (const { name, provider } of slots) {
    const st = stateOf(name);
    if (st.cooldownUntil > now) {
      errors.push(`${name}: cooling down ${Math.ceil((st.cooldownUntil - now) / 1000)}s`);
      continue;
    }
    const chat = (provider as { chat?: (s: string, p: string) => Promise<string> }).chat?.bind(provider);
    if (!chat) {
      errors.push(`${name}: no chat method`);
      continue;
    }
    try {
      const text = await chat(system, prompt);
      st.lastUsedAt = now;
      st.usedCount++;
      st.lastError = null;
      return { text, provider: name };
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 200);
      st.lastError = msg;
      errors.push(`${name}: ${msg}`);
      if (isRateLimitError(msg)) {
        st.cooldownUntil = Date.now() + COOLDOWN_MS;
      } else if (isTransientProviderError(msg)) {
        st.cooldownUntil = Date.now() + TRANSIENT_COOLDOWN_MS;
      }
    }
  }

  throw new Error(`all AI providers failed → ${errors.join(' | ') || 'chain empty'}`);
}

/** Admin-panel health snapshot for every name in the chain. */
export function getProviderHealth(): ProviderHealth[] {
  const now = Date.now();
  return getProviderChain().map((name) => {
    const configured = instances.has(name) && instances.get(name) !== null;
    const st = stateOf(name);
    return {
      name,
      configured,
      cooling: st.cooldownUntil > now,
      cooldownSecondsLeft: st.cooldownUntil > now ? Math.ceil((st.cooldownUntil - now) / 1000) : 0,
      lastError: st.lastError,
      lastUsedAt: st.lastUsedAt ? new Date(st.lastUsedAt).toISOString() : null,
      usedCount: st.usedCount,
    };
  });
}
