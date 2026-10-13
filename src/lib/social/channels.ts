import { readPublicImage } from '@/lib/import/public-image-url';
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
 *   whatsapp  → { accessToken, phoneNumberId, recipient, mode } (Business messaging; separate from public Channels)
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
  /** Opportunity automation requires a real media post; never silently downgrade. */
  requireImage?: boolean;
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

const rawMetaVersion = (process.env.META_GRAPH_VERSION || 'v26.0').trim();
export const META_GRAPH_VERSION = rawMetaVersion.startsWith('v') ? rawMetaVersion : `v${rawMetaVersion}`;
const graphUrl = (path: string) =>
  `https://graph.facebook.com/${META_GRAPH_VERSION}/${path.replace(/^\/+/, '')}`;

async function safeFetch(url: string, init: RequestInit & { body?: BodyInit | undefined } = {}): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null; text: string; headers: Headers }> {
  const createsPost = init.method === 'POST' && /\/(?:photos|feed|media_publish|posts|messages|group_messages|tweets|sendPhoto|sendMessage)$/.test(new URL(url).pathname);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (createsPost && res.status >= 500) throw new Error('publish outcome unknown');
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try { json = JSON.parse(text); } catch { /* non-json */ }
    return { ok: res.ok, status: res.status, json, text, headers: res.headers };
  } catch (error) {
    if (createsPost) throw new Error('publish outcome unknown — verify the destination before retrying');
    throw error;
  } finally {
    clearTimeout(t);
  }
}

const errOf = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 240);

/** Best-effort permalink lookup for a Graph-API post id. */
async function graphPermalink(id: string, accessToken: string): Promise<string | null> {
  try {
    const r = await safeFetch(graphUrl(`${encodeURIComponent(id)}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`));
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
    if (input.requireImage && (input.imagePath || input.imageUrl)) {
      return last ?? { ok: false, error: 'telegram: image required but photo publishing failed' };
    }
    if (input.requireImage && !input.imagePath && !input.imageUrl) {
      return { ok: false, error: 'telegram: image required but no rendered media was provided' };
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
      const r = await safeFetch(graphUrl(`${pageId}/photos`), {
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
      if (input.requireImage) {
        return { ok: false, error: `facebook: image publish failed — ${msg}`, ...cls };
      }
      // Editorial/manual text fallback remains available when the caller did
      // not require media.
      photoError = msg;
    } else if (input.requireImage) {
      return { ok: false, error: 'facebook: image required but no rendered media was provided' };
    }
    const r2 = await safeFetch(graphUrl(`${pageId}/feed`), {
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
  if (input.requireImage) {
    return { ok: false, error: 'x: image-required opportunity publishing is not implemented for this connection' };
  }
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
    if (r.status === 401) return { ok: false, error: 'x: access token rejected', tokenExpired: true };
    if (r.status === 403) return { ok: false, error: 'x: permission denied' };
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
    const r = await safeFetch(graphUrl(`${encodeURIComponent(creationId)}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`));
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
    const c = await safeFetch(graphUrl(`${igUserId}/media`), {
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
    const p = await safeFetch(graphUrl(`${igUserId}/media_publish`), {
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

// ── LinkedIn (current REST APIs — member or organization posts) ───────────────
const LINKEDIN_VERSION = (process.env.LINKEDIN_API_VERSION || '202609').trim();
const LINKEDIN_HEADERS = (accessToken: string): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  'X-Restli-Protocol-Version': '2.0.0',
  'LinkedIn-Version': LINKEDIN_VERSION,
});

/**
 * LinkedIn organization identifiers are numeric IDs, not public company slugs.
 * Accept only a full person/organization URN or a bare numeric organization ID.
 */
export function normalizeLinkedInAuthorUrn(raw: string): string | null {
  const v = raw.trim();
  if (/^urn:li:organization:\d+$/.test(v) || /^urn:li:person:[A-Za-z0-9_-]+$/.test(v)) return v;
  if (/^\d+$/.test(v)) return `urn:li:organization:${v}`;
  return null;
}

async function waitLinkedInImageAvailable(
  imageUrn: string,
  accessToken: string,
): Promise<{ ready: boolean; error?: string }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
    const r = await safeFetch(
      `https://api.linkedin.com/rest/images/${encodeURIComponent(imageUrn)}`,
      { headers: LINKEDIN_HEADERS(accessToken) },
    );
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) {
        return { ready: false, error: `linkedin: image status ${r.status} ${r.text.slice(0, 120)}` };
      }
      continue;
    }
    const status = String((r.json as { status?: string } | null)?.status || '');
    if (status === 'AVAILABLE') return { ready: true };
    if (status === 'PROCESSING_FAILED') {
      return { ready: false, error: 'linkedin: image processing failed' };
    }
  }
  return { ready: false, error: 'linkedin: image not AVAILABLE before timeout' };
}

async function publishLinkedIn(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const accessToken = String(creds.accessToken || '');
  const rawAuthor = String(creds.authorUrn || creds.organizationId || '');
  const authorUrn = normalizeLinkedInAuthorUrn(rawAuthor);

  if (!accessToken) return { ok: false, error: 'linkedin: missing accessToken' };
  if (!authorUrn) {
    return {
      ok: false,
      error: 'linkedin: author must be a full person/organization URN or numeric organization ID; LinkedIn company URL slugs are not valid organization URNs',
    };
  }
  if (input.requireImage && !input.imageUrl) {
    return { ok: false, error: 'linkedin: image required but no durable image URL was provided' };
  }

  try {
    let mediaUrn: string | null = null;

    if (input.imageUrl) {
      const init = await safeFetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
        method: 'POST',
        headers: LINKEDIN_HEADERS(accessToken),
        body: JSON.stringify({
          initializeUploadRequest: { owner: authorUrn },
        }),
      });

      const value = (init.json as {
        value?: { uploadUrl?: string; image?: string };
      } | null)?.value;
      const uploadUrl = value?.uploadUrl;
      mediaUrn = value?.image ?? null;

      if (!init.ok || !uploadUrl || !mediaUrn) {
        if (init.status === 429) {
          return { ok: false, error: 'linkedin: image initialize rate limited', rateLimited: true };
        }
        if (init.status === 401) {
          return {
            ok: false,
            error: `linkedin: image initialize ${init.status} ${init.text.slice(0, 160)}`,
            tokenExpired: true,
          };
        }
        return { ok: false, error: `linkedin: image initialize ${init.status} ${init.text.slice(0, 160)}` };
      }


      if (!isLinkedInUploadUrl(uploadUrl)) return { ok: false, error: 'linkedin: invalid upload destination' };
      const { bytes, contentType } = await readPublicImage(input.imageUrl);
      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': contentType },
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'error',
      });
      if (!upload.ok) {
        return { ok: false, error: `linkedin: image upload ${upload.status}` };
      }

      const ready = await waitLinkedInImageAvailable(mediaUrn, accessToken);
      if (!ready.ready) return { ok: false, error: ready.error || 'linkedin: image processing failed' };
    }

    const body: Record<string, unknown> = {
      author: authorUrn,
      commentary: input.caption.slice(0, 2900),
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      ...(mediaUrn
        ? {
            content: {
              media: {
                id: mediaUrn,
                title: 'ARIA HUB',
              },
            },
          }
        : {}),
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    const r = await safeFetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: LINKEDIN_HEADERS(accessToken),
      body: JSON.stringify(body),
    });

    if (r.ok) {
      const id =
        r.headers.get('x-restli-id') ||
        (r.json as { id?: string } | null)?.id ||
        null;
      return {
        ok: true,
        id,
        permalink: id ? `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}` : null,
      };
    }
    if (r.status === 429) return { ok: false, error: 'linkedin: 429 rate limited', rateLimited: true };
    if (r.status === 401) {
      return { ok: false, error: `linkedin: 401 ${r.text.slice(0, 160)}`, tokenExpired: true };
    }
    if (r.status === 403) {
      return { ok: false, error: `linkedin: 403 permission denied ${r.text.slice(0, 160)}` };
    }
    return { ok: false, error: `linkedin: ${r.status} ${r.text.slice(0, 180)}` };
  } catch (e) {
    return { ok: false, error: `linkedin: ${errOf(e)}` };
  }
}


// ── WhatsApp Business Platform ───────────────────────────────────────────────
export type WhatsAppMode = 'individual' | 'group' | 'channel';

export function resolveWhatsAppMode(creds: Record<string, unknown>): WhatsAppMode {
  const explicit = String(creds.mode || '').trim().toLowerCase();
  if (explicit === 'individual' || explicit === 'group' || explicit === 'channel') return explicit;
  // Preserve old configurations honestly: the old UI stored channelId and
  // incorrectly sent it through the 1:1 /messages endpoint.
  if (creds.channelId) return 'channel';
  if (creds.groupId) return 'group';
  return 'individual';
}

function whatsappMessagePayload(
  target: string,
  input: PublishInput,
  recipientType: 'individual' | 'group',
): Record<string, unknown> {
  const text = input.link ? `${input.caption}\n\n🔗 ${input.link}` : input.caption;
  return {
    messaging_product: 'whatsapp',
    recipient_type: recipientType,
    to: target,
    type: input.imageUrl ? 'image' : 'text',
    ...(input.imageUrl
      ? { image: { link: input.imageUrl, caption: text.slice(0, 1000) } }
      : { text: { preview_url: true, body: text.slice(0, 4000) } }),
  };
}

async function publishWhatsApp(creds: Record<string, unknown>, input: PublishInput): Promise<PublishResult> {
  const accessToken = String(creds.accessToken || '');
  const phoneNumberId = String(creds.phoneNumberId || '');
  const mode = resolveWhatsAppMode(creds);

  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'whatsapp: missing accessToken/phoneNumberId' };
  }
  if (input.requireImage && !input.imageUrl) {
    return { ok: false, error: 'whatsapp: image required but no durable image URL was provided' };
  }

  if (mode === 'channel') {
    return {
      ok: false,
      error: 'whatsapp: Channel publishing is not supported by the configured official Business API connection; a WhatsApp Channel link/ID cannot be sent through /messages',
    };
  }

  if (mode === 'group' && process.env.WHATSAPP_GROUPS_API_ENABLED !== '1') {
    return { ok: false, error: 'whatsapp: Groups API is not enabled for this deployment; verify official endpoint and account eligibility first' };
  }

  const target = mode === 'group'
    ? String(creds.groupId || '')
    : String(creds.recipient || creds.recipientPhone || '');
  if (!target) {
    return {
      ok: false,
      error: mode === 'group'
        ? 'whatsapp: group mode requires groupId'
        : 'whatsapp: individual mode requires recipient phone/WA ID',
    };
  }

  try {
    const endpoint = mode === 'group'
      ? graphUrl(`${encodeURIComponent(phoneNumberId)}/group_messages`)
      : graphUrl(`${encodeURIComponent(phoneNumberId)}/messages`);
    const body = whatsappMessagePayload(target, input, mode === 'group' ? 'group' : 'individual');
    const r = await safeFetch(endpoint, {
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
    const raw = r.text.slice(0, 180);
    const eligibilityHint = mode === 'group' && (r.status === 400 || r.status === 403)
      ? ' (Groups API must be enabled for this WABA/phone number and the group must be an API-managed WhatsApp group)'
      : '';
    return {
      ok: false,
      error: `whatsapp: ${mode} ${r.status} ${raw}${eligibilityHint}`,
      ...cls,
    };
  } catch (e) {
    return { ok: false, error: `whatsapp: ${errOf(e)}` };
  }
}


export interface ConnectionCheckResult {
  ok: boolean;
  error?: string;
  identity?: string;
  details?: Record<string, string | number | boolean | null>;
}

async function checkFacebookConnection(creds: Record<string, unknown>): Promise<ConnectionCheckResult> {
  const pageId = String(creds.pageId || '');
  const accessToken = String(creds.accessToken || '');
  if (!pageId || !accessToken) return { ok: false, error: 'facebook: missing pageId/accessToken' };

  const r = await safeFetch(
    graphUrl(`${encodeURIComponent(pageId)}?fields=id,name&access_token=${encodeURIComponent(accessToken)}`),
  );
  if (!r.ok) {
    const cls = classifyGraph(r.json, r.status);
    const msg = (r.json as { error?: { message?: string } } | null)?.error?.message || r.text.slice(0, 160);
    return {
      ok: false,
      error: cls.tokenExpired ? `facebook: token rejected — ${msg}` : `facebook: ${r.status} ${msg}`,
    };
  }
  const data = r.json as { id?: string; name?: string } | null;
  return {
    ok: true,
    identity: data?.name || data?.id || pageId,
    details: {
      pageId: data?.id || pageId,
      graphVersion: META_GRAPH_VERSION,
    },
  };
}

async function checkInstagramConnection(creds: Record<string, unknown>): Promise<ConnectionCheckResult> {
  const igUserId = String(creds.igUserId || '');
  const accessToken = String(creds.accessToken || '');
  if (!igUserId || !accessToken) return { ok: false, error: 'instagram: missing igUserId/accessToken' };

  const r = await safeFetch(
    graphUrl(`${encodeURIComponent(igUserId)}?fields=id,username&access_token=${encodeURIComponent(accessToken)}`),
  );
  if (!r.ok) {
    const cls = classifyGraph(r.json, r.status);
    const msg = (r.json as { error?: { message?: string } } | null)?.error?.message || r.text.slice(0, 160);
    return {
      ok: false,
      error: cls.tokenExpired ? `instagram: token rejected — ${msg}` : `instagram: ${r.status} ${msg}`,
    };
  }
  const data = r.json as { id?: string; username?: string } | null;
  return {
    ok: true,
    identity: data?.username ? `@${data.username}` : data?.id || igUserId,
    details: {
      igUserId: data?.id || igUserId,
      graphVersion: META_GRAPH_VERSION,
    },
  };
}

async function checkWhatsAppConnection(creds: Record<string, unknown>): Promise<ConnectionCheckResult> {
  const accessToken = String(creds.accessToken || '');
  const phoneNumberId = String(creds.phoneNumberId || '');
  const mode = resolveWhatsAppMode(creds);
  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'whatsapp: missing accessToken/phoneNumberId' };
  }

  if (mode === 'channel') {
    return {
      ok: false,
      error: 'whatsapp: this is configured as a Channel, but the official Business API connection used here does not expose Channel posting through /messages',
      details: { mode, graphVersion: META_GRAPH_VERSION },
    };
  }

  if (mode === 'individual') {
    const recipient = String(creds.recipient || creds.recipientPhone || '');
    if (!recipient) return { ok: false, error: 'whatsapp: individual mode requires recipient phone/WA ID' };
    const r = await safeFetch(
      graphUrl(`${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name&access_token=${encodeURIComponent(accessToken)}`),
    );
    if (!r.ok) {
      const cls = classifyGraph(r.json, r.status);
      return {
        ok: false,
        error: cls.tokenExpired
          ? 'whatsapp: access token rejected'
          : `whatsapp: phone-number check ${r.status} ${r.text.slice(0, 140)}`,
      };
    }
    const data = r.json as { display_phone_number?: string; verified_name?: string } | null;
    if(data?.verified_name?.toLowerCase()==='test number')return {
      ok:false,error:'whatsapp: Meta Test Number is not a production sender. Register a real business number before enabling private or scheduled recipient messages.',
      details:{mode,recipient,testNumber:true,channelPublishing:false,deliveryVerified:false,graphVersion:META_GRAPH_VERSION}
    };
    return {
      ok: true,
      identity: data?.verified_name || data?.display_phone_number || phoneNumberId,
      details: { mode, recipient, graphVersion: META_GRAPH_VERSION,channelPublishing:false,deliveryVerified:false },
    };
  }

  if (process.env.WHATSAPP_GROUPS_API_ENABLED !== '1') return { ok: false, error: 'whatsapp: Groups API is not enabled for this deployment' };
  const groupId = String(creds.groupId || '');
  if (!groupId) return { ok: false, error: 'whatsapp: group mode requires groupId' };
  const r = await safeFetch(
    graphUrl(`${encodeURIComponent(groupId)}?access_token=${encodeURIComponent(accessToken)}`),
  );
  if (!r.ok) {
    const cls = classifyGraph(r.json, r.status);
    return {
      ok: false,
      error: cls.tokenExpired
        ? 'whatsapp: access token rejected'
        : `whatsapp: group check ${r.status} ${r.text.slice(0, 140)} — Groups API must be enabled and this must be an API-managed group`,
    };
  }
  return {
    ok: true,
    identity: groupId,
    details: { mode, groupId, graphVersion: META_GRAPH_VERSION, groupsApi: true },
  };
}

async function checkPlatformConnectionInternal(
  platform: string,
  creds: Record<string, unknown>,
): Promise<ConnectionCheckResult> {
  if (platform === 'facebook') return checkFacebookConnection(creds);
  if (platform === 'instagram') return checkInstagramConnection(creds);
  if (platform === 'whatsapp') return checkWhatsAppConnection(creds);
  if (platform === 'linkedin') {
    const accessToken = String(creds.accessToken || '');
    const authorUrn = normalizeLinkedInAuthorUrn(String(creds.authorUrn || creds.organizationId || ''));
    if (!accessToken) return { ok: false, error: 'linkedin: missing accessToken' };
    if (!authorUrn) {
      return {
        ok: false,
        error: 'linkedin: enter a numeric organization ID or a full urn:li:organization / urn:li:person value',
      };
    }
    return {
      ok: true,
      identity: authorUrn,
      details: {
        authorUrn,
        linkedinVersion: LINKEDIN_VERSION,
        note: 'Configuration format is valid. End-to-end permissions are verified by a queued media post.',
      },
    };
  }
  return { ok: false, error: `${platform}: non-posting connection check is not implemented yet` };
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

  try {
    const result = await fn(creds, input);
    if (result.ok && !result.id) return { ok: false, error: 'publish outcome unknown — response omitted a post/message identifier' };
    return {
      ...result,
      ...(result.error ? { error: redactSocialError(result.error, creds) } : {}),
      ...(result.downgraded ? { downgraded: redactSocialError(result.downgraded, creds) } : {}),
    };
  } catch {
    return { ok: false, error: 'publish outcome unknown — verify the destination before retrying' };
  }
}

export function isLinkedInUploadUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      (url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com') || url.hostname.endsWith('.licdn.com'));
  } catch { return false; }
}

export function redactSocialError(message: string, creds: Record<string, unknown>): string {
  let safe = message;
  for (const [key, value] of Object.entries(creds)) {
    if (/token|secret|password|key/i.test(key) && typeof value === 'string' && value.length >= 4) {
      safe = safe.split(value).join('[redacted]').split(encodeURIComponent(value)).join('[redacted]');
    }
  }
  return safe.replace(/https?:\/\/[^\s]+/g, '[remote URL]').slice(0, 500);
}

export async function checkPlatformConnection(platform: string, creds: Record<string, unknown>): Promise<ConnectionCheckResult> {
  try {
    const result = await checkPlatformConnectionInternal(platform, creds);
    return { ...result, ...(result.error ? { error: redactSocialError(result.error, creds) } : {}) };
  } catch {
    return { ok: false, error: platform + ': connection check failed' };
  }
}
