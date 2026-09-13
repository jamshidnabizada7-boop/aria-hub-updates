/**
 * Groq AI Provider adapter.
 *
 * Uses Groq's ultra-fast LLM inference API with Llama models.
 * Requires GROQ_API_KEY.
 */

import type { AIProvider, RewriteResult, SEOResult } from '../provider';
import { REWRITE_SYSTEM, translateSystem, seoSystem, categorizeSystem } from '../prompts';
import { parseJSON, retry } from './helpers';

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const API_BASE = 'https://api.groq.com/openai/v1';

export class GroqProvider implements AIProvider {
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
    
    // Ensure we got a valid object back
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    
    // Fallback: return original
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
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not configured');

    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
