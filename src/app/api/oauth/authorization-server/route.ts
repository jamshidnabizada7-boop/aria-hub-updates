import { NextResponse } from 'next/server';
import { getAuthorizationServerMetadata } from '@/lib/mcp-oauth';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, max-age=3600',
};

export async function GET() {
  const metadata = getAuthorizationServerMetadata();
  return NextResponse.json(metadata, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
