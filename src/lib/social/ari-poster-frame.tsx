import type { ReactNode } from 'react';
import { ariPosterGeometry, type AriPosterConfig } from './ari-poster';
import { resolveTheme } from './themes';

/** Dedicated band preserves every original content/QR pixel with zero overlay collision. */
export function AriPosterFrame({ ari, height, themeId, rtl = false, children }: { ari?: AriPosterConfig; height: number; themeId?: string; rtl?: boolean; children: ReactNode }) {
  const g = ariPosterGeometry(height, ari);
  if (g.preset === 'none') return children;
  const theme = resolveTheme(themeId);
  const align = g.align === 'center' ? 'center' : (g.align === 'start') !== rtl ? 'flex-start' : 'flex-end';
  return <div data-ari-poster={g.preset} style={{ position: 'relative', width: 1080, height, overflow: 'hidden', background: theme.bgBottom }}>
    <div data-ari-content style={{ position: 'absolute', top: 0, left: (1080 - g.contentWidth) / 2, width: 1080, height, transform: `scale(${g.scale})`, transformOrigin: 'top left' }}>{children}</div>
    <div data-ari-band style={{ position: 'absolute', top: g.contentHeight, bottom: 0, left: 48, right: 48, display: 'flex', alignItems: 'center', justifyContent: align }}>
      <img src={`/images/ari/${g.preset}-1024.webp`} alt="" aria-hidden="true" width={g.size} height={g.size} style={{ width: g.size, height: g.size, objectFit: 'contain' }} />
    </div>
  </div>;
}
