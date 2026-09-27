/**
 * OpenRouter AI Provider adapter.
 *
 * Uses OpenRouter's unified API to access multiple LLM providers.
 * Requires OPENROUTER_API_KEY.
 */

import type { AIProvider, RewriteResult, SEOResult } from '../provider';
import { REWRITE_SYSTEM, translateSystem, seoSystem, categorizeSystem } from '../prompts';
import { parseJSON, retry } from './helpers';

// "openrouter/free" lets OpenRouter route across currently available free
// models. Owners can pin a specific free model with OPENROUTER_MODEL.
const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const REQUEST_TIMEOUT_MS = Math.max(15000, Number(process.env.OPENROUTER_TIMEOUT_MS) || 60000);
const MAX_TOKENS = Math.max(512, Math.min(8000, Number(process.env.OPENROUTER_MAX_TOKENS) || 4000));
const API_BASE = 'https://openrouter.ai/api/v1';

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: MAX_TOKENS,
      }),
      signal: controller.signal,
    });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        throw new Error(`OpenRouter API timeout after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
