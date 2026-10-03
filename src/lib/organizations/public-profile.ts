/**
 * Public organization profile (Phase 15).
 *
 * The ONLY query layer the public organization page may use. It returns a
 * fixed, safe shape: identity, description and ACTIVE opportunities — and
 * deliberately never exposes scraper keys, source roles, trust scores,
 * import status, dedupe confidence or run logs.
 */
import { db } from '@/lib/db';

export interface PublicOrgOpportunity {
  slug: string;
  title: string;
  deadline: Date | null;
  location: string | null;
  jobType: string | null;
  createdAt: Date;
}

export interface PublicOrganization {
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  organizationType: string | null;
  country: string | null;
  description: string | null;
  verified: boolean;
  verifiedAt: Date | null;
  opportunities: PublicOrgOpportunity[];
}

/** Public profile by slug; null when the org is inactive or unknown. */
export async function getPublicOrganization(slug: string, lang: 'en' | 'fa' | 'ps' = 'en'): Promise<PublicOrganization | null> {
  const org = await db.organization.findUnique({
    where: { slug },
    select: {
      name: true, slug: true, logoUrl: true, website: true,
      organizationType: true, country: true, active: true, verified: true, verifiedAt: true,
      description: true, descriptionI18n: true, nameI18n: true,
      opportunities: {
        where: { status: 'published', OR: [{ deadline: null }, { deadline: { gte: new Date() } }] },
        select: {
          slug: true, title: true, titleI18n: true, deadline: true, country: true, jobType: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
  if (!org?.active) return null;

  const i18nName = (org.nameI18n as Record<string, string> | null)?.[lang];
  const i18nDescription = (org.descriptionI18n as Record<string, string> | null)?.[lang];

  return {
    name: i18nName || org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    website: org.website,
    organizationType: org.organizationType,
    country: org.country,
    description: i18nDescription || org.description,
    verified: org.verified,
    verifiedAt: org.verifiedAt,
    opportunities: (org.opportunities as any[]).map((o) => ({
      slug: o.slug,
      title: o.titleI18n?.[lang] || o.title,
      deadline: o.deadline,
      location: o.country, // display location text (employer lane convention / import display)
      jobType: o.jobType,
      createdAt: o.createdAt,
    })),
  };
}
