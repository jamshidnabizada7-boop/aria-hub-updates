/**
 * Social channel adapters — publish a ready post to each platform.
 *
 * Every adapter is fail-soft: it returns a PublishResult and NEVER throws.
 * Beyond ok/error, adapters report:
 *   id/permalink   — the platform post identifiers, persisted by the publisher
 *                    so retries can reconcile instead of double-posting
 *   downgraded     — the image post failed but a text-only post went out
 *   rateLimited    — platform throttling → skip this channel for the run
 *   tokenExpired   — reauthorization needed → channel disabled + admin alert
 *
 * Credentials live in the (encrypted at rest) PublishChannel.credentials JSON:
 *   telegram  → { botToken, chatId }
 *   facebook  → { pageId, accessToken }
 *   x         → { accessToken, apiSecret? }   (OAuth2 user-context token)
 *   instagram → { igUserId, accessToken }     (Graph API container flow)
 *   linkedin  → { accessToken, authorUrn }    (urn:li:person:… / urn:li:organization:…)
 *   whatsapp  → { accessToken, channelId }    (WhatsApp Business channel — Cloud API)
 *
 * Images are passed as PUBLIC urls (https://…/generated-posts/…) — required
 * by Facebook/Instagram/Telegram-by-url. When only a local file exists,
 * Telegram uses multipart upload; others fall back to text-only.
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
  id?: string | null;
  permalink?: string | null;
  /** image post failed but a text-only post went out — surfaced to admins */
  downgraded?: string;
  /** platform throttling — skip this channel for the rest of the run */
  rateLimited?: boolean;
  /** credentials rejected — channel needs reauthorization */
  tokenExpired?: boolean;
}

const TIMEOUT_MS = 20000;
/** IG containers can take ~15-30s to finish processing before media_publish. */
const IG_STATUS_TIMEOUT_MS = 30000;

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

/** Best-effort permalink lookup for a Graph-API post id. */
async function graphPermalink(id: string, accessToken: string): Promise<string | null> {
  try {
    const r = await safeFetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(id)}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`);
    return (r.json as { permalink?: string } | null)?.permalink ?? null;
  } catch {
    return null;
  }
}

/**
 * Classify a Graph API error payload into recovery hints:
 *  190 → invalid/expired token; 4/17/32/613 (+HTTP 429/32) → throttling.
 */
function classifyGraph(json: Record<string, unknown> | null, status: number): { rateLimited?: boolean; tokenExpired?: boolean } {
  const code = (json as { error?: { code?: number; error_subcode?: number } } | null)?.error?.code;
  if (code === 190) return { tokenExpired: true };
  if (status === 429 || code === 4 || code === 17 || code === 32 || code === 613) return { rateLimited: true };
  return {};
}

// ── Telegram ─────────────────────────────────────────────────────────────────
async function publishTelegram(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const botToken = String(creds.botToken || '');
  const chatId = String(creds.chatId || '');
  if (!botToken || !chatId) return { ok: false, error: 'telegram: missing botToken/chatId' };
  const api = (m: string) => `https://api.telegram.org/bot${botToken}/${m}`;
  try {
    let last: PublishResult | null = null;
    if (input.imagePath) {
      // multipart local-file upload
      const { readFile } = await import('node:fs/promises');
      const buf = await readFile(input.imagePath);
      const fd = new FormData();
      fd.append('chat_id', chatId);
      fd.append('caption', input.caption.slice(0, 1024));
      fd.append('photo', new Blob([new Uint8Array(buf)], { type: 'image/png' }), 'post.png');
      const r = await safeFetch(api('sendPhoto'), { method: 'POST', body: fd });
      const j = r.json as { result?: { message_id?: number } } | null;
      if (r.ok) return { ok: true, id: j?.result?.message_id ? String(j.result.message_id) : null };
      last = { ok: false, error: `telegram: ${r.status} sendPhoto failed` };
      // fall through to text
    } else if (input.imageUrl) {
      const r = await safeFetch(api('sendPhoto'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: input.imageUrl, caption: input.caption.slice(0, 1024) }),
      });
      const j = r.json as { result?: { message_id?: number } } | null;
      if (r.ok) return { ok: true, id: j?.result?.message_id ? String(j.result.message_id) : null };
      last = { ok: false, error: `telegram: ${r.status} sendPhoto failed` };
    }
    const r2 = await safeFetch(api('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: input.caption.slice(0, 4096), disable_web_preview: false }),
    });
    if (r2.ok) {
      const j = r2.json as { result?: { message_id?: number } } | null;
      return { ok: true, id: j?.result?.message_id ? String(j.result.message_id) : null, ...(last?.error ? { downgraded: last.error } : {}) };
    }
    const desc = (r2.json as { description?: string; parameters?: { retry_after?: number } } | null);
    if (r2.status === 429) return { ok: false, error: `telegram: 429 ${desc?.description || 'rate limited'}`, rateLimited: true };
    if (/401|Unauthorized/i.test(`${r2.status} ${desc?.description || ''}`)) return { ok: false, error: `telegram: ${desc?.description || 'unauthorized — check bot token'}`, tokenExpired: true };
    return { ok: false, error: `telegram: ${r2.status} ${desc?.description || r2.text.slice(0, 160)}` };
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
    let photoError: string | null = null;
    if (input.imageUrl) {
      const r = await safeFetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input.imageUrl, caption: input.caption.slice(0, 5000), access_token: accessToken }),
      });
      if (r.ok) {
        const j = r.json as { id?: string; post_id?: string } | null;
        const id = j?.post_id || j?.id || null;
        return { ok: true, id, permalink: id ? await graphPermalink(id, accessToken) : null };
      }
      const cls = classifyGraph(r.json, r.status);
      const msg = (r.json as { error?: { message?: string } } | null)?.error?.message || r.text.slice(0, 160);
      if (cls.tokenExpired) return { ok: false, error: `facebook: token rejected — ${msg}`, tokenExpired: true };
      if (cls.rateLimited) return { ok: false, error: `facebook: rate limited — ${msg}`, rateLimited: true };
      // Fall through to a text-only feed post, but SAY so — silent downgrades
      // used to ship image-less posts with no trace.
      photoError = msg;
    }
    const r2 = await safeFetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.caption.slice(0, 5000), link: input.link || undefined, access_token: accessToken }),
    });
    if (r2.ok) {
      const j = r2.json as { id?: string } | null;
      const id = j?.id || null;
      return {
        ok: true,
        id,
        permalink: id ? await graphPermalink(id, accessToken) : null,
        ...(photoError ? { downgraded: `image failed (${photoError}) — posted text-only` } : {}),
      };
    }
    const cls2 = classifyGraph(r2.json, r2.status);
    const err = (r2.json as { error?: { message?: string } } | null)?.error?.message || r2.text.slice(0, 160);
    return {
      ok: false,
      error: `facebook: ${r2.status} ${err}`,
      ...cls2,
    };
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
    if (r.ok) {
      const j = r.json as { data?: { id?: string } } | null;
      const id = j?.data?.id || null;
      return { ok: true, id, permalink: id ? `https://x.com/i/web/status/${id}` : null };
    }
    if (r.status === 429) return { ok: false, error: 'x: 429 rate limited', rateLimited: true };
    if (r.status === 401 || r.status === 403) return { ok: false, error: `x: ${r.status} ${r.text.slice(0, 120)}`, tokenExpired: true };
    return { ok: false, error: `x: ${r.status} ${r.text.slice(0, 160)}` };
  } catch (e) {
    return { ok: false, error: `x: ${errOf(e)}` };
  }
}

// ── Instagram (Graph container flow — image required) ────────────────────────
/** Poll the container until FINISHED — publishing an unfinished container
 *  used to fail with "media not ready" intermittently. */
async function waitInstagramReady(creationId: string, accessToken: string): Promise<{ ready: boolean; error?: string }> {
  const deadline = Date.now() + IG_STATUS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await safeFetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(creationId)}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`);
    const code = (r.json as { status_code?: string } | null)?.status_code;
    if (code === 'FINISHED') return { ready: true };
    if (code === 'ERROR' || code === 'EXPIRED') return { ready: false, error: `instagram: container ${code}` };
    // IN_PROGRESS / IN_PROGRESS-keep polling
  }
  return { ready: false, error: 'instagram: container not FINISHED in time' };
}

async function publishInstagram(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const igUserId = String(creds.igUserId || '');
  const accessToken = String(creds.accessToken || '');
  if (!igUserId || !accessToken) return { ok: false, error: 'instagram: missing igUserId/accessToken' };
  if (!input.imageUrl) return { ok: false, error: 'instagram: image required (render failed?)' };
  try {
    const c = await safeFetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: input.imageUrl, caption: input.caption.slice(0, 2200), access_token: accessToken }),
    });
    const creationId = (c.json as { id?: string } | null)?.id;
    if (!c.ok || !creationId) {
      const cls = classifyGraph(c.json, c.status);
      return { ok: false, error: `instagram: container ${c.status} ${c.text.slice(0, 120)}`, ...cls };
    }
    const wait = await waitInstagramReady(creationId, accessToken);
    if (!wait.ready) return { ok: false, error: wait.error };
    const p = await safeFetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
    });
    if (p.ok) {
      const j = p.json as { id?: string } | null;
      const id = j?.id || null;
      return { ok: true, id, permalink: id ? await graphPermalink(id, accessToken) : null };
    }
    const cls = classifyGraph(p.json, p.status);
    return { ok: false, error: `instagram: publish ${p.status} ${p.text.slice(0, 120)}`, ...cls };
  } catch (e) {
    return { ok: false, error: `instagram: ${errOf(e)}` };
  }
}

// ── LinkedIn (official API — member or organization posts) ───────────────────
// Credentials: { accessToken, authorUrn } — authorUrn is "urn:li:person:…" or
// "urn:li:organization:…". Token comes from a LinkedIn developer app with the
// "Share on LinkedIn" product; expires ~60 days → tokenExpired triggers the
// standard reauthorization flow.

const LINKEDIN_HEADERS = (accessToken: string): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  'X-Restli-Protocol-Version': '2.0.0',
  'LinkedIn-Version': '202411',
});

/** Normalize whatever the admin pasted into a proper LinkedIn URN.
 * Accepts: full URN, /in/slug profile URL, bare person slug, bare numeric org id. */
function normalizeLinkedInUrn(raw: string): string {
  const v = raw.trim();
  if (v.startsWith('urn:li:')) return v;
  const inMatch = v.match(/linkedin\.com\/(?:in|company)\/([^/?#]+)/i);
  if (inMatch) return /company/i.test(v) ? 'urn:li:organization:' + inMatch[1] : 'urn:li:person:' + inMatch[1];
  if (/^\d+$/.test(v)) return 'urn:li:organization:' + v;
  return 'urn:li:person:' + v;
}

async function publishLinkedIn(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const accessToken = String(creds.accessToken || '');
  const authorUrn = normalizeLinkedInUrn(String(creds.authorUrn || ''));
  if (!accessToken || !authorUrn) return { ok: false, error: 'linkedin: missing accessToken/authorUrn' };
  try {
    let mediaUrn: string | null = null;
    // Image post: register an upload asset, PUT the binary, reference the URN.
    if (input.imageUrl) {
      const reg = await safeFetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: LINKEDIN_HEADERS(accessToken),
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: authorUrn,
            serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
          },
        }),
      });
      const rj = reg.json as { value?: { uploadUrl?: string; asset?: string } } | null;
      const uploadUrl = rj?.value?.uploadUrl;
      mediaUrn = rj?.value?.asset ?? null;
      if (!reg.ok || !uploadUrl || !mediaUrn) {
        const tokenExpired = reg.status === 401 || reg.status === 403;
        return { ok: false, error: `linkedin: register upload ${reg.status} ${reg.text.slice(0, 120)}`, ...(tokenExpired ? { tokenExpired } : {}) };
      }
      const img = await fetch(input.imageUrl);
      if (!img.ok) return { ok: false, error: `linkedin: image fetch ${img.status}` };
      const buf = await img.arrayBuffer();
      const up = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream' },
        body: Buffer.from(buf),
      });
      if (!up.ok) return { ok: false, error: `linkedin: image upload ${up.status}` };
    }

    const body: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: input.caption.slice(0, 2900) },
          shareMediaCategory: mediaUrn ? 'IMAGE' : 'NONE',
          ...(mediaUrn
            ? { media: [{ status: 'READY', media: mediaUrn, title: { text: 'ARIA HUB' } }] }
            : {}),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };
    const r = await safeFetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: LINKEDIN_HEADERS(accessToken),
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const id = (r.json as { id?: string } | null)?.id ?? null;
      return { ok: true, id, permalink: id ? `https://www.linkedin.com/feed/update/${id}` : null };
    }
    if (r.status === 429) return { ok: false, error: 'linkedin: 429 rate limited', rateLimited: true };
    if (r.status === 401 || r.status === 403) return { ok: false, error: `linkedin: ${r.status} ${r.text.slice(0, 120)}`, tokenExpired: true };
    return { ok: false, error: `linkedin: ${r.status} ${r.text.slice(0, 160)}` };
  } catch (e) {
    return { ok: false, error: `linkedin: ${errOf(e)}` };
  }
}

// ── WhatsApp Channel (Meta Cloud API — official Channels support) ────────────
// Credentials: { accessToken, channelId } — channelId is the WhatsApp Channel
// ID from a WhatsApp Business Account (Channels are one-way broadcasts).
// NOTE: posting to WhatsApp GROUPS is not possible via any official API —
// groups would require unofficial automation that violates WhatsApp ToS and
// risks number bans. Use a Channel instead; share the channel link anywhere.
async function publishWhatsApp(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const accessToken = String(creds.accessToken || '');
  const channelId = String(creds.channelId || '');
  if (!accessToken || !channelId) return { ok: false, error: 'whatsapp: missing accessToken/channelId' };
  try {
    const text = input.link ? `${input.caption}\n\n🔗 ${input.link}` : input.caption;
    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: channelId,
      type: input.imageUrl ? 'image' : 'text',
      ...(input.imageUrl
        ? { image: { link: input.imageUrl, caption: text.slice(0, 1000) } }
        : { text: { preview_url: true, body: text.slice(0, 4000) } }),
    };
    const r = await safeFetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(channelId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const j = r.json as { messages?: { id?: string }[] } | null;
      const id = j?.messages?.[0]?.id ?? null;
      return { ok: true, id };
    }
    const cls = classifyGraph(r.json, r.status);
    const hint = r.text.includes('does not exist')
      ? ' (hint: channelId must be the API Channel ID owned by your WABA - get it via GET /<WABA_ID>/channel_ids with a system-user token that has whatsapp_business_messaging; the whatsapp.com/channel/ link id will NOT work)'
      : '';
    return { ok: false, error: `whatsapp: ${r.status} ${r.text.slice(0, 140)}${hint}`, ...cls };
  } catch (e) {
    return { ok: false, error: `whatsapp: ${errOf(e)}` };
  }
}

const ADAPTERS: Record<string, (creds: Record<string, unknown>, input: PublishInput) => Promise<PublishResult>> = {
  telegram: publishTelegram,
  facebook: publishFacebook,
  x: publishX,
  instagram: publishInstagram,
  linkedin: publishLinkedIn,
  whatsapp: publishWhatsApp,
};

/** Platforms that can post text-only (used for honest test messages). */
export const TEXT_ONLY_PLATFORMS = new Set(['telegram', 'facebook', 'x']);

export async function publishToPlatform(platform: string, creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const fn = ADAPTERS[platform];
  if (!fn) return { ok: false, error: `unknown platform: ${platform}` };
  return fn(creds, input);
}
