'use client';

/**
 * StudioRenderCanvas — the client half of the headless brand renderer.
 * Gated server-side by the page (SOCIAL_RENDER_TOKEN); receives the parsed
 * poster props and renders ONE 1080px canvas for pixel-exact screenshots.
 */
import { useMemo, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { OpportunityPoster, buildPosterData } from '@/components/site/opportunity-poster';
import { SocialCanvas, type SocialCanvasProps } from '@/lib/social/templates';
import { resolveTheme } from '@/lib/social/themes';
import type { Lang } from '@/lib/i18n-config';
import { getStudioDesignFamily } from '@/lib/social/studio/registry';

type RenderProps = SocialCanvasProps & {
  posterData?: {
    slug: string; title: string; titleI18n: Record<string, string> | null;
    organization: string | null; country: string | null; deadline: string | null;
    featured: boolean; salary: string | null; salaryI18n: Record<string, string> | null;
    category: { name: string; nameI18n: Record<string, string> | null } | null;
  } | null;
};

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
        {props.template === 'spotlight' && props.posterData && !getStudioDesignFamily(props.designFamily).premium ? (
          <OpportunityPoster
            data={buildPosterData(props.posterData, props.lang)}
            lang={props.lang}
            size={props.size || 'square'}
            themeId={props.themeId}
            qrDataUrl={qr}
          />
        ) : (
          <SocialCanvas
            {...props}
            title={String(props.title ?? '')}
            size={props.size || 'square'}
            qrDataUrl={qr}
          />
        )}
      </div>
    </div>
  );
}
