import { NextResponse } from 'next/server';
import { exchangeAuthCode, exchangeRefreshToken } from '@/lib/mcp-oauth';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
};

async function parseParams(request: Request): Promise<Record<string, string>> {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      const data = await request.json();
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        out[k] = String(v);
      }
      return out;
    } catch {
      return {};
    }
  }

  // Fallback to x-www-form-urlencoded / formData
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const out: Record<string, string> = {};
    for (const [k, v] of params.entries()) {
      out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const params = await parseParams(request);
    const grantType = params.grant_type;

    if (!grantType) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'grant_type is required' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (grantType === 'authorization_code') {
      const code = params.code;
      const codeVerifier = params.code_verifier;
      const redirectUri = params.redirect_uri;
      const clientId = params.client_id;

      if (!code) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'code is required' },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      if (!codeVerifier) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'code_verifier is required for PKCE' },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      const tokens = await exchangeAuthCode({
        code,
        codeVerifier,
        redirectUri,
        clientId,
      });

      return NextResponse.json(tokens, { status: 200, headers: CORS_HEADERS });
    }

    if (grantType === 'refresh_token') {
      const refreshToken = params.refresh_token;
      const clientId = params.client_id;
      const scopeParam = params.scope;
      const scopes = scopeParam ? scopeParam.split(' ').filter(Boolean) : undefined;

      if (!refreshToken) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'refresh_token is required' },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      const tokens = await exchangeRefreshToken({
        refreshToken,
        clientId,
        scopes,
      });

      return NextResponse.json(tokens, { status: 200, headers: CORS_HEADERS });
    }

    return NextResponse.json(
      { error: 'unsupported_grant_type', error_description: `Grant type '${grantType}' is not supported` },
      { status: 400, headers: CORS_HEADERS },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token exchange failed';
    const isGrantErr = msg.startsWith('invalid_grant');
    return NextResponse.json(
      {
        error: isGrantErr ? 'invalid_grant' : 'invalid_request',
        error_description: msg,
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
