/**
 * ZAI AI Provider adapter (default).
 *
 * Uses the existing `z-ai-web-dev-sdk` dependency. This is the same SDK used
 * by the offline image-generation script — adapted here for chat completions.
 */

import ZAI from 'z-ai-web-dev-sdk';
import type { AIProvider, RewriteResult, SEOResult } from '../provider';
import { REWRITE_SYSTEM, translateSystem, seoSystem, categorizeSystem } from '../prompts';
import { parseJSON, retry } from './helpers';

// ── 429 CIRCUIT BREAKER ───────────────────────────────────────────────────
// Under a persistent rate-limit storm every doomed AI call would otherwise
// burn seconds of backoff (per-call retries × per-chunk retries). The breaker
// short-circuits ALL chat calls while open so bulk imports proceed at crawl
// speed and a later fill pass adds translations when the limit clears.
const breaker = { openUntil: 0, consecutive429: 0 };
const BREAKER_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
export const BREAKER_MSG = '429 circuit-breaker open — AI call skipped (rate limit cooldown)';

function breakerOpen(): boolean {
  return Date.now() < breaker.openUntil;
}

function note429(): void {
  breaker.consecutive429++;
  if (breaker.consecutive429 >= 2) {
    breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
    breaker.consecutive429 = 0;
    console.warn('[ai] circuit-breaker OPEN for 10 min (persistent 429) — imports continue without translations');
  }
}

export class ZAIProvider implements AIProvider {
  private client: ZAI | null = null;

  private async getClient(): Promise<ZAI> {
    if (!this.client) this.client = await ZAI.create();
    return this.client;
  }

  /** Raw chat call — also used by the enrichment pipeline. */
  async chat(system: string, user: string): Promise<string> {
    if (breakerOpen()) throw new Error(BREAKER_MSG);
    const client = await this.getClient();
    let res: unknown;
    try {
      res = await client.chat.completions.create({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/429|too many requests/i.test(msg)) note429();
      throw e;
    }
    breaker.consecutive429 = 0;
    // SDK shape mirrors OpenAI: choices[0].message.content
    return (res as any).choices?.[0]?.message?.content || '';
  }

  async rewrite(content: string, opts: { type?: string } = {}): Promise<RewriteResult> {
    const user = `Opportunity type: ${opts.type || 'general'}\n\nContent to rewrite:\n${content}`;
    const raw = await retry(() => this.chat(REWRITE_SYSTEM, user));
    const parsed = parseJSON(raw);
    return {
      text: parsed?.text || raw,
      summary: parsed?.summary || '',
    };
  }

  async translate(text: string, fromLang: string, toLang: string, opts?: { context?: string }): Promise<string> {
    const user = `${opts?.context ? `Context: ${opts.context}\n\n` : ''}Translate to ${toLang}:\n${text}`;
    const raw = await retry(() => this.chat(translateSystem(toLang), user));
    const parsed = parseJSON(raw);
    return parsed?.text || raw;
  }

  async translateArray(items: string[], fromLang: string, toLang: string): Promise<string[]> {
    if (!items.length) return [];
    const user = `Translate each item to ${toLang}. Respond as JSON: {"items": ["...", "..."]}\n\nItems:\n${JSON.stringify(items)}`;
    const raw = await retry(() => this.chat(translateSystem(toLang), user));
    const parsed = parseJSON(raw);
    return parsed?.items || (parsed ? [parsed.text].filter(Boolean) : [raw]);
  }

  async translateObject(obj: Record<string, string>, fromLang: string, toLang: string, opts?: { context?: string }): Promise<Record<string, string>> {
    const keys = Object.keys(obj);
    if (!keys.length) return {};
    
    const user = `${opts?.context ? `Context: ${opts.context}\n\n` : ''}Translate the values of this JSON object to ${toLang}. Respond with ONLY a valid JSON object matching the exact keys.\n\nJSON:\n${JSON.stringify(obj, null, 2)}`;
    const raw = await retry(() => this.chat(translateSystem(toLang), user));
    const parsed = parseJSON(raw);
    
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
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
}
