import { NextResponse } from 'next/server';
import { registerClient } from '@/lib/mcp-oauth';
import { checkRateLimit,clientIpOf } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: Request) {
  if(!checkRateLimit(`mcp-register:${clientIpOf(request)}`,30,3600000))return NextResponse.json({error:'rate_limited'},{status:429,headers:CORS_HEADERS});
  try {
    let body: Record<string, unknown> = {};
    try {
      const text=await request.text();if(text.length>20000)throw new Error('Request too large');body=JSON.parse(text);
      if(!body||Array.isArray(body)||typeof body!=='object')throw new Error('JSON object required');
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

    const client = await registerClient({
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
      { error: 'invalid_client_metadata', error_description: /redirect|auth_method/.test(msg)?msg:'Registration could not be completed' },
      { status: /redirect|auth_method/.test(msg)?400:503, headers: CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
