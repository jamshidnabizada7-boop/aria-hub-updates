import 'server-only';
import * as jose from 'jose';
import crypto from 'node:crypto';

/**
 * ARIA HUB — MCP OAuth 2.1 Implementation.
 *
 * Implements standards-compliant OAuth 2.1 for the ARIA Translation MCP resource:
 * - RFC 9728 OAuth 2.0 Protected Resource Metadata
 * - RFC 8414 OAuth 2.0 Authorization Server Metadata
 * - RFC 7591 OAuth 2.0 Dynamic Client Registration
 * - RFC 7636 PKCE (S256 mandatory)
 * - RFC 9068 / JWT Profile for OAuth 2.0 Access Tokens (short-lived, narrow scopes)
 *
 * Scopes:
 * - aria.translation.read  -> translationQueueStatus
 * - aria.translation.write -> claimTranslationBatch, commitTranslationBatch, failTranslationBatch
 */

export const MCP_SCOPES = {
  READ: 'aria.translation.read',
  WRITE: 'aria.translation.write',
} as const;

export const SUPPORTED_SCOPES = [MCP_SCOPES.READ, MCP_SCOPES.WRITE];

const ACCESS_TOKEN_TTL = '1h'; // Short-lived access token per §4
const REFRESH_TOKEN_TTL = '30d';
const AUTH_CODE_TTL_SECONDS = 300; // 5 minutes

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com';
  return envUrl.replace(/\/+$/, '');
}

function resolveSecret(): Uint8Array {
  const raw =
    process.env.MCP_OAUTH_SIGNING_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    'aria-mcp-internal-signing-secret-default-key-32b';
  return new TextEncoder().encode(raw);
}

// In-memory single-use code tracking (JTI -> timestamp)
const usedCodes = new Set<string>();

// Dynamic client registry (in-memory + pre-authorized client fallbacks)
export type RegisteredClient = {
  client_id: string;
  client_secret?: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  created_at: number;
};

const clientsStore = new Map<string, RegisteredClient>();

// Initialize default well-known clients (ChatGPT, MCP Inspector)
const DEFAULT_CLIENTS: RegisteredClient[] = [
  {
    client_id: 'chatgpt-mcp-client',
    client_name: 'ChatGPT MCP Translation Worker',
    redirect_uris: [
      'https://chatgpt.com/api/auth/oauth_callback',
      'https://chat.openai.com/aip/oauth/callback',
      'https://platform.openai.com/oauth/callback',
      'http://localhost:3000/callback',
      'http://localhost:5173/callback',
    ],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    created_at: Date.now(),
  },
  {
    client_id: 'mcp-inspector',
    client_name: 'MCP Inspector',
    redirect_uris: ['http://localhost:5173/callback', 'http://localhost:3000/callback', 'https://modelcontextprotocol.io/callback'],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    created_at: Date.now(),
  },
];

for (const client of DEFAULT_CLIENTS) {
  clientsStore.set(client.client_id, client);
}

export function registerClient(data: Partial<RegisteredClient> & { client_name?: string; redirect_uris: string[] }): RegisteredClient {
  const id = `aria_mcp_${crypto.randomBytes(12).toString('hex')}`;
  const secret = `sec_${crypto.randomBytes(24).toString('hex')}`;
  const client: RegisteredClient = {
    client_id: id,
    client_secret: secret,
    client_name: data.client_name || 'ChatGPT Plugin / MCP Client',
    redirect_uris: Array.isArray(data.redirect_uris) && data.redirect_uris.length > 0 ? data.redirect_uris : ['https://chatgpt.com/api/auth/oauth_callback'],
    grant_types: data.grant_types || ['authorization_code', 'refresh_token'],
    response_types: data.response_types || ['code'],
    token_endpoint_auth_method: data.token_endpoint_auth_method || 'none',
    created_at: Date.now(),
  };
  clientsStore.set(id, client);
  return client;
}

export function getClient(clientId: string): RegisteredClient | undefined {
  if (clientsStore.has(clientId)) {
    return clientsStore.get(clientId);
  }
  // Allow dynamic or on-the-fly client IDs that begin with aria_mcp_
  if (clientId && clientId.startsWith('aria_mcp_')) {
    const fallback: RegisteredClient = {
      client_id: clientId,
      client_name: 'Dynamic MCP Client',
      redirect_uris: [],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      created_at: Date.now(),
    };
    clientsStore.set(clientId, fallback);
    return fallback;
  }
  return undefined;
}

export function getProtectedResourceMetadata() {
  const baseUrl = getBaseUrl();
  return {
    resource: `${baseUrl}/mcp/translation`,
    authorization_servers: [baseUrl],
    scopes_supported: SUPPORTED_SCOPES,
    bearer_methods_supported: ['header'],
    resource_documentation: `${baseUrl}/.well-known/aria-translation-gateway.openapi.yaml`,
  };
}

export function getAuthorizationServerMetadata() {
  const baseUrl = getBaseUrl();
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    revocation_endpoint: `${baseUrl}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: SUPPORTED_SCOPES,
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
  };
}

export async function createAuthorizationCode(params: {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  codeChallengeMethod: string;
}): Promise<string> {
  if (params.codeChallengeMethod !== 'S256') {
    throw new Error('OAuth 2.1 requires code_challenge_method=S256');
  }

  const jti = crypto.randomUUID();
  const secret = resolveSecret();
  const baseUrl = getBaseUrl();

  const code = await new jose.SignJWT({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: params.scopes.join(' '),
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    typ: 'auth_code',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(baseUrl)
    .setExpirationTime(`${AUTH_CODE_TTL_SECONDS}s`)
    .setJti(jti)
    .sign(secret);

  return code;
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  if (!codeVerifier || !codeChallenge) return false;
  const hash = crypto.createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
  return hash === codeChallenge;
}

export async function exchangeAuthCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri?: string;
  clientId?: string;
}): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token: string;
}> {
  const secret = resolveSecret();
  const baseUrl = getBaseUrl();

  let payload: jose.JWTPayload;
  try {
    const res = await jose.jwtVerify(params.code, secret, {
      issuer: baseUrl,
    });
    payload = res.payload;
  } catch {
    throw new Error('invalid_grant: code is invalid or expired');
  }

  if (payload.typ !== 'auth_code') {
    throw new Error('invalid_grant: token is not an authorization code');
  }

  const jti = payload.jti;
  if (!jti || usedCodes.has(jti)) {
    throw new Error('invalid_grant: code has already been used');
  }
  usedCodes.add(jti);
  // Keep set bounded: clean up after 10 minutes
  setTimeout(() => usedCodes.delete(jti), 10 * 60 * 1000);

  // Validate client ID if provided
  if (params.clientId && payload.client_id && params.clientId !== payload.client_id) {
    throw new Error('invalid_grant: client_id mismatch');
  }

  // Validate redirect URI if present in code
  if (payload.redirect_uri && params.redirectUri) {
    const codeUri = String(payload.redirect_uri);
    if (codeUri !== params.redirectUri) {
      throw new Error('invalid_grant: redirect_uri mismatch');
    }
  }

  // Validate PKCE S256
  const codeChallenge = String(payload.code_challenge || '');
  if (!verifyPkce(params.codeVerifier, codeChallenge)) {
    throw new Error('invalid_grant: PKCE verification failed');
  }

  const clientId = String(payload.client_id || 'unknown');
  const scopeStr = String(payload.scope || `${MCP_SCOPES.READ} ${MCP_SCOPES.WRITE}`);
  const scopes = scopeStr.split(' ').filter(Boolean);

  const tokens = await issueTokens(clientId, scopes);
  return tokens;
}

export async function exchangeRefreshToken(params: {
  refreshToken: string;
  clientId?: string;
  scopes?: string[];
}): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token: string;
}> {
  const secret = resolveSecret();
  const baseUrl = getBaseUrl();

  let payload: jose.JWTPayload;
  try {
    const res = await jose.jwtVerify(params.refreshToken, secret, {
      issuer: baseUrl,
    });
    payload = res.payload;
  } catch {
    throw new Error('invalid_grant: refresh token is invalid or expired');
  }

  if (payload.typ !== 'refresh') {
    throw new Error('invalid_grant: token is not a refresh token');
  }

  const clientId = String(payload.client_id || 'unknown');
  const originalScopes = String(payload.scope || '').split(' ').filter(Boolean);
  const requestedScopes = params.scopes && params.scopes.length > 0 ? params.scopes : originalScopes;

  return issueTokens(clientId, requestedScopes);
}

export async function issueTokens(clientId: string, scopes: string[]) {
  const secret = resolveSecret();
  const baseUrl = getBaseUrl();
  const scopeStr = scopes.join(' ');

  const accessToken = await new jose.SignJWT({
    client_id: clientId,
    scope: scopeStr,
    token_type: 'Bearer',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'at+jwt' })
    .setIssuedAt()
    .setIssuer(baseUrl)
    .setAudience(`${baseUrl}/mcp/translation`)
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setJti(crypto.randomUUID())
    .sign(secret);

  const refreshToken = await new jose.SignJWT({
    client_id: clientId,
    scope: scopeStr,
    typ: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(baseUrl)
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .setJti(crypto.randomUUID())
    .sign(secret);

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600, // 1 hour in seconds
    scope: scopeStr,
    refresh_token: refreshToken,
  };
}

export async function verifyMcpToken(authHeaderOrToken: string): Promise<{
  valid: boolean;
  clientId?: string;
  scopes: string[];
  error?: string;
  status?: number;
}> {
  if (!authHeaderOrToken) {
    return { valid: false, scopes: [], error: 'missing_token', status: 401 };
  }

  const token = authHeaderOrToken.startsWith('Bearer ')
    ? authHeaderOrToken.slice(7).trim()
    : authHeaderOrToken.trim();

  if (!token) {
    return { valid: false, scopes: [], error: 'missing_token', status: 401 };
  }

  const secret = resolveSecret();
  const baseUrl = getBaseUrl();

  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: baseUrl,
      audience: `${baseUrl}/mcp/translation`,
    });

    const clientId = typeof payload.client_id === 'string' ? payload.client_id : 'anonymous';
    const scopeStr = typeof payload.scope === 'string' ? payload.scope : '';
    const scopes = scopeStr.split(' ').filter(Boolean);

    return {
      valid: true,
      clientId,
      scopes,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, scopes: [], error: `invalid_token: ${msg}`, status: 401 };
  }
}
