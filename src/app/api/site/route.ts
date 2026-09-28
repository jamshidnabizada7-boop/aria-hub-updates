import { NextResponse } from 'next/server';
import { getSiteData } from '@/lib/get-site';

// GET /api/site — returns all public site data in one cached payload
export async function GET() {
  try {
    const data = await getSiteData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading site data API payload:', error);
    return NextResponse.json({ error: 'Failed to load site data' }, { status: 500 });
  }
}
