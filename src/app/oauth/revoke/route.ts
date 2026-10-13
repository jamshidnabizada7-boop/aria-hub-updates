import { NextResponse } from 'next/server';
import { revokeMcpToken } from '@/lib/mcp-oauth';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
};

export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text());
  await revokeMcpToken(params.get('token') || '');
  // RFC 7009 specifies returning 200 OK even if token is already invalid/revoked
  return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
