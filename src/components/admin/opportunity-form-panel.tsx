'use client';

/**
 * OpportunityFormPanel — dedicated, organized, TRILINGUAL admin form for
 * opportunities (replaces the flat 50-field generic CRUD table for this model).
 *
 * Layout: list view (search + status filter + category filter) and a sectioned
 * form (Basics / Key facts / Content / Application / SEO / Internal source).
 * Every content field has EN/FA/PS tabs (MultilingualInput) and a one-click
 * "AI translate" action fills the empty fa/ps drafts from the English text.
 *
 * The "Internal" section (scraped source name/URLs) is stored but NEVER shown
 * on the public site — it exists so admins can trace where content came from.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, Search, Loader2, X, Sparkles, Globe,
  FileText, Coins, CalendarDays, Link2, Shield, Eye, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';
import { cn } from '@/lib/utils';
import { MultilingualInput } from '@/components/admin/multilingual-input';

interface Category { id: string; slug: string; name: string }
interface Item { id: string; [k: string]: unknown }

const TRANSLATABLE = [
  'title', 'description', 'eligibility', 'benefits', 'responsibilities', 'seoTitle', 'seoDescription',
  'requirements', 'guidelines', 'jobType', 'salary', 'educationReq', 'experience',
] as const;

type TranslatableField = (typeof TRANSLATABLE)[number];

const LONG_FIELDS = new Set(['description', 'eligibility', 'benefits', 'responsibilities', 'requirements', 'guidelines', 'educationReq', 'experience']);

function emptyForm(): Record<string, unknown> {
  return {
    title: '', titleI18n: { en: '', fa: '', ps: '' },
    slug: '', status: 'published', featured: false, categoryId: null,
    organization: '', country: '', deadline: '',
    jobType: '', jobTypeI18n: { en: '', fa: '', ps: '' },
    salary: '', salaryI18n: { en: '', fa: '', ps: '' },
    educationReq: '', educationReqI18n: { en: '', fa: '', ps: '' },
    experience: '', experienceI18n: { en: '', fa: '', ps: '' },
    description: '', descriptionI18n: { en: '', fa: '', ps: '' },
    eligibility: '', eligibilityI18n: { en: '', fa: '', ps: '' },
    benefits: '', benefitsI18n: { en: '', fa: '', ps: '' },
    responsibilities: '', responsibilitiesI18n: { en: '', fa: '', ps: '' },
    requirements: '', requirementsI18n: { en: '', fa: '', ps: '' },
    guidelines: '', guidelinesI18n: { en: '', fa: '', ps: '' },
    applyUrl: '', website: '',
    seoTitle: '', seoTitleI18n: { en: '', fa: '', ps: '' },
    seoDescription: '', seoDescriptionI18n: { en: '', fa: '', ps: '' },
    sourceName: '', sourceUrl: '', originalUrl: '',
    importStatus: '', translationStatus: '',
  };
}

function fromItem(item: Item): Record<string, unknown> {
  const form = emptyForm();
  for (const key of Object.keys(form)) {
    const v = item[key];
    if (v !== undefined && v !== null) form[key] = v;
  }
  // deadline → yyyy-MM-dd for the date input
  if (item.deadline) {
    try { form.deadline = new Date(item.deadline as string).toISOString().slice(0, 10); }
    catch { form.deadline = ''; }
  }
  return form;
}

type RepairIssue = 'apply' | 'core' | 'evidence' | 'translation';

export function OpportunityFormPanel({ focus, onFocusHandled }: { focus?: { id: string; issue: RepairIssue } | null; onFocusHandled?: () => void } = {}) {
  const t = useT();
  const { toast } = useToast();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sources, setSources] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [editingIssue, setEditingIssue] = useState<RepairIssue | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!focus) return;
    let cancelled = false;
    fetch(`/api/admin/crud?model=opportunity&id=${encodeURIComponent(focus.id)}&pageSize=1`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        const item = result.items?.[0];
        if (!item) throw new Error('Opportunity no longer exists.');
        setEditing(item);
        setEditingIssue(focus.issue);
        setShowForm(true);
        onFocusHandled?.();
      })
      .catch((error) => { if (!cancelled) toast({ title: error.message || 'Could not open opportunity', variant: 'destructive' }); });
    return () => { cancelled = true; };
  }, [focus, onFocusHandled, toast]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      model: 'opportunity', page: String(page), pageSize: String(pageSize),
    });
    if (search) params.set('search', search);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    fetch(`/api/admin/crud?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setItems(d.items || []);
        setTotal(d.total ?? (d.items || []).length);
        if (Array.isArray(d.sources)) setSources(d.sources);
      })
      .catch(() => { if (!cancelled) toast({ title: tRef.current('admin.toast.failedLoad'), variant: 'destructive' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, pageSize, search, categoryFilter, statusFilter, sourceFilter, reloadKey, toast]);

  useEffect(() => {
    fetch('/api/admin/crud?model=opportunityCategory&pageSize=100')
      .then((r) => r.json())
      .then((d) => setCategories(d.items || []))
      .catch(() => setCategories([]));
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.confirm.delete'))) return;
    const res = await fetch(`/api/admin/crud?model=opportunity&id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast({ title: t('admin.toast.deleted') }); reload(); }
    else toast({ title: t('admin.toast.failedDelete'), variant: 'destructive' });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={`${t('admin.button.search')}…`} className="w-56 ps-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">published</SelectItem>
              <SelectItem value="draft">draft</SelectItem>
              <SelectItem value="expired">expired</SelectItem>
              <SelectItem value="archived">archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((src) => (
                <SelectItem key={src} value={src}>{src}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all') || 'All categories'}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setEditingIssue(null); setShowForm(true); }} className="gap-2 rounded-xl bg-gradient-to-r from-primary to-chart-2">
          <Plus className="h-4 w-4" /> {t('admin.button.addNew')}
        </Button>
      </div>

      {!loading && (
        <p className="text-xs text-muted-foreground">{t('admin.table.showing', { count: items.length, total })}</p>
      )}

      {/* List */}
      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-muted/40">
                <tr>
                  {['#', 'Title', 'Source', 'Category', 'Status', 'Deadline', 'EN/FA/PS', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-start font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const i18n = (item.titleI18n || {}) as Record<string, string>;
                  const coverage = ['en', 'fa', 'ps'].map((l) => (typeof i18n[l] === 'string' && i18n[l].trim() ? l : null));
                  return (
                    <tr key={item.id} className="border-b border-border/40 transition-colors hover:bg-accent/30">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="max-w-[22rem] px-3 py-2.5">
                        <p dir="auto" className="truncate font-medium">{String(item.title || '')}</p>
                        <p dir="auto" className="truncate text-xs text-muted-foreground">{String(item.organization || '')}</p>
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5 text-xs text-muted-foreground" title={String(item.sourceName || '')}>
                        {String(item.sourceName || '—')}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {(item.category as Category | null)?.name || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn(
                          'text-[11px]',
                          item.status === 'published' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                          item.status === 'expired' && 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                          item.status === 'draft' && 'border-border bg-muted text-muted-foreground',
                        )}>
                          {String(item.status || '—')}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{item.deadline ? new Date(item.deadline as string).toISOString().slice(0, 10) : '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex gap-1">
                          {['en', 'fa', 'ps'].map((l) => (
                            <span key={l} className={cn(
                              'grid h-5 w-5 place-items-center rounded text-[10px] font-bold uppercase',
                              coverage.includes(l) ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground/50'
                            )}>{l}</span>
                          ))}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/en/opportunities/${String(item.slug)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="View public page"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(item); setEditingIssue(null); setShowForm(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(String(item.id))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No opportunities match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* Dedicated form */}
      {showForm && (
        <OpportunityFormDialog
          item={editing}
          issue={editingIssue}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload(); }}
        />
      )}
    </div>
  );
}

// ─── Dedicated form dialog ───────────────────────────────────────────────────

interface OpportunityFormContextValue {
  data: Record<string, unknown>;
  set: (field: string, value: unknown) => void;
  setMulti: (field: string, baseValue: string, i18nValue: Record<string, string>) => void;
  openSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
}

const OpportunityFormContext = createContext<OpportunityFormContextValue | null>(null);

function useOpportunityForm() {
  const form = useContext(OpportunityFormContext);
  if (!form) throw new Error('Opportunity form fields must be inside the form dialog');
  return form;
}

// Keep field component identities stable while the dialog state changes. Defining
// them inside OpportunityFormDialog remounts every input on each keystroke.
function Section({ id, icon: Icon, title, children }: { id: string; icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  const { openSections, toggleSection } = useOpportunityForm();
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="flex w-full items-center gap-2 px-4 py-3 text-start transition-colors hover:bg-accent/40"
      >
        <Icon className="h-4 w-4 text-primary" />
        <span className="flex-1 text-sm font-bold">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', openSections[id] && 'rotate-180')} />
      </button>
      {openSections[id] && <div className="space-y-4 border-t border-border/60 p-4">{children}</div>}
    </div>
  );
}

function M({ field, label, long }: { field: TranslatableField; label: string; long?: boolean }) {
  const { data, setMulti } = useOpportunityForm();
  return (
    <div className={cn(long && 'sm:col-span-2')}>
      <MultilingualInput
        field={field}
        value={(data[field] as string) || ''}
        i18nValue={(data[`${field}I18n`] as Record<string, string>) || null}
        isLong={long ?? LONG_FIELDS.has(field)}
        onChange={(base, i18n) => setMulti(field, base, i18n)}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Simple({ field, label, type }: { field: string; label: string; type?: string }) {
  const { data, set } = useOpportunityForm();
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <Input type={type || 'text'} value={(data[field] as string) || ''} onChange={(e) => set(field, e.target.value)} className="w-full" />
    </div>
  );
}

function OpportunityFormDialog({
  item, issue, categories, onClose, onSaved,
}: {
  item: Item | null;
  issue: RepairIssue | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const { toast } = useToast();
  const [data, setData] = useState<Record<string, unknown>>(() => (item ? fromItem(item) : emptyForm()));
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({
    basics: !issue || issue === 'core', facts: !issue || issue === 'core' || issue === 'evidence',
    content: !issue || issue === 'evidence' || issue === 'translation',
    application: !issue || issue === 'apply', seo: false, internal: false,
  }));

  const set = useCallback((field: string, value: unknown) => {
    setData((d) => ({ ...d, [field]: value }));
  }, []);

  const setMulti = useCallback((field: string, baseValue: string, i18nValue: Record<string, string>) => {
    setData((d) => ({ ...d, [field]: baseValue, [`${field}I18n`]: i18nValue }));
  }, []);

  const toggleSection = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const autoTranslate = async () => {
    const en = (lang: string): string => {
      const map = data[`${lang}I18n`] as Record<string, string> | undefined;
      return (map?.en || (data[lang] as string) || '').trim();
    };
    const payload: Record<string, string> = {};
    for (const f of TRANSLATABLE) {
      const v = en(f);
      if (v) payload[f] = v;
    }
    if (!payload.title && !payload.description) {
      toast({ title: 'Write the English version first — then auto-translate fills فارسی and پښتو.', variant: 'destructive' });
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/ai-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Translation failed');
      setData((d) => {
        const next = { ...d };
        for (const f of TRANSLATABLE) {
          const fa = (result.fa as Record<string, string> | undefined)?.[f];
          const ps = (result.ps as Record<string, string> | undefined)?.[f];
          if (!fa && !ps) continue;
          const current = ((next[`${f}I18n`] as Record<string, string>) || {});
          const base = (next[f] as string) || current.en || '';
          next[`${f}I18n`] = {
            en: base, fa: fa || current.fa || '', ps: ps || current.ps || '',
          };
          if (f === 'title' && fa && !next.title) next.title = base;
        }
        return next;
      });
      toast({ title: 'Farsi + Pashto drafts filled — review and save.' });
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setTranslating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Record<string, unknown> = { ...data };
    // Deadline → full ISO for Prisma
    if (typeof payload.deadline === 'string') {
      payload.deadline = payload.deadline ? new Date(`${payload.deadline}T12:00:00.000Z`).toISOString() : null;
    }
    // Slug fallback from title
    if (!payload.slug && typeof payload.title === 'string' && payload.title) {
      payload.slug = payload.title.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
    }
    if (!payload.slug) payload.slug = `opportunity-${Date.now()}`;
    // Drop empty i18n objects entirely
    for (const key of Object.keys(payload)) {
      if (key.endsWith('I18n')) {
        const obj = payload[key] as Record<string, string>;
        const has = obj && Object.values(obj).some((v) => typeof v === 'string' && v.trim());
        if (!has) delete payload[key];
        else {
          // normalize: remove empty lang entries
          payload[key] = Object.fromEntries(Object.entries(obj).filter(([, v]) => v && v.trim()));
        }
      }
    }

    const method = item ? 'PUT' : 'POST';
    const body = item ? { model: 'opportunity', id: item.id, data: payload } : { model: 'opportunity', data: payload };
    try {
      const res = await fetch('/api/admin/crud', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: item ? t('admin.toast.updated') : t('admin.toast.created') });
      onSaved();
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const verificationUrl = [item?.originalUrl, item?.sourceUrl]
    .find((url) => typeof url === 'string' && /^https?:\/\//i.test(url)) as string | undefined;

  return (
    <OpportunityFormContext.Provider value={{ data, set, setMulti, openSections, toggleSection }}>
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pe-6">
            <span>{item ? 'Edit opportunity' : 'Add opportunity'}</span>
            <Button
              type="button"
              size="sm"
              onClick={autoTranslate}
              disabled={translating}
              className="gap-1.5 rounded-lg bg-gradient-to-r from-primary to-chart-2 text-xs"
            >
              {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI translate
            </Button>
          </DialogTitle>
        </DialogHeader>

        {issue && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          {issue === 'apply' ? 'Check the internal source, then enter an exact application email, form, or portal below.' : issue === 'core' ? 'Verify the category and country against the source before saving.' : issue === 'evidence' ? 'Add explicit eligibility, education, experience, or requirements from the source.' : 'Review the Persian and Pashto content below; the background engine may still be processing full-field translation.'}
        </p>}
        {issue && verificationUrl &&
          <a href={verificationUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary underline">Open original source for verification</a>}

        <form onSubmit={submit} className="space-y-4">
          <Section id="basics" icon={FileText} title="Basics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <M field="title" label="The headline users see in lists and on the detail page." />
              </div>
              <Simple field="slug" label="Slug (auto-generated from title if empty)" />
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Status</Label>
                <Select value={(data.status as string) || 'published'} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">published</SelectItem>
                    <SelectItem value="draft">draft</SelectItem>
                    <SelectItem value="expired">expired</SelectItem>
                    <SelectItem value="archived">archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Category</Label>
                <Select value={(data.categoryId as string) || 'none'} onValueChange={(v) => set('categoryId', v === 'none' ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— none —</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label className="text-sm font-medium">Featured (promoted)</Label>
                <Switch checked={!!data.featured} onCheckedChange={(v) => set('featured', v)} />
              </div>
            </div>
          </Section>

          <Section id="facts" icon={Coins} title="Key facts (shown at the top of the detail page)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Simple field="organization" label="Organization" />
              <Simple field="country" label="Country / Location" />
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Deadline</Label>
                <Input type="date" value={(data.deadline as string) || ''} onChange={(e) => set('deadline', e.target.value)} />
              </div>
              <M field="jobType" label="e.g. Full-time, Scholarship, Fellowship" long={false} />
              <M field="salary" label="e.g. 500–800 USD per month" long={false} />
              <M field="educationReq" label="Education requirement" long={false} />
              <M field="experience" label="Experience requirement" long={false} />
            </div>
          </Section>

          <Section id="content" icon={FileText} title="Content (all three languages)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <M field="description" label="Main announcement body — the overview section." long />
              <M field="eligibility" label="Who can apply / eligibility criteria." long />
              <M field="benefits" label="What the opportunity offers." long />
              <M field="responsibilities" label="Duties and responsibilities." long />
              <M field="requirements" label="Required documents / materials." long />
              <M field="guidelines" label="How to apply instructions." long />
            </div>
          </Section>

          <Section id="application" icon={Link2} title="Application (the ONLY link users see)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Simple field="applyUrl" label="Exact application link or email (form, portal, mailto: or plain email)" />
              <Simple field="website" label="Organization website (optional)" />
              <p className="sm:col-span-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Users only ever see this application link. Scraped source pages are hidden from them and stay in the Internal section below.
              </p>
            </div>
          </Section>

          <Section id="seo" icon={Globe} title="SEO (optional — auto-derived when empty)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <M field="seoTitle" label="SEO title" long={false} />
              <M field="seoDescription" label="SEO meta description" long={false} />
            </div>
          </Section>

          <Section id="internal" icon={Shield} title="Internal — source tracking (admins only, never public)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Simple field="sourceName" label="Source name (e.g. ACBAR)" />
              <Simple field="sourceUrl" label="Source listing URL" />
              <Simple field="originalUrl" label="Original post URL" />
              <Simple field="importStatus" label="Import status" />
              <p className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <Shield className="me-1 inline h-3.5 w-3.5" />
                These fields are never rendered on the public website — only admins can see them here.
              </p>
            </div>
          </Section>

          <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-border/60 bg-background/95 px-6 py-3 backdrop-blur">
            <Button type="button" variant="outline" onClick={onClose}>{t('admin.button.cancel')}</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-chart-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {item ? t('admin.button.save') : t('admin.button.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </OpportunityFormContext.Provider>
  );
}
