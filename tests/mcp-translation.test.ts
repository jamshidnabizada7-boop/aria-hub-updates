import { describe, test, expect } from 'bun:test';
import crypto from 'node:crypto';
import {
  MCP_SCOPES,
  SUPPORTED_SCOPES,
  getProtectedResourceMetadata,
  getAuthorizationServerMetadata,
  registerClient,
  getClient,
  createAuthorizationCode,
  verifyPkce,
  exchangeAuthCode,
  exchangeRefreshToken,
  issueTokens,
  verifyMcpToken,
} from '../src/lib/mcp-oauth';
import { POST as handleMcpPost, GET as handleMcpGet, OPTIONS as handleMcpOptions } from '../src/app/mcp/translation/route';
import { GET as handleProtectedResourceGet } from '../src/app/api/oauth/protected-resource/route';
import { GET as handleAuthServerGet } from '../src/app/api/oauth/authorization-server/route';
import { POST as handleRegisterPost } from '../src/app/oauth/register/route';
import { POST as handleTokenPost } from '../src/app/oauth/token/route';

describe('ARIA Translation MCP — OAuth 2.1 & Discovery Suite', () => {
  test('Protected Resource Metadata adheres to RFC 9728', async () => {
    const meta = getProtectedResourceMetadata();
    expect(meta.resource).toContain('/mcp/translation');
    expect(meta.authorization_servers).toBeArray();
    expect(meta.scopes_supported).toContain(MCP_SCOPES.READ);
    expect(meta.scopes_supported).toContain(MCP_SCOPES.WRITE);
    expect(meta.bearer_methods_supported).toContain('header');

    // Test route handler
    const res = await handleProtectedResourceGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resource).toBe(meta.resource);
  });

  test('Authorization Server Metadata adheres to RFC 8414', async () => {
    const meta = getAuthorizationServerMetadata();
    expect(meta.issuer).toBeString();
    expect(meta.authorization_endpoint).toContain('/oauth/authorize');
    expect(meta.token_endpoint).toContain('/oauth/token');
    expect(meta.registration_endpoint).toContain('/oauth/register');
    expect(meta.code_challenge_methods_supported).toContain('S256');
    expect(meta.response_types_supported).toContain('code');
    expect(meta.grant_types_supported).toContain('authorization_code');
    expect(meta.grant_types_supported).toContain('refresh_token');

    // Test route handler
    const res = await handleAuthServerGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token_endpoint).toBe(meta.token_endpoint);
  });

  test('Dynamic Client Registration (RFC 7591) generates valid credentials', async () => {
    const regReq = new Request('http://localhost/oauth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Test Client',
        redirect_uris: ['https://example.org/cb'],
      }),
    });
    const regRes = await handleRegisterPost(regReq);
    expect(regRes.status).toBe(201);
    const client = await regRes.json();
    expect(client.client_id).toBeString();
    expect(client.client_id.startsWith('aria_mcp_')).toBe(true);
    expect(client.client_name).toBe('Test Client');
    expect(client.redirect_uris).toEqual(['https://example.org/cb']);

    // Lookup client in store
    const stored = getClient(client.client_id);
    expect(stored).toBeDefined();
    expect(stored?.client_id).toBe(client.client_id);
  });

  test('PKCE S256 verification functions correctly', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');

    expect(verifyPkce(verifier, challenge)).toBe(true);
    expect(verifyPkce('wrong_verifier', challenge)).toBe(false);
    expect(verifyPkce('', challenge)).toBe(false);
  });

  test('OAuth 2.1 code exchange enforces single-use and PKCE verification', async () => {
    const verifier = 'test-code-verifier-string-1234567890-abcdefg';
    const challenge = crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
    const redirectUri = 'https://example.org/cb';
    const clientId = 'chatgpt-mcp-client';

    const badCode = await createAuthorizationCode({
      clientId,
      redirectUri,
      scopes: [MCP_SCOPES.READ, MCP_SCOPES.WRITE],
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
    });

    // Exchange with wrong verifier fails
    const badReq = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: badCode,
        code_verifier: 'bad_verifier',
        redirect_uri: redirectUri,
        client_id: clientId,
      }),
    });
    const badRes = await handleTokenPost(badReq);
    expect(badRes.status).toBe(400);
    const badBody = await badRes.json();
    expect(badBody.error).toBe('invalid_grant');

    const goodCode = await createAuthorizationCode({
      clientId,
      redirectUri,
      scopes: [MCP_SCOPES.READ, MCP_SCOPES.WRITE],
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
    });

    // Exchange with correct verifier succeeds
    const okReq = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: goodCode,
        code_verifier: verifier,
        redirect_uri: redirectUri,
        client_id: clientId,
      }),
    });
    const okRes = await handleTokenPost(okReq);
    expect(okRes.status).toBe(200);
    const tokens = await okRes.json();
    expect(tokens.token_type).toBe('Bearer');
    expect(tokens.access_token).toBeString();
    expect(tokens.refresh_token).toBeString();
    expect(tokens.expires_in).toBe(3600);
    expect(tokens.scope).toContain(MCP_SCOPES.READ);
    expect(tokens.scope).toContain(MCP_SCOPES.WRITE);

    // Replay attack: reusing goodCode must fail
    const replayReq = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: goodCode,
        code_verifier: verifier,
        redirect_uri: redirectUri,
        client_id: clientId,
      }),
    });
    const replayRes = await handleTokenPost(replayReq);
    expect(replayRes.status).toBe(400);
    const replayBody = await replayRes.json();
    expect(replayBody.error).toBe('invalid_grant');

    // Verify token validity
    const verified = await verifyMcpToken(tokens.access_token);
    expect(verified.valid).toBe(true);
    expect(verified.clientId).toBe(clientId);
    expect(verified.scopes).toContain(MCP_SCOPES.READ);
    expect(verified.scopes).toContain(MCP_SCOPES.WRITE);

    // Refresh token exchange works
    const refreshReq = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: clientId,
      }),
    });
    const refreshRes = await handleTokenPost(refreshReq);
    expect(refreshRes.status).toBe(200);
    const newTokens = await refreshRes.json();
    expect(newTokens.access_token).toBeString();
    expect(newTokens.refresh_token).toBeString();
  });
});

describe('ARIA Translation MCP — Streamable HTTP Transport & Tools Suite', () => {
  let writeToken: string;
  let readOnlyToken: string;

  test('Generate test tokens with narrow scopes', async () => {
    const tWrite = await issueTokens('test-writer', [MCP_SCOPES.READ, MCP_SCOPES.WRITE]);
    writeToken = tWrite.access_token;
    expect(writeToken).toBeString();

    const tRead = await issueTokens('test-reader', [MCP_SCOPES.READ]);
    readOnlyToken = tRead.access_token;
    expect(readOnlyToken).toBeString();
  });

  test('CORS OPTIONS preflight returns 204 with required headers', async () => {
    const res = await handleMcpOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  test('MCP initialize returns instructions and tool capabilities', async () => {
    const req = new Request('http://localhost/mcp/translation', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'inspector', version: '0.1.0' },
        },
      }),
    });

    const res = await handleMcpPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jsonrpc).toBe('2.0');
    expect(body.result.instructions).toContain('ARIA HUB translation workflow');
    expect(body.result.serverInfo.name).toBe('aria-hub-translation-gateway');
  });

  test('MCP tools/list exposes EXACTLY the four required tools', async () => {
    const req = new Request('http://localhost/mcp/translation', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    });

    const res = await handleMcpPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const tools = body.result.tools;
    expect(tools.length).toBe(4);

    const names = tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual([
      'claimTranslationBatch',
      'commitTranslationBatch',
      'failTranslationBatch',
      'translationQueueStatus',
    ]);

    // Check annotations
    const statusTool = tools.find((t: { name: string }) => t.name === 'translationQueueStatus');
    expect(statusTool.annotations?.readOnlyHint).toBe(true);

    const claimTool = tools.find((t: { name: string }) => t.name === 'claimTranslationBatch');
    expect(claimTool.annotations?.readOnlyHint).toBe(false);
    expect(claimTool.inputSchema.properties.limit).toBeDefined();
    expect(claimTool.inputSchema.properties.charBudget).toBeDefined();
    expect(claimTool.inputSchema.properties.includeExpired).toBeDefined();

    const commitTool = tools.find((t: { name: string }) => t.name === 'commitTranslationBatch');
    expect(commitTool.description).toContain('Persian');
    expect(commitTool.description).toContain('Pashto');
    expect(commitTool.description).toContain('Never invent');
    expect(commitTool.description).toContain('URLs, emails');
  });

  test('Unauthenticated write tool calls are rejected with HTTP 401', async () => {
    const toolsToTest = ['claimTranslationBatch', 'commitTranslationBatch', 'failTranslationBatch'];
    for (const tool of toolsToTest) {
      const req = new Request('http://localhost/mcp/translation', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: tool,
            arguments: { claimId: 'dummy' },
          },
        }),
      });

      const res = await handleMcpPost(req);
      expect(res.status).toBe(401);
      expect(res.headers.get('WWW-Authenticate')).toContain('Bearer resource_metadata=');
    }
  });

  test('Write tool call with read-only token is rejected with HTTP 403', async () => {
    const req = new Request('http://localhost/mcp/translation', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'authorization': `Bearer ${readOnlyToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'claimTranslationBatch',
          arguments: { limit: 1 },
        },
      }),
    });

    const res = await handleMcpPost(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.code).toBe(-32003);
    expect(body.error?.message).toContain('aria.translation.write');
  });
});
