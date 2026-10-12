'use client';

/**
 * StudioRenderCanvas — the client half of the headless brand renderer.
 * Gated server-side by the page (SOCIAL_RENDER_TOKEN); receives the parsed
 * poster props and renders ONE 1080px canvas for pixel-exact screenshots.
 */
import { useMemo, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { OpportunityPoster, buildPosterData } from '@/components/site/opportunity-poster';
import { SocialCanvas, type PosterSize } from '@/lib/social/templates';
import { PremiumSocialCanvas } from '@/lib/social/studio/premium-canvas';
import type { DesignFamilyId, StudioMediaConfig } from '@/lib/social/studio/types';
import { resolveTheme } from '@/lib/social/themes';
import type { Lang } from '@/lib/i18n-config';
import type { PostTemplate } from '@/lib/social/brand';
import { DiscoveryCanvas } from '@/lib/social/discovery/canvas';
import { discoveryUrl, type DiscoverySnapshot, type DiscoveryStyle } from '@/lib/social/discovery/catalog';

interface RenderProps {
  collection?: DiscoverySnapshot;
  campaignStyle?: DiscoveryStyle;
  queueId?: string;
  platform?: string;
  sourceSlug?: string;
  visualUrl?: string | null;
  template: PostTemplate;
  lang: Lang;
  size: PosterSize;
  themeId?: string;
  layout?: string;
  designFamily?: DesignFamilyId;
  title?: string;
  note?: string;
  seriesNo?: number;
  deadlineDate?: string | null;
  newsDate?: string | null;
  checklist?: string[];
  stat?: { value: string; label: string };
  packages?: { value: string; label: string; sub?: string }[];
  dateBadge?: { big: string; small?: string };
  person?: { name: string; meta: string };
  eyebrow?: string;
  category?: string;
  organization?: string;
  country?: string;
  location?: string;
  salary?: string;
  funding?: string;
  badge?: string;
  cta?: string;
  media?: StudioMediaConfig;
  posterData?: {
    slug: string; title: string; titleI18n: Record<string, string> | null;
    organization: string | null; country: string | null; deadline: string | null;
    featured: boolean; salary: string | null; salaryI18n: Record<string, string> | null;
    category: { name: string; nameI18n: Record<string, string> | null } | null;
  } | null;
}

export default function StudioRenderCanvas({ p }: { p?: string }) {

  const props = useMemo<RenderProps | null>(() => {
    try {
      if (!p) return null;
      const parsed = JSON.parse(p) as RenderProps;
      if (!parsed || typeof parsed.template !== 'string') return null;
      return parsed;
    } catch {
      return null;
    }
  }, [p]);

  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!props) return;
    const slug = props.sourceSlug || props.posterData?.slug;
    const url = props.collection ? discoveryUrl(props.collection.spec, props.lang, props.queueId, props.platform) : slug
      ? `https://www.myariahub.com/${props.lang}/opportunities/${slug}`
      : 'https://www.myariahub.com';
    const th = resolveTheme(props.themeId);
    QRCode.toDataURL(url, { margin: 0, width: 168, color: { dark: th.qrDark, light: th.qrLight } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [props]);

  if (!props) {
    return <div className="grid h-screen place-items-center text-sm text-muted-foreground">studio-render: missing ?p= props</div>;
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-white p-0">
      <div data-studio-canvas="1" data-render-ready={qr ? "1" : "0"}>
        {props.template === 'collection' && props.collection ? <DiscoveryCanvas snapshot={props.collection} lang={props.lang} size={props.size} style={props.campaignStyle} qrDataUrl={qr}/> : props.designFamily && props.designFamily !== 'legacy' ? (
          <PremiumSocialCanvas
            template={props.template}
            designFamily={props.designFamily}
            lang={props.lang}
            size={props.size || 'square'}
            themeId={props.themeId}
            title={String(props.title ?? '')}
            note={props.note}
            eyebrow={props.eyebrow}
            category={props.category}
            organization={props.organization}
            country={props.country}
            location={props.location}
            salary={props.salary}
            funding={props.funding}
            deadlineDate={props.deadlineDate ?? null}
            badge={props.badge}
            cta={props.cta}
            media={props.media}
            qrDataUrl={qr}
          />
        ) : props.template === 'spotlight' && props.posterData ? (
          <OpportunityPoster
            data={buildPosterData(props.posterData, props.lang)}
            lang={props.lang}
            size={props.size || 'square'}
            themeId={props.themeId}
            qrDataUrl={qr}
          />
        ) : (
          <SocialCanvas
            template={props.template}
            lang={props.lang}
            size={props.size || 'square'}
            themeId={props.themeId}
            layout={props.layout}
            visualUrl={props.visualUrl}
            title={String(props.title ?? '')}
            note={props.note}
            seriesNo={props.seriesNo}
            deadlineDate={props.deadlineDate ?? null}
            newsDate={props.newsDate ?? null}
            checklist={props.checklist}
            stat={props.stat}
            packages={props.packages}
            dateBadge={props.dateBadge}
            person={props.person}
            qrDataUrl={qr}
          />
        )}
      </div>
    </div>
  );
}
