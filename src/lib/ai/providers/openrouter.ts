/**
 * OpenRouter AI Provider adapter.
 *
 * Uses OpenRouter's unified API to access multiple LLM providers.
 * Requires OPENROUTER_API_KEY.
 *
 * Free-tier resilience: the engine is built for FREE OpenRouter models that
 * rate-limit aggressively. A chain of models (OPENROUTER_MODELS, comma
 * separated) is tried in order; a model that answers 429 gets its own
 * cooldown window (60s for per-minute caps, 10 min after repeated hits) and
 * the next model in the chain serves immediately. One throttled model can
 * never stall the translation queue.
 */

import type { AIProvider, RewriteResult, SEOResult } from '../provider';
import { REWRITE_SYSTEM, translateSystem, seoSystem, categorizeSystem } from '../prompts';
import { parseJSON, retry, fetchWithTimeout } from './helpers';

const API_BASE = 'https://openrouter.ai/api/v1';

/**
 * Model chain. OPENROUTER_MODEL (legacy, single) becomes the head of the
 * chain so existing env configs keep working unchanged.
 */
function modelChain(): string[] {
  const envChain = (process.env.OPENROUTER_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const legacy = process.env.OPENROUTER_MODEL?.trim();
  const chain = [...(legacy ? [legacy] : []), ...envChain];
  if (chain.length) return chain;
  // Sensible free-tier defaults (all :free OpenRouter models).
  return [
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'google/gemma-3-27b-it:free',
    'qwen/qwen-2.5-72b-instruct:free',
  ];
}

/** Per-model cooldown state (process-local — fine for a stateless tick). */
const cooldowns = new Map<string, { until: number; hits: number }>();

function cooldownLeft(model: string): number {
  const c = cooldowns.get(model);
  if (!c || c.until <= Date.now()) return 0;
  return c.until - Date.now();
}

function penalize(model: string): void {
  const c = cooldowns.get(model) || { until: 0, hits: 0 };
  c.hits += 1;
  // First miss: 60s (per-minute free caps). Repeated misses: 10 min.
  c.until = Date.now() + (c.hits <= 2 ? 60_000 : 600_000);
  cooldowns.set(model, c);
}

export class OpenRouterProvider implements AIProvider {
  async rewrite(content: string, opts: { type?: string } = {}): Promise<RewriteResult> {
    const user = `Opportunity type: ${opts.type || 'general'}\n\nContent to rewrite:\n${content}`;
    const raw = await retry(() => this.chat(REWRITE_SYSTEM, user));
    const parsed = parseJSON(raw);
    return { text: parsed?.text || raw, summary: parsed?.summary || '' };
  }

  async translate(text: string, fromLang: string, toLang: string, opts?: { context?: string }): Promise<string> {
    const user = `${opts?.context ? `Context: ${opts.context}\n\n` : ''}Translate to ${toLang}:\n${text}`;
    const raw = await retry(() => this.chat(translateSystem(toLang), user));
    const parsed = parseJSON(raw);
    return parsed?.text || raw.trim();
  }

  async translateArray(items: string[], fromLang: string, toLang: string): Promise<string[]> {
    if (!items.length) return [];
    const user = `Translate each item to ${toLang}. Respond as JSON: {"items": ["...", "..."]}\n\nItems:\n${JSON.stringify(items)}`;
    const raw = await retry(() => this.chat(translateSystem(toLang), user));
    const parsed = parseJSON(raw);
    return parsed?.items || items;
  }

  async translateObject(obj: Record<string, string>, fromLang: string, toLang: string, opts?: { context?: string }): Promise<Record<string, string>> {
    const keys = Object.keys(obj);
    if (!keys.length) return {};

    const user = `${opts?.context ? `Context: ${opts.context}\n\n` : ''}Translate ALL values in this JSON object to ${toLang}. Keep keys unchanged. Respond with ONLY a valid JSON object with the same keys.\n\nJSON:\n${JSON.stringify(obj, null, 2)}`;
    const raw = await retry(() => this.chat(translateSystem(toLang), user));
    const parsed = parseJSON(raw);

    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }

    return obj;
  }

  async generateSEO(content: string, lang: string, opts?: { title?: string }): Promise<SEOResult> {
    const user = `${opts?.title ? `Title hint: ${opts.title}\n\n` : ''}Content:\n${content.slice(0, 2000)}`;
    const raw = await retry(() => this.chat(seoSystem(lang), user));
    const parsed = parseJSON(raw);
    return {
      seoTitle: parsed?.seoTitle || opts?.title || 'Opportunity',
      metaDescription: parsed?.metaDescription || '',
      keywords: Array.isArray(parsed?.keywords) ? parsed.keywords : [],
      slug: parsed?.slug || 'opportunity',
      ogTitle: parsed?.ogTitle || parsed?.seoTitle || opts?.title || 'Opportunity',
      ogDescription: parsed?.ogDescription || parsed?.metaDescription || '',
    };
  }

  async categorize(text: string, knownSlugs: string[]): Promise<string[]> {
    const user = `Known categories: ${knownSlugs.join(', ')}\n\nOpportunity text:\n${text.slice(0, 1500)}`;
    const raw = await retry(() => this.chat(categorizeSystem(knownSlugs), user));
    const parsed = parseJSON(raw);
    return Array.isArray(parsed?.categories) ? parsed.categories : [];
  }

  private async chat(system: string, user: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

    const errors: string[] = [];
    for (const model of modelChain()) {
      const left = cooldownLeft(model);
      if (left > 0) {
        errors.push(`${model}: cooling down ${Math.ceil(left / 1000)}s`);
        continue;
      }
      try {
        return await this.chatModel(model, apiKey, system, user);
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)).slice(0, 200);
        if (/\b429\b|rate.?limit|quota|too many requests/i.test(msg)) {
          penalize(model);
          errors.push(`${model}: ${msg}`);
          continue; // next model in the chain
        }
        throw e; // non-rate-limit errors (auth, network) are not model-specific
      }
    }
    throw new Error(`all OpenRouter models rate-limited → ${errors.join(' | ')}`);
  }

  private async chatModel(model: string, apiKey: string, system: string, user: string): Promise<string> {
    const response = await fetchWithTimeout(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
