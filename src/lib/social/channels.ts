/**
 * Social channel adapters — publish a ready post to each platform.
 *
 * Every adapter is fail-soft: it returns { ok, error? } and NEVER throws.
 * Credentials live in the PublishChannel.credentials JSON:
 *   telegram  → { botToken, chatId }
 *   facebook  → { pageId, accessToken }
 *   x         → { accessToken, apiSecret? }   (OAuth2 user-context token)
 *   instagram → { igUserId, accessToken }     (Graph API container flow)
 *
 * Images are passed as PUBLIC urls (https://www.myariahub.com/generated-posts/…)
 * — required by Facebook/Instagram/Telegram-by-url. When only a local file
 * exists, Telegram uses multipart upload; others fall back to text-only.
 */

export interface PublishInput {
  caption: string;
  imageUrl?: string | null; // public absolute URL
  imagePath?: string | null; // local FS path (server-side upload fallback)
  link?: string | null;
}

export interface PublishResult {
  ok: boolean;
  error?: string;
}

const TIMEOUT_MS = 20000;

async function safeFetch(url: string, init: RequestInit & { body?: BodyInit | undefined } = {}): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null; text: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try { json = JSON.parse(text); } catch { /* non-json */ }
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(t);
  }
}

const errOf = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 240);

// ── Telegram ─────────────────────────────────────────────────────────────────
async function publishTelegram(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const botToken = String(creds.botToken || '');
  const chatId = String(creds.chatId || '');
  if (!botToken || !chatId) return { ok: false, error: 'telegram: missing botToken/chatId' };
  const api = (m: string) => `https://api.telegram.org/bot${botToken}/${m}`;
  try {
    if (input.imagePath) {
      // multipart local-file upload
      const { readFile } = await import('node:fs/promises');
      const buf = await readFile(input.imagePath);
      const fd = new FormData();
      fd.append('chat_id', chatId);
      fd.append('caption', input.caption.slice(0, 1024));
      fd.append('photo', new Blob([new Uint8Array(buf)], { type: 'image/png' }), 'post.png');
      const r = await safeFetch(api('sendPhoto'), { method: 'POST', body: fd });
      if (r.ok) return { ok: true };
      // fall through to text
    } else if (input.imageUrl) {
      const r = await safeFetch(api('sendPhoto'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: input.imageUrl, caption: input.caption.slice(0, 1024) }),
      });
      if (r.ok) return { ok: true };
    }
    const r2 = await safeFetch(api('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: input.caption.slice(0, 4096), disable_web_preview: false }),
    });
    if (r2.ok) return { ok: true };
    const desc = (r2.json as { description?: string } | null)?.description || r2.text.slice(0, 160);
    return { ok: false, error: `telegram: ${r2.status} ${desc}` };
  } catch (e) {
    return { ok: false, error: `telegram: ${errOf(e)}` };
  }
}

// ── Facebook Page ────────────────────────────────────────────────────────────
async function publishFacebook(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const pageId = String(creds.pageId || '');
  const accessToken = String(creds.accessToken || '');
  if (!pageId || !accessToken) return { ok: false, error: 'facebook: missing pageId/accessToken' };
  try {
    if (input.imageUrl) {
      const r = await safeFetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input.imageUrl, caption: input.caption.slice(0, 5000), access_token: accessToken }),
      });
      if (r.ok) return { ok: true };
    }
    const r2 = await safeFetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.caption.slice(0, 5000), link: input.link || undefined, access_token: accessToken }),
    });
    if (r2.ok) return { ok: true };
    const err = (r2.json as { error?: { message?: string } } | null)?.error?.message || r2.text.slice(0, 160);
    return { ok: false, error: `facebook: ${r2.status} ${err}` };
  } catch (e) {
    return { ok: false, error: `facebook: ${errOf(e)}` };
  }
}

// ── X (Twitter) — text-only v2 ───────────────────────────────────────────────
async function publishX(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const accessToken = String(creds.accessToken || '');
  if (!accessToken) return { ok: false, error: 'x: missing accessToken' };
  try {
    const r = await safeFetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ text: input.caption.slice(0, 280) }),
    });
    if (r.ok) return { ok: true };
    return { ok: false, error: `x: ${r.status} ${r.text.slice(0, 160)}` };
  } catch (e) {
    return { ok: false, error: `x: ${errOf(e)}` };
  }
}

// ── Instagram (Graph container flow — image required) ────────────────────────
async function publishInstagram(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const igUserId = String(creds.igUserId || '');
  const accessToken = String(creds.accessToken || '');
  if (!igUserId || !accessToken) return { ok: false, error: 'instagram: missing igUserId/accessToken' };
  if (!input.imageUrl) return { ok: false, error: 'instagram: image required' };
  try {
    const c = await safeFetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: input.imageUrl, caption: input.caption.slice(0, 2200), access_token: accessToken }),
    });
    const creationId = (c.json as { id?: string } | null)?.id;
    if (!c.ok || !creationId) return { ok: false, error: `instagram: container ${c.status} ${c.text.slice(0, 120)}` };
    const p = await safeFetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
    });
    if (p.ok) return { ok: true };
    return { ok: false, error: `instagram: publish ${p.status} ${p.text.slice(0, 120)}` };
  } catch (e) {
    return { ok: false, error: `instagram: ${errOf(e)}` };
  }
}

const ADAPTERS: Record<string, (creds: Record<string, unknown>, input: PublishInput) => Promise<PublishResult>> = {
  telegram: publishTelegram,
  facebook: publishFacebook,
  x: publishX,
  instagram: publishInstagram,
};

export async function publishToPlatform(platform: string, creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const fn = ADAPTERS[platform];
  if (!fn) return { ok: false, error: `unknown platform: ${platform}` };
  return fn(creds, input);
}
