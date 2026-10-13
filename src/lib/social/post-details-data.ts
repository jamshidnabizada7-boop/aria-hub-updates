import { db } from '@/lib/db';
import type { Lang } from '@/lib/lang-route';
import { opportunityLocation, postDetailLines } from './post-details';

export async function readPostDetailLines(contentRef: string | null, content: unknown, lang: Lang): Promise<string[]> {
  const props = content && typeof content === 'object' ? content as Record<string, unknown> : {};
  const collection = props.collection as { spec?: { province?: string; kind?: string } } | undefined;
  if (collection?.spec) return postDetailLines(collection.spec.province ? `${collection.spec.province}, Afghanistan` : '', lang, collection.spec.kind === 'remote');
  const opportunity = contentRef ? await db.opportunity.findUnique({
    where: { slug: contentRef },
    select: { country: true, locations: { select: { country: true, province: true, city: true, confidence: true } }, matchProfile: { select: { reviewed: true, locationType: true } } },
  }) : null;
  return postDetailLines(opportunity ? opportunityLocation(opportunity.locations, opportunity.country) : '', lang,
    opportunity?.matchProfile?.reviewed === true && opportunity.matchProfile.locationType === 'remote');
}
