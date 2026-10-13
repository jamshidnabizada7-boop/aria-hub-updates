import { NextResponse } from 'next/server';
import { getProtectedResourceMetadata } from '@/lib/mcp-oauth';
export const dynamic='force-dynamic';
export async function GET(){return NextResponse.json(getProtectedResourceMetadata('repair'),{headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});}
export async function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS'}});}
