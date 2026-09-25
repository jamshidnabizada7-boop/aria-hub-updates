'use client';

import { FlipHorizontal2, ImageIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { StudioDesignFamilyDefinition, StudioVisualRole } from '@/lib/social/studio/registry';
import {
  defaultStudioVisualLayer,
  setStudioMediaLayer,
  type StudioMediaState,
  type StudioVisualLayer,
} from '@/lib/social/studio/media';

export interface StudioVisualItem {
  id: string;
  label: string;
  category: string;
  url: string;
  enabled?: boolean;
  builtIn?: boolean;
}

interface Props {
  family: StudioDesignFamilyDefinition;
  visuals: StudioVisualItem[];
  media: StudioMediaState;
  activeRole: StudioVisualRole;
  onRoleChange: (role: StudioVisualRole) => void;
  onChange: (next: StudioMediaState) => void;
}

const ALL_ROLES: { role: StudioVisualRole; label: string }[] = [
  { role: 'background', label: 'Background' },
  { role: 'hero', label: 'Hero' },
  { role: 'foreground', label: 'Foreground' },
  { role: 'texture', label: 'Texture' },
];

function RangeControl({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[10px] text-muted-foreground">{label}</Label>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {Number.isInteger(value) ? value : value.toFixed(2)}{suffix ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-primary"
        aria-label={label}
      />
    </div>
  );
}

export function StudioMediaEditor({
  family, visuals, media, activeRole, onRoleChange, onChange,
}: Props) {
  const allowed = family.visualSlots.length
    ? family.visualSlots.map((slot) => ({ role: slot.role, label: slot.label }))
    : ALL_ROLES;
  const roles = family.id === 'legacy'
    ? [{ role: 'background' as const, label: 'Background' }]
    : allowed;
  const layer = media[activeRole] ?? null;
  const recommended = family.visualSlots.find((s) => s.role === activeRole)?.recommendedCategories ?? [];
  const visibleVisuals = visuals
    .filter((v) => v.enabled !== false)
    .sort((a, b) => {
      const ar = recommended.some((cat) => cat.toLowerCase() === a.category.toLowerCase()) ? 0 : 1;
      const br = recommended.some((cat) => cat.toLowerCase() === b.category.toLowerCase()) ? 0 : 1;
      return ar - br || a.label.localeCompare(b.label);
    });

  const setLayer = (patch: Partial<StudioVisualLayer>) => {
    if (!layer) return;
    onChange(setStudioMediaLayer(media, activeRole, { ...layer, ...patch }));
  };

  const choose = (visual: StudioVisualItem) => {
    const next = defaultStudioVisualLayer(activeRole, visual.url, visual.id);
    onChange(setStudioMediaLayer(media, activeRole, next));
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold">Media layers</p>
          <p className="text-[10px] text-muted-foreground">
            Reusable assets stay editable — text is never rasterized into the visual.
          </p>
        </div>
        {layer ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={() => onChange(setStudioMediaLayer(media, activeRole, null))}
          >
            Remove layer
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Visual layer">
        {roles.map((slot) => (
          <button
            key={slot.role}
            type="button"
            onClick={() => onRoleChange(slot.role)}
            aria-pressed={activeRole === slot.role}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-colors',
              activeRole === slot.role
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {slot.label}
          </button>
        ))}
      </div>

      {visibleVisuals.length ? (
        <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-lg border bg-background/70 p-2">
          {visibleVisuals.map((visual) => {
            const selected = layer?.assetId === visual.id || layer?.url === visual.url;
            return (
              <button
                key={visual.id}
                type="button"
                onClick={() => choose(visual)}
                title={`${visual.label} · ${visual.category}`}
                className={cn(
                  'group relative h-14 w-14 overflow-hidden rounded-lg border-2 bg-muted transition-transform hover:scale-105',
                  selected ? 'border-primary ring-1 ring-primary' : 'border-border',
                )}
              >
                <img
                  src={visual.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-[7px] text-white">
                  {visual.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-[10px] text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          No Studio visuals yet. Premium templates still render with deterministic fallback art.
        </div>
      )}

      {layer ? (
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <RangeControl label="Horizontal" value={layer.x} min={-25} max={125} step={1} suffix="%" onChange={(x) => setLayer({ x })} />
          <RangeControl label="Vertical" value={layer.y} min={-25} max={125} step={1} suffix="%" onChange={(y) => setLayer({ y })} />
          <RangeControl label="Scale" value={layer.scale} min={0.15} max={2.5} step={0.05} onChange={(scale) => setLayer({ scale })} />
          <RangeControl label="Rotation" value={layer.rotation} min={-45} max={45} step={1} suffix="°" onChange={(rotation) => setLayer({ rotation })} />
          <RangeControl label="Opacity" value={layer.opacity} min={0} max={1} step={0.05} onChange={(opacity) => setLayer({ opacity })} />
          <RangeControl label="Blur" value={layer.blur} min={0} max={30} step={1} suffix="px" onChange={(blur) => setLayer({ blur })} />
          <RangeControl label="Brightness" value={layer.brightness} min={0.4} max={1.8} step={0.05} onChange={(brightness) => setLayer({ brightness })} />
          <RangeControl label="Contrast" value={layer.contrast} min={0.4} max={1.8} step={0.05} onChange={(contrast) => setLayer({ contrast })} />
          <RangeControl label="Saturation" value={layer.saturation} min={0} max={2} step={0.05} onChange={(saturation) => setLayer({ saturation })} />
          <RangeControl label="Shadow" value={layer.shadow} min={0} max={1} step={0.05} onChange={(shadow) => setLayer({ shadow })} />
          <RangeControl label="Glow" value={layer.glow} min={0} max={1} step={0.05} onChange={(glow) => setLayer({ glow })} />
          <RangeControl label="Corner radius" value={layer.borderRadius} min={0} max={240} step={4} suffix="px" onChange={(borderRadius) => setLayer({ borderRadius })} />

          <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2">
            <Button
              type="button"
              size="sm"
              variant={layer.fit === 'contain' ? 'default' : 'outline'}
              className="h-7 px-2 text-[10px]"
              onClick={() => setLayer({ fit: 'contain' })}
            >
              Contain
            </Button>
            <Button
              type="button"
              size="sm"
              variant={layer.fit === 'cover' ? 'default' : 'outline'}
              className="h-7 px-2 text-[10px]"
              onClick={() => setLayer({ fit: 'cover' })}
            >
              Cover
            </Button>
            <Button
              type="button"
              size="sm"
              variant={layer.flipX ? 'default' : 'outline'}
              className="h-7 gap-1 px-2 text-[10px]"
              onClick={() => setLayer({ flipX: !layer.flipX })}
            >
              <FlipHorizontal2 className="h-3 w-3" /> Flip
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[10px]"
              onClick={() => {
                const reset = defaultStudioVisualLayer(activeRole, layer.url, layer.assetId);
                onChange(setStudioMediaLayer(media, activeRole, reset));
              }}
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-[10px] text-muted-foreground">Custom asset URL</Label>
            <Input
              value={layer.url}
              onChange={(e) => setLayer({ url: e.target.value.slice(0, 2048), assetId: undefined })}
              className="mt-1 h-8 text-xs"
              placeholder="https://…"
              inputMode="url"
            />
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Select an asset above to add a {activeRole} layer.
        </p>
      )}
    </div>
  );
}
