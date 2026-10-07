import 'server-only';
import { Pool } from 'pg';
import { NextResponse } from 'next/server';

/**
 * ChatGPT Translation Gateway (2026-10-07).
 *
 * Thin HTTPS front for the four SECURITY DEFINER RPC functions
 * (claim_translation_batch / commit_translation_batch / fail_translation_batch
 * / translation_queue_status). The route handlers here do exactly four things:
 *
 *   1. authenticate a revocable bearer token (TRANSLATION_GATEWAY_TOKENS),
 *   2. rate-limit per token,
 *   3. call the ONE fixed RPC for this path over a dedicated Postgres
 *      connection that authenticates as the restricted aria_translation_worker
 *      role (ARIA_TRANSLATION_DATABASE_URL) — the role holds zero table
 *      privileges, so even a compromised handler cannot touch arbitrary data,
 *   4. log the outcome (claim id, counts, result, errors — never secrets or
 *      content) and map RPC error codes to HTTP statuses.
 *
 * There is deliberately no arbitrary-SQL or pass-through capability: the SQL
 * for each action is a fixed, parameterized statement.
 */

export type GatewayAction =
  | 'claimTranslationBatch'
  | 'commitTranslationBatch'
  | 'failTranslationBatch'
  | 'translationQueueStatus';

const RPC_BY_ACTION: Record<GatewayAction, string> = {
  claimTranslationBatch:
    'SELECT public.claim_translation_batch($1::int, $2::int, $3::boolean, $4::text) AS result',
  commitTranslationBatch:
    'SELECT public.commit_translation_batch($1::text, $2::jsonb) AS result',
  failTranslationBatch:
    'SELECT public.fail_translation_batch($1::text, $2::jsonb) AS result',
  translationQueueStatus:
    'SELECT public.translation_queue_status() AS result',
};

/** RPC error code → HTTP status (anything unparsed → 500, detail stripped). */
const ERROR_STATUS: Record<string, number> = {
  invalid_limit: 400,
  invalid_budget: 400,
  invalid_claim: 400,
  invalid_payload: 400,
  unknown_field: 400,
  missing_field: 400,
  unknown_or_expired_claim: 404,
  row_not_in_claim: 409,
  source_hash_changed: 409,
  manual_translation_locked: 409,
  persian_not_complete: 422,
  field_invalid: 422,
};

const MAX_BODY_BYTES = 8 * 1024 * 1024;
/** Per-token sliding window: the hourly task needs ~6 calls; this is generous. */
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
/** Status is expensive (queue sweep) and hourly-only — cache it briefly. */
const STATUS_CACHE_MS = 60_000;

type TokenConfig = { name: string; token: string };

function parseTokens(): TokenConfig[] {
  const raw = process.env.TRANSLATION_GATEWAY_TOKENS || '';
  return raw
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf(':');
      return idx === -1
        ? { name: 'unnamed', token: pair }
        : { name: pair.slice(0, idx).trim() || 'unnamed', token: pair.slice(idx + 1).trim() };
    })
    .filter((t) => t.token.length >= 16);
}

const globalForGateway = globalThis as unknown as {
  __tgwPool?: Pool;
  __tgwRate?: Map<string, number[]>;
  __tgwStatusCache?: { at: number; data: unknown } | null;
};

function getPool(): Pool {
  const url = process.env.ARIA_TRANSLATION_DATABASE_URL;
  if (!url) throw Object.assign(new Error('tgw_not_configured'), { code: 'tgw_not_configured' });
  if (!globalForGateway.__tgwPool) {
    globalForGateway.__tgwPool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: 'aria-translation-gateway',
    });
  }
  return globalForGateway.__tgwPool;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function checkRateLimit(name: string): boolean {
  const buckets = (globalForGateway.__tgwRate ??= new Map<string, number[]>());
  const now = Date.now();
  const hits = (buckets.get(name) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    buckets.set(name, hits);
    return false;
  }
  hits.push(now);
  buckets.set(name, hits);
  return true;
}

function json(status: number, body: unknown): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function gatewayLog(fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), gw: 'translation', ...fields }));
}

/** HTTP status for a raised RPC error, with a client-safe message. */
export function mapRpcError(err: unknown): { status: number; code: string; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  const m = message.match(/TGW:([a-z_]+)(?::(.*))?$/i);
  if (m) {
    const code = m[1].toLowerCase();
    return { status: ERROR_STATUS[code] ?? 400, code, message: (m[2] || code).slice(0, 300) };
  }
  const cfg = (err as { code?: string })?.code;
  if (cfg === 'tgw_not_configured') {
    return { status: 503, code: 'gateway_not_configured', message: 'gateway is not configured' };
  }
  gatewayLog({ event: 'rpc_unexpected_error', error: message.slice(0, 400) });
  return { status: 500, code: 'internal_error', message: 'internal error' };
}

export async function executeQueueStatus(): Promise<Record<string, unknown>> {
  const cache = globalForGateway.__tgwStatusCache;
  if (cache && Date.now() - cache.at < STATUS_CACHE_MS) {
    return (cache.data ?? {}) as Record<string, unknown>;
  }
  const pool = getPool();
  const res = await pool.query(RPC_BY_ACTION.translationQueueStatus, []);
  const result = (res.rows[0]?.result ?? {}) as Record<string, unknown>;
  globalForGateway.__tgwStatusCache = { at: Date.now(), data: result };
  return result;
}

export async function executeClaimBatch(
  limit: unknown = 30,
  charBudget: unknown = 250_000,
  includeExpired = false,
  caller = 'chatgpt',
): Promise<Record<string, unknown>> {
  const pool = getPool();
  const l = clampInt(limit, 30, 1, 50);
  const b = clampInt(charBudget, 250_000, 2_000, 600_000);
  const res = await pool.query(RPC_BY_ACTION.claimTranslationBatch, [l, b, includeExpired === true, caller]);
  return (res.rows[0]?.result ?? {}) as Record<string, unknown>;
}

export async function executeCommitBatch(
  claimId: string,
  translations: unknown,
): Promise<Record<string, unknown>> {
  const pool = getPool();
  const t = Array.isArray(translations) ? { items: translations } : translations;
  const res = await pool.query(RPC_BY_ACTION.commitTranslationBatch, [claimId || '', JSON.stringify(t ?? null)]);
  return (res.rows[0]?.result ?? {}) as Record<string, unknown>;
}

export async function executeFailBatch(
  claimId: string,
  errors?: unknown,
): Promise<Record<string, unknown>> {
  const pool = getPool();
  const res = await pool.query(RPC_BY_ACTION.failTranslationBatch, [claimId || '', JSON.stringify(errors ?? null)]);
  return (res.rows[0]?.result ?? {}) as Record<string, unknown>;
}

export async function handleGatewayRequest(
  request: Request,
  action: GatewayAction,
): Promise<NextResponse> {
  const started = Date.now();
  const finish = (status: number, body: unknown, extra?: Record<string, unknown>) => {
    gatewayLog({ action, status, ms: Date.now() - started, ...extra });
    return json(status, body);
  };

  const tokens = parseTokens();
  if (!tokens.length) {
    return finish(503, { ok: false, error: { code: 'gateway_not_configured', message: 'gateway is not configured' } });
  }

  // ── auth (revocable bearer credential) ──
  const header = request.headers.get('authorization') || '';
  const presented = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const matched = presented ? tokens.find((t) => timingSafeEqual(t.token, presented)) : undefined;
  if (!matched) {
    return finish(401, { ok: false, error: { code: 'unauthorized', message: 'invalid or missing credential' } }, { token: null });
  }
  if (!checkRateLimit(matched.name)) {
    return json(429, { ok: false, error: { code: 'rate_limited', message: 'too many requests' } });
  }

  // ── body (guarded size; fixed per-action shape) ──
  let body: Record<string, unknown> = {};
  const declaredLen = Number(request.headers.get('content-length') || '0');
  if (declaredLen > MAX_BODY_BYTES) {
    return finish(413, { ok: false, error: { code: 'payload_too_large', message: 'request body too large' } }, { token: matched.name });
  }
  if (action !== 'translationQueueStatus') {
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) {
        return finish(413, { ok: false, error: { code: 'payload_too_large', message: 'request body too large' } }, { token: matched.name });
      }
      body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    } catch {
      return finish(400, { ok: false, error: { code: 'invalid_payload', message: 'request body must be a JSON object' } }, { token: matched.name });
    }
  }

  // ── fixed RPC dispatch ──
  try {
    let result: unknown;

    if (action === 'translationQueueStatus') {
      result = await executeQueueStatus();
    } else if (action === 'claimTranslationBatch') {
      result = await executeClaimBatch(body.limit, body.charBudget, body.includeExpired === true, 'chatgpt');
    } else if (action === 'commitTranslationBatch') {
      const claimId = typeof body.claimId === 'string' ? body.claimId : '';
      result = await executeCommitBatch(claimId, body.translations);
    } else {
      // failTranslationBatch
      const claimId = typeof body.claimId === 'string' ? body.claimId : '';
      result = await executeFailBatch(claimId, body.errors);
    }

    const r = (result ?? {}) as Record<string, unknown>;
    const count = typeof r.count === 'number' ? r.count : typeof r.committed === 'number' ? r.committed : undefined;
    return finish(200, { ok: true, ...r }, { token: matched.name, claimId: r.claimId, count });
  } catch (err) {
    const mapped = mapRpcError(err);
    return finish(mapped.status, { ok: false, error: mapped }, { token: matched.name });
  }
}

function clampInt(value: unknown, dflt: number, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : dflt;
  return Math.min(max, Math.max(min, n));
}
