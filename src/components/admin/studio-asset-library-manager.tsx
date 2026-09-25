'use client';

import { useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StudioVisualItem } from '@/components/admin/studio-media-editor';

interface Props {
  visuals: StudioVisualItem[];
  onChanged: () => Promise<void> | void;
}

type Draft = {
  label: string;
  category: string;
  url: string;
};

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/admin/studio/visuals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Visual library update failed');
  return data;
}

export function StudioAssetLibraryManager({ visuals, onChanged }: Props) {
  const custom = useMemo(() => visuals.filter((v) => !v.builtIn), [visuals]);
  const builtIn = useMemo(() => visuals.filter((v) => v.builtIn), [visuals]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>({ label: '', category: 'General', url: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>({ label: '', category: '', url: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, body: Record<string, unknown>, after?: () => void) => {
    setBusy(key);
    setError(null);
    try {
      await post(body);
      after?.();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Visual library update failed');
    } finally {
      setBusy(null);
    }
  };

  const beginEdit = (visual: StudioVisualItem) => {
    setEditId(visual.id);
    setEdit({
      label: visual.label,
      category: visual.category,
      url: visual.url,
    });
  };

  return (
    <details className="rounded-xl border bg-muted/10">
      <summary className="cursor-pointer list-none px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold">Asset library</p>
            <p className="text-[10px] text-muted-foreground">
              {builtIn.length} ARIA HUB premium assets · {custom.length} custom assets
            </p>
          </div>
          <span className="text-[10px] font-semibold text-primary">Manage</span>
        </div>
      </summary>

      <div className="space-y-3 border-t px-3 py-3">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[10px] text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {builtIn.map((visual) => (
            <div key={visual.id} className="flex min-w-0 items-center gap-2 rounded-lg border bg-background p-2">
              <img src={visual.url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg bg-slate-950/5 object-contain" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold">{visual.label}</p>
                <p className="truncate text-[9px] text-muted-foreground">{visual.category} · built in</p>
              </div>
            </div>
          ))}
        </div>

        {custom.length ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground">Custom assets</p>
            {custom.map((visual) => {
              const editing = editId === visual.id;
              const rowBusy = Boolean(busy && busy.endsWith(visual.id));
              return (
                <div key={visual.id} className="rounded-lg border bg-background p-2">
                  {editing ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                      <Input
                        className="h-8 text-xs"
                        value={edit.label}
                        onChange={(e) => setEdit((prev) => ({ ...prev, label: e.target.value }))}
                        placeholder="Asset label"
                      />
                      <Input
                        className="h-8 text-xs"
                        value={edit.category}
                        onChange={(e) => setEdit((prev) => ({ ...prev, category: e.target.value }))}
                        placeholder="Category"
                      />
                      <Input
                        className="h-8 text-xs sm:col-span-2"
                        value={edit.url}
                        onChange={(e) => setEdit((prev) => ({ ...prev, url: e.target.value }))}
                        placeholder="https://…"
                        inputMode="url"
                      />
                      <div className="flex gap-1.5 sm:col-span-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[10px]"
                          disabled={rowBusy || !edit.label.trim() || !edit.url.trim()}
                          onClick={() => void run('update-' + visual.id, {
                            action: 'update',
                            id: visual.id,
                            label: edit.label,
                            category: edit.category,
                            url: edit.url,
                          }, () => setEditId(null))}
                        >
                          {rowBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[10px]" onClick={() => setEditId(null)}>
                          <X className="h-3 w-3" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <img src={visual.url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg bg-slate-950/5 object-contain" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold">{visual.label}</p>
                        <p className="truncate text-[9px] text-muted-foreground">{visual.category}</p>
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => beginEdit(visual)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={visual.enabled === false ? 'Enable' : 'Pause'}
                        disabled={rowBusy}
                        onClick={() => void run('toggle-' + visual.id, { action: 'toggle', id: visual.id })}
                      >
                        {visual.enabled === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Delete"
                        disabled={rowBusy}
                        onClick={() => {
                          if (window.confirm('Delete "' + visual.label + '" from the custom Studio asset library?')) {
                            void run('delete-' + visual.id, { action: 'delete', id: visual.id });
                          }
                        }}
                      >
                        {rowBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {adding ? (
          <div className="rounded-lg border bg-background p-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <div>
                <Label className="text-[9px] text-muted-foreground">Label</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  value={draft.label}
                  onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g. University campus"
                />
              </div>
              <div>
                <Label className="text-[9px] text-muted-foreground">Category</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  value={draft.category}
                  onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Education"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[9px] text-muted-foreground">Image URL</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  value={draft.url}
                  onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://…"
                  inputMode="url"
                />
              </div>
              <div className="flex gap-1.5 sm:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[10px]"
                  disabled={busy === 'add' || !draft.label.trim() || !draft.url.trim()}
                  onClick={() => void run('add', {
                    action: 'add',
                    label: draft.label,
                    category: draft.category,
                    url: draft.url,
                  }, () => {
                    setDraft({ label: '', category: 'General', url: '' });
                    setAdding(false);
                  })}
                >
                  {busy === 'add' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Add to library
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px]" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> Add custom asset
          </Button>
        )}
      </div>
    </details>
  );
}
