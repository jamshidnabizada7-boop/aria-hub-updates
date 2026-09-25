'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StudioEditorField } from '@/lib/social/studio/registry';

interface Props {
  fields: StudioEditorField[];
  values: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
}

function valueOf(
  id: string,
  values: Record<string, unknown>,
  defaults: Record<string, unknown>,
): unknown {
  return values[id] !== undefined ? values[id] : defaults[id];
}

export function StudioFieldsEditor({ fields, values, defaults = {}, onChange }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fields.map((field) => {
        const value = valueOf(field.id, values, defaults);
        const span = field.type === 'textarea' || field.type === 'list' ? 'sm:col-span-2' : '';
        return (
          <div key={field.id} className={span}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <Label className="text-[10px] text-muted-foreground">{field.label}</Label>
              {field.help ? <span className="text-[9px] text-muted-foreground/80">{field.help}</span> : null}
            </div>

            {field.type === 'textarea' ? (
              <textarea
                dir={field.rtl ? 'auto' : undefined}
                rows={3}
                value={String(value ?? '')}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="min-h-[72px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : field.type === 'list' ? (
              <Input
                className="h-8 text-xs"
                dir={field.rtl ? 'auto' : undefined}
                value={Array.isArray(value) ? value.map(String).join(', ') : String(value ?? '')}
                maxLength={field.maxLength ? field.maxLength * 4 : undefined}
                placeholder={field.placeholder || 'Comma-separated'}
                onChange={(e) =>
                  onChange(
                    field.id,
                    e.target.value.split(',').map((part) => part.trim()).filter(Boolean),
                  )
                }
              />
            ) : field.type === 'toggle' ? (
              <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-xs">
                <input
                  type="checkbox"
                  checked={typeof value === 'boolean' ? value : true}
                  onChange={(e) => onChange(field.id, e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span>{typeof value === 'boolean' && !value ? 'Hidden' : 'Visible'}</span>
              </label>
            ) : field.type === 'select' ? (
              <select
                value={String(value ?? '')}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <Input
                type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                className="h-8 text-xs"
                dir={field.rtl ? 'auto' : undefined}
                value={String(value ?? '')}
                maxLength={field.maxLength}
                required={field.required}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.id, field.type === 'number' ? Number(e.target.value) : e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
