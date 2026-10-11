export const ARI_POSTER_PRESETS = ['none', 'classic', 'scholar', 'global', 'celebrating'] as const;
export type AriPosterPreset = typeof ARI_POSTER_PRESETS[number];
export interface AriPosterConfig { preset?: AriPosterPreset; size?: number; align?: 'start' | 'center' | 'end' }

/** Untrusted saved/editor props cannot select arbitrary URLs or escape the safe artwork band. */
export function resolveAriPoster(input?: AriPosterConfig | null) {
  const preset = ARI_POSTER_PRESETS.includes(input?.preset as AriPosterPreset) ? input!.preset! : 'none';
  return { preset, size: Math.min(210, Math.max(140, Number.isFinite(input?.size) ? input!.size! : 180)), align: input?.align === 'start' || input?.align === 'end' ? input.align : 'center' as const };
}
export function ariPosterGeometry(height: number, config?: AriPosterConfig | null) {
  const ari = resolveAriPoster(config);
  const band = ari.preset === 'none' ? 0 : ari.size + 24;
  const scale = (height - band) / height;
  return { ...ari, band, scale, contentWidth: 1080 * scale, contentHeight: height - band };
}
