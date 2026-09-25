'use client';

import type { CSSProperties } from 'react';
import {
  DEFAULT_MEDIA_LAYER,
  type StudioMediaLayer,
  type StudioMediaRole,
} from '@/lib/social/studio/types';

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function normalizeMediaLayer(input: StudioMediaLayer | null | undefined): StudioMediaLayer {
  return {
    ...DEFAULT_MEDIA_LAYER,
    ...(input ?? {}),
    x: clamp(input?.x, 0, 100, 50),
    y: clamp(input?.y, 0, 100, 50),
    scale: clamp(input?.scale, 0.2, 3.2, 1),
    rotation: clamp(input?.rotation, -180, 180, 0),
    opacity: clamp(input?.opacity, 0, 1, 1),
    blur: clamp(input?.blur, 0, 24, 0),
    brightness: clamp(input?.brightness, 0.2, 2, 1),
    contrast: clamp(input?.contrast, 0.2, 2, 1),
    saturation: clamp(input?.saturation, 0, 2.5, 1),
    shadow: clamp(input?.shadow, 0, 1, 0.42),
    glow: clamp(input?.glow, 0, 1, 0),
    radius: clamp(input?.radius, 0, 160, 0),
  };
}

export function MediaLayer({
  layer,
  role,
  style,
  ariaHidden = true,
}: {
  layer?: StudioMediaLayer | null;
  role: StudioMediaRole;
  style?: CSSProperties;
  ariaHidden?: boolean;
}) {
  if (!layer?.url || layer.visible === false) return null;
  const l = normalizeMediaLayer(layer);
  const isBackground = role === 'background';
  const shadow = l.shadow ?? DEFAULT_MEDIA_LAYER.shadow;
  const glow = l.glow ?? 0;

  const filter = [
    `blur(${l.blur}px)`,
    `brightness(${l.brightness})`,
    `contrast(${l.contrast})`,
    `saturate(${l.saturation})`,
    `drop-shadow(0 ${Math.round(20 + shadow * 32)}px ${Math.round(30 + shadow * 50)}px rgba(0,0,0,${(0.15 + shadow * 0.45).toFixed(2)}))`,
    glow > 0 ? `drop-shadow(0 0 ${Math.round(18 + glow * 60)}px rgba(248,216,152,${(0.18 + glow * 0.42).toFixed(2)}))` : '',
  ].filter(Boolean).join(' ');

  const transform = [
    isBackground ? '' : 'translate(-50%, -50%)',
    `translate(${((l.x ?? 50) - 50) * 2.2}px, ${((l.y ?? 50) - 50) * 2.2}px)`,
    `scale(${(l.flipX ? -1 : 1) * (l.scale ?? 1)}, ${l.scale ?? 1})`,
    `rotate(${l.rotation ?? 0}deg)`,
  ].filter(Boolean).join(' ');

  return (
    <img
      src={l.url ?? ''}
      alt=""
      aria-hidden={ariaHidden}
      style={{
        position: 'absolute',
        inset: isBackground ? 0 : undefined,
        left: isBackground ? 0 : '50%',
        top: isBackground ? 0 : '50%',
        width: isBackground ? '100%' : '72%',
        height: isBackground ? '100%' : '72%',
        objectFit: isBackground ? 'cover' : l.fit,
        objectPosition: `${l.x}% ${l.y}%`,
        opacity: l.opacity,
        transform,
        transformOrigin: 'center center',
        borderRadius: l.radius,
        filter,
        pointerEvents: 'none',
        userSelect: 'none',
        ...style,
      }}
    />
  );
}
