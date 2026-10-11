'use client';

import { Image as ImageIcon, Layers3, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { BUILTIN_PREMIUM_VISUALS, defaultMediaForDesignFamily, designFamiliesForTemplate, getDesignFamily } from '@/lib/social/studio/registry';
import type { PostTemplate } from '@/lib/social/brand';
import type { DesignFamilyId, StudioMediaConfig, StudioMediaLayer, StudioMediaRole } from '@/lib/social/studio/types';
import { ROTATION_POOLS } from '@/lib/social/studio/rotation';

type Visual = { id: string; label: string; category: string; url: string };

function numberOf(v: unknown, fallback: number) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function PremiumStudioControls({
  template,
  family,
  overrides,
  defaults,
  visuals,
  onFamily,
  onOverride,
}: {
  template: PostTemplate;
  family: DesignFamilyId;
  overrides: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  visuals: Visual[];
  onFamily: (family: DesignFamilyId) => void;
  onOverride: (key: string, value: unknown) => void;
}) {
  const families = designFamiliesForTemplate(template);
  const def = getDesignFamily(family);
  const availableVisuals = [
    ...BUILTIN_PREMIUM_VISUALS,
    ...visuals.filter((visual) => !BUILTIN_PREMIUM_VISUALS.some((builtin) => builtin.url === visual.url)),
  ];
  const media = (overrides.media && typeof overrides.media === 'object' ? overrides.media : {}) as StudioMediaConfig;
  const familyDefaults = defaultMediaForDesignFamily(family) as StudioMediaConfig;
  const effectiveMedia: StudioMediaConfig = {
    ...familyDefaults,
    ...media,
    background: { ...(familyDefaults.background ?? {}), ...(media.background ?? {}) },
    hero: { ...(familyDefaults.hero ?? {}), ...(media.hero ?? {}) },
    foreground: { ...(familyDefaults.foreground ?? {}), ...(media.foreground ?? {}) },
    overlay: { ...(familyDefaults.overlay ?? {}), ...(media.overlay ?? {}) },
  };

  const setLayer = (role: StudioMediaRole, patch: Partial<StudioMediaLayer>) => {
    onOverride('media', {
      ...media,
      [role]: { ...(media[role] ?? {}), ...patch },
    });
  };

  const fieldValue = (id: string) => String(overrides[id] ?? defaults?.[id] ?? '');

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-background/50 p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-bold">Premium design direction</p>
            <p className="text-[10px] text-muted-foreground">{def.description}</p>
          </div>
        </div>
        <Select value={family} onValueChange={(v) => onFamily(v as DesignFamilyId)}>
          <SelectTrigger className="mt-3 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {families.map((item) => (
              <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Editorial design collection">
          {families.filter(item => Object.values(ROTATION_POOLS).flat().some(id => id === item.id)).map(item => {
            const paper = /ledger|journal|calendar/.test(item.id);
            const accent = item.id.startsWith('deadline') ? '#FFBC9A' : item.id.startsWith('career') ? '#83E5CE' : '#F5D58C';
            return <button key={item.id} type="button" onClick={() => onFamily(item.id)} aria-pressed={family === item.id} className="min-h-24 rounded-lg border-2 p-2 text-start transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" style={{borderColor:family === item.id ? 'var(--primary)' : 'transparent',background:paper ? '#F3F0E8' : '#11223E',color:paper ? '#152744' : '#fff'}}>
              <span aria-hidden style={{display:'block',width:28,height:4,background:paper ? '#927040' : accent,marginBottom:12}}/>
              <span className="block text-[10px] font-bold leading-relaxed">{item.label}</span>
            </button>;
          })}
        </div>
      </div>

      {family !== 'legacy' && def.editorFields.length > 0 ? (
        <div className="rounded-xl border bg-background/50 p-3">
          <p className="mb-3 text-xs font-bold">Content</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {def.editorFields.map((field) => (
              <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <Label className="text-[10px] text-muted-foreground">{field.label}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    dir="auto"
                    className="mt-1 min-h-20 text-xs"
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    value={fieldValue(field.id)}
                    onChange={(e) => onOverride(field.id, e.target.value)}
                  />
                ) : (
                  <Input
                    type={field.type === 'date' ? 'date' : 'text'}
                    dir="auto"
                    className="mt-1 h-8 text-xs"
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    value={fieldValue(field.id)}
                    onChange={(e) => onOverride(field.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {family !== 'legacy' && def.visualSlots.length > 0 ? (
        <div className="rounded-xl border bg-background/50 p-3">
          <div className="mb-3 flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-bold">Media layers</p>
              <p className="text-[10px] text-muted-foreground">Use separate background and hero assets instead of flattening the poster.</p>
            </div>
          </div>

          {(['background', 'hero'] as StudioMediaRole[]).map((role) => {
            const layer = effectiveMedia[role] ?? {};
            return (
              <div key={role} className="mb-3 rounded-lg border p-2.5 last:mb-0">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold capitalize"><ImageIcon className="h-3.5 w-3.5" />{role}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => {
                      const next = { ...media };
                      delete next[role];
                      onOverride('media', next);
                    }}
                  >
                    <RotateCcw className="me-1 h-3 w-3" />Reset
                  </Button>
                </div>
                <Select
                  value={layer.visualId || 'none'}
                  onValueChange={(id) => {
                    if (id === 'none') return setLayer(role, { visualId: null, url: null });
                    const visual = availableVisuals.find((v) => v.id === id);
                    if (visual) setLayer(role, { visualId: visual.id, url: visual.url, visible: true });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableVisuals.map((v) => <SelectItem key={v.id} value={v.id}>{v.label} · {v.category}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    ['x', 'Horizontal', 0, 100, 1, 50],
                    ['y', 'Vertical', 0, 100, 1, 50],
                    ['scale', 'Scale', 0.3, 2.4, 0.05, 1],
                    ['opacity', 'Opacity', 0, 1, 0.05, 1],
                    ['rotation', 'Rotation', -35, 35, 1, 0],
                    ['glow', 'Glow', 0, 1, 0.05, 0],
                  ].map(([key, label, min, max, step, fallback]) => {
                    const current = numberOf(layer[key as keyof StudioMediaLayer], fallback as number);
                    return (
                      <div key={String(key)}>
                        <div className="mb-1 flex justify-between text-[9px] text-muted-foreground"><span>{label}</span><span>{current.toFixed(key === 'scale' || key === 'opacity' || key === 'glow' ? 2 : 0)}</span></div>
                        <Slider
                          value={[current]}
                          min={min as number}
                          max={max as number}
                          step={step as number}
                          onValueChange={(vals) => setLayer(role, { [key as string]: vals[0] })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
