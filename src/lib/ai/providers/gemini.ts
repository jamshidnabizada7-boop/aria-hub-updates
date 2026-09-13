/**
 * Google Gemini AI Provider adapter.
 *
 * Dynamically imports the `@google/genai` package ONLY when this provider is
 * selected. Requires GEMINI_API_KEY.
 */

import type { AIProvider, RewriteResult, SEOResult } from '../provider';
import { REWRITE_SYSTEM, translateSystem, seoSystem, categorizeSystem } from '../prompts';
import { parseJSON, retry } from './helpers';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export class GeminiProvider implements AIProvider {
  private clientPromise: Promise<any> | null = null;

  private async getClient(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      })();
    }
    return this.clientPromise;
  }

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
    return parsed?.text || raw;
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

  private async chat(system: string, user: string): Promise<string> {
    const client = await this.getClient();
    const model = client.getGenerativeModel({ model: MODEL });
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: system }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I will follow these instructions.' }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
    });
    
    const result = await chat.sendMessage(user);
    const response = await result.response;
    return response.text() || '';
  }
}
