/**
 * Pluggable AI provider abstraction.
 *
 * Reads AI_PROVIDER env var ('zai' | 'openai' | 'gemini') and lazy-loads the
 * corresponding adapter. If no provider/key is configured, returns null so the
 * orchestrator can run in "no-AI" degraded mode.
 */

import type { RawListing } from '../import/types';

// ── Public interface ──────────────────────────────────────────────────────────

export interface RewriteResult {
  /** Rewritten content in markdown (professional, SEO-friendly). */
  text: string;
  /** Concise summary (2-4 sentences). */
  summary: string;
}

export interface SEOResult {
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  slug: string;
  ogTitle: string;
  ogDescription: string;
}

export interface AIProvider {
  /** Professionally rewrite content and generate a concise summary. */
  rewrite(content: string, opts: { type?: string }): Promise<RewriteResult>;

  /** Translate a single string to the target language. */
  translate(text: string, fromLang: string, toLang: string, opts?: { context?: string }): Promise<string>;

  /** Translate an array of strings (e.g. keywords, tags). */
  translateArray(items: string[], fromLang: string, toLang: string): Promise<string[]>;

  /** Translate a dictionary of strings. */
  translateObject(obj: Record<string, string>, fromLang: string, toLang: string, opts?: { context?: string }): Promise<Record<string, string>>;

  /** Generate SEO metadata for content in a given language. */
  generateSEO(content: string, lang: string, opts?: { title?: string }): Promise<SEOResult>;

  /** Suggest category slugs from a known set. */
  categorize(text: string, knownSlugs: string[]): Promise<string[]>;

}

// ── Factory ───────────────────────────────────────────────────────────────────

let cachedProvider: AIProvider | null | undefined; // undefined = not checked yet

/**
 * Build ONE provider instance by name. Returns null when the provider's key
 * is missing (no-AI mode) or the name is unknown.
 */
export async function buildProvider(name: string): Promise<AIProvider | null> {
  try {
    switch (name) {
      case 'cerebras': {
        if (!process.env.CEREBRAS_API_KEY) return null;
        const { CerebrasProvider } = await import('./providers/cerebras');
        return new CerebrasProvider();
      }
      case 'gemini': {
        if (!process.env.GEMINI_API_KEY) return null;
        const { GeminiProvider } = await import('./providers/gemini');
        return new GeminiProvider();
      }
      case 'groq': {
        if (!process.env.GROQ_API_KEY) return null;
        const { GroqProvider } = await import('./providers/groq');
        return new GroqProvider();
      }
      case 'openrouter': {
        if (!process.env.OPENROUTER_API_KEY) return null;
        const { OpenRouterProvider } = await import('./providers/openrouter');
        return new OpenRouterProvider();
      }
      case 'zai': {
        // z-ai-web-dev-sdk authenticates ambiently (no key required) in the
        // sandbox environment; on other hosts set ZAI_API_KEY to be explicit.
        const { ZAIProvider } = await import('./providers/zai');
        return new ZAIProvider();
      }
      case 'openai': {
        if (!process.env.OPENAI_API_KEY) return null;
        const { OpenAIProvider } = await import('./providers/openai');
        return new OpenAIProvider();
      }
      default:
        console.warn(`[ai] Unknown AI provider "${name}" — skipped.`);
        return null;
    }
  } catch (e) {
    console.error(`[ai] Failed to initialize ${name} provider:`, e);
    return null;
  }
}

export async function getAIProvider(): Promise<AIProvider | null> {
  if (cachedProvider !== undefined) return cachedProvider;
  const provider = (process.env.AI_PROVIDER || 'zai').toLowerCase().trim();
  const built = await buildProvider(provider);
  if (built) console.log(`[ai] Using ${provider} provider`);
  else console.warn(`[ai] AI provider "${provider}" unavailable (missing key?) — running in no-AI mode.`);
  cachedProvider = built;
  return cachedProvider ?? null;
}

/** Reset the cached provider (useful in tests). */
export function resetAIProvider(): void {
  cachedProvider = undefined;
}
