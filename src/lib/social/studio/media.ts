import type { CSSProperties } from 'react';
import type { StudioVisualRole } from '@/lib/social/studio/registry';

export interface StudioVisualLayer {
  assetId?: string;
  url: string;
  role: StudioVisualRole;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  z: number;
  blur: number;
  brightness: number;
  contrast: number;
  saturation: number;
  borderRadius: number;
  shadow: number;
  glow: number;
  flipX: boolean;
  visible: boolean;
  fit: 'cover' | 'contain';
}

export type StudioMediaState = Partial<Record<StudioVisualRole, StudioVisualLayer>>;

const ROLE_Z: Record<StudioVisualRole, number> = {
  background: 1,
  texture: 2,
  hero: 6,
  foreground: 10,
};

function n(v: unknown, fallback: number): number {
  const parsed = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  return Math.min(max, Math.max(min, n(v, fallback)));
}

export function defaultStudioVisualLayer(
  role: StudioVisualRole,
  url = '',
  assetId?: string,
): StudioVisualLayer {
  return {
    assetId,
    url,
    role,
    x: 50,
    y: 50,
    scale: role === 'background' ? 1 : 0.82,
    rotation: 0,
    opacity: role === 'background' ? 0.42 : 1,
    z: ROLE_Z[role],
    blur: 0,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    borderRadius: 0,
    shadow: role === 'hero' ? 0.55 : 0,
    glow: role === 'hero' ? 0.22 : 0,
    flipX: false,
    visible: true,
    fit: role === 'background' || role === 'texture' ? 'cover' : 'contain',
  };
}

export function sanitizeStudioVisualLayer(
  input: unknown,
  role: StudioVisualRole,
): StudioVisualLayer | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const url = typeof raw.url === 'string' ? raw.url.trim() : '';
  if (!url) return null;
  return {
    assetId: typeof raw.assetId === 'string' ? raw.assetId.slice(0, 160) : undefined,
    url: url.slice(0, 2048),
    role,
    x: clamp(raw.x, -25, 125, 50),
    y: clamp(raw.y, -25, 125, 50),
    scale: clamp(raw.scale, 0.15, 2.5, role === 'background' ? 1 : 0.82),
    rotation: clamp(raw.rotation, -45, 45, 0),
    opacity: clamp(raw.opacity, 0, 1, role === 'background' ? 0.42 : 1),
    z: Math.round(clamp(raw.z, 0, 20, ROLE_Z[role])),
    blur: clamp(raw.blur, 0, 30, 0),
    brightness: clamp(raw.brightness, 0.4, 1.8, 1),
    contrast: clamp(raw.contrast, 0.4, 1.8, 1),
    saturation: clamp(raw.saturation, 0, 2, 1),
    borderRadius: clamp(raw.borderRadius, 0, 240, 0),
    shadow: clamp(raw.shadow, 0, 1, role === 'hero' ? 0.55 : 0),
    glow: clamp(raw.glow, 0, 1, role === 'hero' ? 0.22 : 0),
    flipX: raw.flipX === true,
    visible: raw.visible !== false,
    fit: raw.fit === 'cover' ? 'cover' : raw.fit === 'contain' ? 'contain' : (role === 'background' || role === 'texture' ? 'cover' : 'contain'),
  };
}

export function normalizeStudioMedia(input: unknown, legacyVisualUrl?: string | null): StudioMediaState {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const out: StudioMediaState = {};
  (['background', 'hero', 'foreground', 'texture'] as StudioVisualRole[]).forEach((role) => {
    const layer = sanitizeStudioVisualLayer(raw[role], role);
    if (layer) out[role] = layer;
  });
  if (!out.background && legacyVisualUrl) {
    out.background = defaultStudioVisualLayer('background', legacyVisualUrl);
  }
  return out;
}

export function setStudioMediaLayer(
  media: StudioMediaState,
  role: StudioVisualRole,
  layer: StudioVisualLayer | null,
): StudioMediaState {
  const next = { ...media };
  if (layer) next[role] = sanitizeStudioVisualLayer(layer, role) ?? undefined;
  else delete next[role];
  return next;
}

export function studioVisualLayerStyle(
  layer: StudioVisualLayer,
  options?: { heroWidth?: number; heroHeight?: number },
): CSSProperties {
  const isBackdrop = layer.role === 'background' || layer.role === 'texture';
  const heroWidth = options?.heroWidth ?? 720;
  const heroHeight = options?.heroHeight ?? 720;
  const shadowAlpha = Math.round(layer.shadow * 46) / 100;
  const glowAlpha = Math.round(layer.glow * 42) / 100;
  const filters = [
    `blur(${layer.blur}px)`,
    `brightness(${layer.brightness})`,
    `contrast(${layer.contrast})`,
    `saturate(${layer.saturation})`,
  ].join(' ');
  return isBackdrop
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: layer.fit,
        objectPosition: `${layer.x}% ${layer.y}%`,
        opacity: layer.visible ? layer.opacity : 0,
        transform: `scale(${layer.scale}) rotate(${layer.rotation}deg) scaleX(${layer.flipX ? -1 : 1})`,
        transformOrigin: `${layer.x}% ${layer.y}%`,
        filter: filters,
        borderRadius: layer.borderRadius,
        zIndex: layer.z,
        pointerEvents: 'none',
      }
    : {
        position: 'absolute',
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        width: heroWidth,
        height: heroHeight,
        objectFit: layer.fit,
        opacity: layer.visible ? layer.opacity : 0,
        transform: `translate(-50%, -50%) scale(${layer.scale}) rotate(${layer.rotation}deg) scaleX(${layer.flipX ? -1 : 1})`,
        transformOrigin: 'center',
        filter: filters,
        borderRadius: layer.borderRadius,
        zIndex: layer.z,
        pointerEvents: 'none',
        filterOrigin: 'center',
        boxShadow: layer.shadow > 0
          ? `0 ${Math.round(30 * layer.shadow)}px ${Math.round(76 * layer.shadow)}px rgba(0,0,0,${shadowAlpha})`
          : undefined,
        WebkitFilter: filters,
        // glow is implemented with a drop-shadow so transparent PNG/WebP heroes
        // receive light around their silhouette instead of a rectangular box.
        ...(layer.glow > 0
          ? { filter: `${filters} drop-shadow(0 0 ${Math.round(48 * layer.glow)}px rgba(248,216,152,${glowAlpha}))` }
          : {}),
      };
}

export function studioMediaHasAny(media: StudioMediaState): boolean {
  return Object.values(media).some((layer) => Boolean(layer?.url && layer.visible));
}
