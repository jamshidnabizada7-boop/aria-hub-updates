import { cookies } from 'next/headers';
import { matchesSecret } from '@/lib/automation/auth';
import type { Metadata } from 'next';

import StudioRenderCanvas from './studio-render-canvas';

/**
 * Headless brand renderer route — used ONLY by the automation pipeline
 * (playwright screenshot → PNG → social publishing). Not linked in the UI.
 *
 * Access gate: when SOCIAL_RENDER_TOKEN is set (recommended in production),
 * the caller must send a scoped HttpOnly aria_render cookie. Without
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
  const { p } = await searchParams;
  const token = (await cookies()).get('aria_render')?.value;
  const expected = process.env.SOCIAL_RENDER_TOKEN;
  if ((expected && !matchesSecret(token, expected)) || (process.env.NODE_ENV === 'production' && !expected)) {
    return <div className="grid h-screen place-items-center text-sm text-muted-foreground">not found</div>;
  }
  return <StudioRenderCanvas p={p} />;
}
