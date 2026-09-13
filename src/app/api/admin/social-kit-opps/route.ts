import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/social-kit-opps?q=…&type=… — published-opportunities search
 * for the Brand Studio content picker (formerly the Social Kit picker).
 *
 * - `q` searches across title (en), titleI18n fa/ps text, slug and organization
 *   so the owner can find listings in ANY language. Empty `q` returns the
 *   full library (featured first) so the picker is browsable without typing.
 * - `type` filters by category family. Accepts the UI's plural labels
 *   (jobs | scholarships | internships | trainings) AND the raw DB slugs
 *   (job | scholarship | internship | training, plus ngo-job, fellowship…).
 * - Ordered: featured first, then soonest deadline (undated last).
 */

/** UI filter value → every matching DB category slug. */
const TYPE_FAMILIES: Record<string, string[]> = {
  jobs: ['job', 'ngo-job', 'government-job', 'remote-job'],
  scholarships: ['scholarship', 'fellowship'],
  internships: ['internship'],
  trainings: ['training'],
};

function resolveTypeSlugs(type: string): string[] | null {
  if (!type || type === 'all') return null;
  if (TYPE_FAMILIES[type]) return TYPE_FAMILIES[type];
  // Raw DB slug (job, scholarship, fellowship, ngo-job…) — match exactly.
  return [type];
}

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const type = (req.nextUrl.searchParams.get('type') || '').trim();
  const typeSlugs = resolveTypeSlugs(type);

  const where: Prisma.OpportunityWhereInput = {
    status: 'published',
    ...(typeSlugs ? { category: { slug: { in: typeSlugs } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { slug: { contains: q } },
            { organization: { contains: q } },
            // JSON text search across all titleI18n languages (fa/ps/en)
            { titleI18n: { path: ['fa'], string_contains: q } },
            { titleI18n: { path: ['ps'], string_contains: q } },
            { titleI18n: { path: ['en'], string_contains: q } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.opportunity.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 120,
      select: {
        id: true,
        title: true,
        titleI18n: true,
        slug: true,
        deadline: true,
        featured: true,
        organization: true,
        salary: true,
        salaryI18n: true,
        country: true,
        category: { select: { name: true, nameI18n: true, slug: true } },
      },
    }),
    db.opportunity.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}
