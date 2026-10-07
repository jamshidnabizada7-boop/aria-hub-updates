import { NextResponse } from 'next/server';
import { registerClient } from '@/lib/mcp-oauth';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Request body must be JSON' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const clientName = typeof body.client_name === 'string' ? body.client_name : 'ChatGPT MCP Client';
    const redirectUris = Array.isArray(body.redirect_uris)
      ? body.redirect_uris.map(String)
      : ['https://chatgpt.com/api/auth/oauth_callback'];

    const client = registerClient({
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: Array.isArray(body.grant_types) ? body.grant_types.map(String) : undefined,
      response_types: Array.isArray(body.response_types) ? body.response_types.map(String) : undefined,
      token_endpoint_auth_method:
        typeof body.token_endpoint_auth_method === 'string' ? body.token_endpoint_auth_method : 'none',
    });

    return NextResponse.json(
      {
        client_id: client.client_id,
        client_secret: client.client_secret,
        client_id_issued_at: Math.floor(client.created_at / 1000),
        client_secret_expires_at: 0,
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        grant_types: client.grant_types,
        response_types: client.response_types,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
      },
      {
        status: 201,
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json(
      { error: 'server_error', error_description: msg },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
