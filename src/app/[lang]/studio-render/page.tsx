import type { Metadata } from 'next';

import StudioRenderCanvas from './studio-render-canvas';

/**
 * Headless brand renderer route — used ONLY by the automation pipeline
 * (playwright screenshot → PNG → social publishing). Not linked in the UI.
 *
 * Access gate: when SOCIAL_RENDER_TOKEN is set (recommended in production),
 * the caller must append `&t=<token>` or the route renders nothing. Without
 * the gate anyone could generate fake "ARIA HUB" branded posters from this
 * domain (brand-spoofing surface flagged in the security audit).
 */
export const metadata: Metadata = {
  title: 'render',
  robots: { index: false, follow: false },
};

export default async function StudioRenderPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; t?: string }>;
}) {
  const { p, t } = await searchParams;
  const expected = process.env.SOCIAL_RENDER_TOKEN;
  if (expected && t !== expected) {
    return <div className="grid h-screen place-items-center text-sm text-muted-foreground">not found</div>;
  }
  return <StudioRenderCanvas p={p} />;
}
