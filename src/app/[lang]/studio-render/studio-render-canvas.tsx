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
import { resolveTheme } from '@/lib/social/themes';
import type { Lang } from '@/lib/i18n-config';
import type { PostTemplate } from '@/lib/social/brand';

interface RenderProps {
  template: PostTemplate;
  lang: Lang;
  size: PosterSize;
  themeId?: string;
  layout?: string;
  title?: string;
  note?: string;
  seriesNo?: number;
  deadlineDate?: string | null;
  newsDate?: string | null;
  checklist?: string[];
  stat?: { value: string; label: string };
  person?: { name: string; meta: string };
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
      const parsed = JSON.parse(decodeURIComponent(p)) as RenderProps;
      if (!parsed || typeof parsed.template !== 'string') return null;
      return parsed;
    } catch {
      return null;
    }
  }, [p]);

  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!props) return;
    const slug = props.posterData?.slug;
    const url = slug
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
      <div data-studio-canvas="1">
        {props.template === 'spotlight' && props.posterData ? (
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
            title={String(props.title ?? '')}
            note={props.note}
            seriesNo={props.seriesNo}
            deadlineDate={props.deadlineDate ?? null}
            newsDate={props.newsDate ?? null}
            checklist={props.checklist}
            stat={props.stat}
            person={props.person}
            qrDataUrl={qr}
          />
        )}
      </div>
    </div>
  );
}
