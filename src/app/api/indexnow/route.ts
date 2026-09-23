import { NextResponse } from 'next/server';
import { submitToIndexNow, SITE_HOST, INDEXNOW_KEY } from '@/lib/indexnow';
import { db } from '@/lib/db';

const CORE_PATHS = [
  '/',
  '/opportunities',
  '/deadlines',
  '/services',
  '/blog',
  '/visas',
  '/about',
  '/contact',
  '/employers',
  '/employers/post',
  '/advertise',
  '/cv-builder',
  '/opportunity-matcher',
  '/visa-prep',
  '/interview-prep',
  '/templates',
  '/success-stories',
  '/submit-opportunity',
  '/track',
  '/privacy-policy',
  '/terms-of-service',
];

const LANGS = ['en', 'fa', 'ps'];

export async function GET() {
  const urls: string[] = [];

  // Core multilingual routes
  for (const lang of LANGS) {
    for (const path of CORE_PATHS) {
      urls.push(`https://${SITE_HOST}/${lang}${path === '/' ? '' : path}`);
    }
  }

  // Fetch recent opportunities to submit
  try {
    const opps = await db.opportunity.findMany({
      where: { status: 'published' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { slug: true },
    });
    for (const opp of opps) {
      for (const lang of LANGS) {
        urls.push(`https://${SITE_HOST}/${lang}/opportunities/${opp.slug}`);
      }
    }
  } catch {
    // ignore db error, continue with core paths
  }

  const result = await submitToIndexNow(urls);
  return NextResponse.json({
    ...result,
    key: INDEXNOW_KEY,
    submittedCount: urls.length,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const urls = Array.isArray(body?.urls) ? body.urls : [];
    if (!urls.length) {
      return NextResponse.json({ error: 'Missing urls array in body' }, { status: 400 });
    }
    const result = await submitToIndexNow(urls);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
