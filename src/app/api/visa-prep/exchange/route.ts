import { NextResponse } from 'next/server';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
let cachedRates: any = null;
let lastFetchTime = 0;

export async function GET() {
  try {
    const now = Date.now();
    
    // Serve from cache if valid
    if (cachedRates && now - lastFetchTime < CACHE_DURATION) {
      return NextResponse.json(cachedRates);
    }

    // Free Open Exchange Rates API or fallback
    // Since we don't have an explicit API key in the context, we will use a free, no-key fallback like open.er-api.com
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    
    if (!response.ok) {
        throw new Error('Failed to fetch rates');
    }
    
    const data = await response.json();
    
    // Update cache
    cachedRates = data;
    lastFetchTime = now;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Exchange API error:', error);
    // Fallback to a hardcoded recent rate if API fails
    return NextResponse.json({
        rates: {
            AFN: 70.5,
            EUR: 0.92,
            USD: 1
        }
    });
  }
}
