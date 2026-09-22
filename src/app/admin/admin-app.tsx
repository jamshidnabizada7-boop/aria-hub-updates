'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, Plane, GraduationCap, Newspaper, Star,
  Building2, BarChart3, HelpCircle, Image, CreditCard, Share2, Link2,
  Building, MapPin, ListChecks, Tag, Users, GitCompare, Megaphone,
  Menu as MenuIcon, Settings, LogOut, Plus, Pencil, Trash2, X, Search,
  TrendingUp, Mail, UserPlus, Eye, Loader2, Globe, Layers, Download, KeyRound, FileText,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Activity, Inbox, Trophy, BellRing,
  BadgeDollarSign, BadgePercent, Bookmark, FolderOpen, History, MessageSquare, Rss, ShieldX, ThumbsUp, Timer,
  Wand2, Lightbulb, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';
import { cn } from '@/lib/utils';
import { MultilingualInput } from '@/components/admin/multilingual-input';
import { AutoImportPanel } from '@/components/admin/auto-import-panel';
import { TemplatesPanel } from '@/components/admin/templates-panel';
import { SubmissionsPanel } from '@/components/admin/submissions-panel';
import { ContentHealthPanel } from '@/components/admin/content-health-panel';
import { OrdersPanel } from '@/components/admin/orders-panel';
// Social Kit merged into Brand Studio (R26) — one poster tool, one workflow.
import { BrandStudioPanel } from '@/components/admin/brand-studio-panel';
import { AutomationPanel } from '@/components/admin/automation-panel';
import { OpportunityFormPanel } from '@/components/admin/opportunity-form-panel';
interface AdminUser { id: string; email: string; name: string; role: string; }

// All manageable models with their icon and translation key.
// `header` entries render as non-clickable group labels (nav is > 30 items).
type NavItem = { key: string; labelKey: string; icon: React.ComponentType<{ className?: string }> } | { header: string };
const NAV: NavItem[] = [
  // ── Overview ──
  { header: 'admin.group.overview' },
  { key: 'dashboard', labelKey: 'admin.nav.dashboard', icon: LayoutDashboard },
  { key: 'orders', labelKey: 'admin.nav.orders', icon: BadgeDollarSign },
  { key: 'brandStudio', labelKey: 'admin.nav.brandStudio', icon: Wand2 },
  { key: 'automation', labelKey: 'admin.nav.automation', icon: Zap },
  { key: 'contentHealth', labelKey: 'admin.nav.contentHealth', icon: Activity },
  { key: 'submissions', labelKey: 'admin.nav.submissions', icon: Inbox },
  // ── Opportunities & Content ──
  { header: 'admin.group.content' },
  { key: 'opportunity', labelKey: 'admin.nav.opportunities', icon: GraduationCap },
  { key: 'socialIdea', labelKey: 'admin.nav.socialIdeas', icon: Lightbulb },
  { key: 'news', labelKey: 'admin.nav.news', icon: Newspaper },
  { key: 'page', labelKey: 'admin.nav.pages', icon: FileText },
  { key: 'successStory', labelKey: 'admin.nav.successStories', icon: Trophy },
  { key: 'service', labelKey: 'admin.nav.services', icon: Briefcase },
  { key: 'visa', labelKey: 'admin.nav.visas', icon: Plane },
  { key: 'interviewCategory', labelKey: 'admin.nav.interviewCategories', icon: Briefcase },
  { key: 'interviewQuestion', labelKey: 'admin.nav.interviewQuestions', icon: FileText },
  { key: 'interviewExperience', labelKey: 'admin.nav.interviewExperiences', icon: Star },
  { key: 'interviewSession', labelKey: 'admin.nav.interviewSessions', icon: Timer },
  { key: 'visaCountry', labelKey: 'admin.nav.visaCountries', icon: Globe },
  { key: 'visaCategory', labelKey: 'admin.nav.visaCategories', icon: Briefcase },
  { key: 'visaQuestion', labelKey: 'admin.nav.visaQuestions', icon: FileText },
  { key: 'visaDocument', labelKey: 'admin.nav.visaDocuments', icon: FileText },
  { key: 'visaExperience', labelKey: 'admin.nav.visaExperiences', icon: Star },
  { key: 'visaRejection', labelKey: 'admin.nav.visaRejections', icon: ShieldX },
  { key: 'documentCategory', labelKey: 'admin.nav.docCategories', icon: Briefcase },
  { key: 'documentTemplate', labelKey: 'admin.nav.docTemplates', icon: FileText },
  { key: 'templateComment', labelKey: 'admin.nav.templateComments', icon: MessageSquare },
  { key: 'templateRating', labelKey: 'admin.nav.templateRatings', icon: ThumbsUp },
  { key: 'templateBookmark', labelKey: 'admin.nav.templateBookmarks', icon: Bookmark },
  // ── Homepage & Structure ──
  { header: 'admin.group.site' },
  { key: 'section', labelKey: 'admin.nav.sections', icon: Layers },
  { key: 'menuItem', labelKey: 'admin.nav.menuItems', icon: MenuIcon },
  { key: 'whyChooseUsFeature', labelKey: 'admin.nav.whyChooseUs', icon: Layers },
  { key: 'counter', labelKey: 'admin.nav.counters', icon: BarChart3 },
  { key: 'faq', labelKey: 'admin.nav.faqs', icon: HelpCircle },
  { key: 'testimonial', labelKey: 'admin.nav.testimonials', icon: Star },
  { key: 'partner', labelKey: 'admin.nav.partners', icon: Building2 },
  { key: 'teamMember', labelKey: 'admin.nav.team', icon: Users },
  { key: 'comparisonRow', labelKey: 'admin.nav.comparison', icon: GitCompare },
  { key: 'ctaBanner', labelKey: 'admin.nav.ctaBanners', icon: Megaphone },
  { key: 'processStep', labelKey: 'admin.nav.processSteps', icon: ListChecks },
  { key: 'galleryItem', labelKey: 'admin.nav.gallery', icon: Image },
  { key: 'galleryAlbum', labelKey: 'admin.nav.galleryAlbums', icon: FolderOpen },
  { key: 'department', labelKey: 'admin.nav.departments', icon: Building },
  { key: 'branch', labelKey: 'admin.nav.branches', icon: MapPin },
  // ── Taxonomies ──
  { header: 'admin.group.categories' },
  { key: 'serviceCategory', labelKey: 'admin.nav.serviceCategories', icon: Briefcase },
  { key: 'opportunityCategory', labelKey: 'admin.nav.opportunityCategories', icon: Briefcase },
  { key: 'newsCategory', labelKey: 'admin.nav.newsCategories', icon: Briefcase },
  // ── Comms, Imports & Config ──
  { header: 'admin.group.comms' },
  { key: 'contactMessage', labelKey: 'admin.nav.contactMessages', icon: Mail },
  { key: 'subscriber', labelKey: 'admin.nav.subscribers', icon: UserPlus },
  { key: 'alertSubscriber', labelKey: 'admin.nav.alertSubscribers', icon: BellRing },
  { key: 'autoImport', labelKey: 'admin.nav.autoImport', icon: Download },
  { key: 'importSource', labelKey: 'admin.nav.importSources', icon: Rss },
  { key: 'importRun', labelKey: 'admin.nav.importRuns', icon: History },
  { key: 'socialLink', labelKey: 'admin.nav.socialLinks', icon: Share2 },
  { key: 'footerLink', labelKey: 'admin.nav.footerLinks', icon: Link2 },
  { key: 'paymentMethod', labelKey: 'admin.nav.payments', icon: CreditCard },
  { key: 'pricingPackage', labelKey: 'admin.nav.pricing', icon: Tag },
  { key: 'advertisement', labelKey: 'admin.nav.advertisements', icon: BadgePercent },
  { key: 'language', labelKey: 'admin.nav.languages', icon: Globe },
  { key: 'settings', labelKey: 'admin.nav.siteSettings', icon: Settings },
];

export function AdminApp({ admin }: { admin: AdminUser }) {
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwDialog, setPwDialog] = useState(false);
  const router = useRouter();
  const t = useT();
  const { toast } = useToast();

  const logout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border/60 bg-card transition-transform lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-chart-2 text-sm font-black text-primary-foreground">A</div>
          <div>
            <p className="text-sm font-bold leading-tight">ARIA HUB</p>
            <p className="text-[10px] text-muted-foreground">{t('admin.panel.title')}</p>
          </div>
        </div>
        <nav className="max-h-[calc(100vh-4rem-4rem)] overflow-y-auto p-3">
          {NAV.map((item, idx) =>
            'header' in item ? (
              <p key={`h-${idx}`} className="mt-3 mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 first:mt-0">{t(item.header)}</p>
            ) : (
              <button
                key={item.key}
                onClick={() => { setActive(item.key); setSidebarOpen(false); }}
                className={cn(
                  'mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active === item.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </button>
            )
          )}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-border/60 bg-card p-3">
          <div className="mb-2 flex items-center gap-2 px-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-2 text-xs font-bold text-primary-foreground">
              {admin.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{admin.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{admin.email}</p>
            </div>
          </div>
          <Button onClick={() => setPwDialog(true)} variant="outline" size="sm" className="mb-1.5 w-full justify-start gap-2 text-xs">
            <KeyRound className="h-3.5 w-3.5" /> Change Password
          </Button>
          <Button onClick={logout} variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
            <LogOut className="h-3.5 w-3.5" /> {t('admin.button.signOut')}
          </Button>
        </div>

        {/* Change Password Dialog */}
        <ChangePasswordDialog open={pwDialog} onClose={() => setPwDialog(false)} toast={toast} />
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <MenuIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">{t(NAV.find((n): n is Extract<NavItem, { key: string }> => 'key' in n && n.key === active)?.labelKey || 'admin.nav.dashboard')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
              <a href="/" target="_blank"><Eye className="h-3.5 w-3.5" /> {t('admin.button.viewSite')}</a>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 lg:p-6">
          {active === 'dashboard' ? <Dashboard onNavigate={setActive} /> : active === 'settings' ? <SettingsPanel /> : active === 'autoImport' ? <AutoImportPanel /> : active === 'documentTemplate' ? <TemplatesPanel /> : active === 'submissions' ? <SubmissionsPanel /> : active === 'contentHealth' ? <ContentHealthPanel /> : active === 'orders' ? <OrdersPanel /> : active === 'brandStudio' ? <BrandStudioPanel /> : active === 'automation' ? <AutomationPanel /> : active === 'opportunity' ? <OpportunityFormPanel /> : <CrudTable model={active} />}
        </main>
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────
function Dashboard({ onNavigate }: { onNavigate: (key: string) => void }) {
  const t = useT();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => { setLoading(false); setStats(null); });
  }, []);

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!stats) return <p>{t('admin.panel.failedLoadStats')}</p>;

  const cards = [
    { labelKey: 'admin.stat.services', value: stats.counts.services, icon: Briefcase, color: 'from-blue-500 to-blue-600' },
    { labelKey: 'admin.stat.visas', value: stats.counts.visas, icon: Plane, color: 'from-cyan-500 to-cyan-600' },
    { labelKey: 'admin.stat.opportunities', value: stats.counts.opportunities, icon: GraduationCap, color: 'from-teal-500 to-teal-600' },
    { labelKey: 'admin.stat.news', value: stats.counts.news, icon: Newspaper, color: 'from-amber-500 to-amber-600' },
    { labelKey: 'admin.stat.messages', value: stats.counts.contactMessages, icon: Mail, color: 'from-violet-500 to-violet-600', badge: stats.counts.newMessages > 0 ? t('admin.badge.new', { count: stats.counts.newMessages }) : undefined },
    { labelKey: 'admin.stat.subscribers', value: stats.counts.subscribers, icon: UserPlus, color: 'from-pink-500 to-pink-600' },
    { labelKey: 'admin.stat.gallery', value: stats.counts.galleryItems, icon: Image, color: 'from-indigo-500 to-indigo-600' },
    { labelKey: 'admin.stat.visits', value: stats.counts.visits, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.labelKey} className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={cn('grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white', c.color)}>
                <c.icon className="h-5 w-5" />
              </div>
              {c.badge && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">{c.badge}</span>}
            </div>
            <p className="mt-3 text-3xl font-black">{c.value}</p>
            <p className="text-xs text-muted-foreground">{t(c.labelKey)}</p>
          </div>
        ))}
      </div>

      {/* Moderation queue — things awaiting a human decision */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
          <Inbox className="h-4 w-4 text-primary" />
          {t('admin.queue.title')}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              nav: 'submissions',
              icon: Inbox,
              labelKey: 'admin.queue.submissions',
              count: stats.counts.pendingSubmissions,
              total: null as number | null,
            },
            {
              nav: 'successStory',
              icon: Trophy,
              labelKey: 'admin.queue.stories',
              count: stats.counts.pendingStories,
              total: stats.counts.totalStories,
            },
            {
              nav: 'alertSubscriber',
              icon: BellRing,
              labelKey: 'admin.queue.alerts',
              count: stats.counts.activeAlertSubscribers,
              total: stats.counts.alertSubscribers,
            },
          ].map((q) => (
            <button
              key={q.nav}
              type="button"
              onClick={() => onNavigate(q.nav)}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-4 text-start transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', q.count > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-muted text-muted-foreground')}>
                <q.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold">
                  {q.count}
                  {q.count > 0 && (
                    <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-bold text-amber-600">
                      {t('admin.queue.actionNeeded')}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t(q.labelKey)}
                  {q.total !== null && q.total !== q.count ? ` · ${q.total}` : ''}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl-flip" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Visit chart */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><TrendingUp className="h-4 w-4 text-primary" /> {t('admin.dashboard.visits')} ({t('admin.dashboard.last7days')})</h3>
          <div className="flex h-40 items-end gap-2">
            {stats.visitChart.map((d: any) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-md bg-gradient-to-t from-primary to-chart-2 transition-all hover:opacity-80" style={{ height: `${Math.max(4, (d.count / Math.max(...stats.visitChart.map((x: any) => x.count), 1)) * 100)}%` }} title={`${d.count} visits`} />
                <span className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <span>📱 Mobile: {stats.deviceBreakdown.mobile}</span>
            <span>💻 Desktop: {stats.deviceBreakdown.desktop}</span>
            {stats.deviceBreakdown.tablet > 0 && <span>📊 Tablet: {stats.deviceBreakdown.tablet}</span>}
          </div>
        </div>

        {/* Recent messages */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><Mail className="h-4 w-4 text-primary" /> {t('admin.dashboard.recentMessages')}</h3>
          <div className="space-y-3">
            {stats.recentMessages.length === 0 && <p className="text-xs text-muted-foreground">{t('admin.empty.noMessages')}</p>}
            {stats.recentMessages.map((m: any) => (
              <div key={m.id} className="rounded-lg border border-border/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">{m.name}</p>
                  {m.status === 'new' && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{m.email}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent subscribers */}
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><UserPlus className="h-4 w-4 text-primary" /> {t('admin.dashboard.recentSubscribers')}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stats.recentSubscribers.length === 0 && <p className="text-xs text-muted-foreground">{t('admin.empty.noSubscribers')}</p>}
          {stats.recentSubscribers.map((s: any) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-2 text-xs font-bold text-primary-foreground">
                {s.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{s.email}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CRUD Table ────────────────────────────────────────────────
function CrudTable({ model }: { model: string }) {
  const t = useT();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [statusOptions, setStatusOptions] = useState<string[] | undefined>();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // Reset search & page when switching models or filters so stale filters don't carry over.
  useEffect(() => { setSearch(''); setSelectedIds([]); setFilterCategory('all'); setPage(1); }, [model]);
  useEffect(() => { setPage(1); }, [search, filterCategory]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const doFetch = async () => {
      try {
        const params = new URLSearchParams({
          model,
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search) params.set('search', search);
        if (model === 'opportunity' && filterCategory !== 'all') params.set('category', filterCategory);

        const r = await fetch(`/api/admin/crud?${params.toString()}`);
        const data = await r.json();
        if (cancelled) return;
        setItems(data.items || []);
        setFields(data.fields || []);
        setLabel(data.label || model);
        setStatusOptions(data.statusOptions);
        setTotal(data.total ?? (data.items || []).length);
      } catch {
        if (!cancelled) toast({ title: t('admin.toast.failedLoad'), variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    doFetch();
    return () => { cancelled = true; };
  }, [model, page, pageSize, search, filterCategory, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.confirm.delete'))) return;
    const res = await fetch(`/api/admin/crud?model=${model}&id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast({ title: t('admin.toast.deleted') }); reload(); }
    else toast({ title: t('admin.toast.failedDelete'), variant: 'destructive' });
  };

  const handleBulkDelete = async () => {
    if (!confirm(t('admin.confirm.delete') + ` (${selectedIds.length})`)) return;
    const res = await fetch(`/api/admin/crud?model=${model}&id=${selectedIds.join(',')}`, { method: 'DELETE' });
    if (res.ok) { toast({ title: t('admin.toast.deleted') }); setSelectedIds([]); reload(); }
    else toast({ title: t('admin.toast.failedDelete'), variant: 'destructive' });
  };

  const handleToggle = async (item: any, field: string) => {
    const newVal = !item[field];
    setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, [field]: newVal } : it));
    try {
      const res = await fetch('/api/admin/crud', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, id: item.id, data: { [field]: newVal } }),
      });
      if (res.ok) {
        toast({ title: t('admin.toast.saved') });
      } else {
        setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, [field]: !newVal } : it));
        toast({ title: t('admin.toast.failedSave'), variant: 'destructive' });
      }
    } catch {
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, [field]: !newVal } : it));
      toast({ title: t('admin.toast.failedSave'), variant: 'destructive' });
    }
  };

  // Items are already filtered on server side
  const filtered = items;

  // Pick display columns: always show status/featured if present, plus first few text fields.
  const priority = ['key', 'slug', 'title', 'name', 'country', 'question', 'label', 'company', 'platform', 'column', 'code'];
  const displayFields = [
    ...priority.filter((p) => fields.includes(p)),
    ...fields.filter((f) => !priority.includes(f) && f !== 'id' && !['description', 'content', 'answer', 'message', 'instructions', 'bio', 'eligibility', 'benefits', 'applicationProcess', 'requirements', 'documents', 'gallery', 'tags', 'features', 'faqs', 'attachments', 'seoTitle', 'seoDescription', 'translations'].includes(f)),
  ].slice(0, 5);
  const showStatus = fields.includes('status');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t('admin.button.search')} ${t(NAV.find((n): n is Extract<NavItem, { key: string }> => 'key' in n && n.key === model)?.labelKey || label)}...`} className="w-64 ps-9" />
          </div>
          {model === 'opportunity' && (
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Categories'}</SelectItem>
                <SelectItem value="job">{t('opportunities.jobs') || 'Jobs'}</SelectItem>
                <SelectItem value="scholarship">{t('opportunities.scholarships') || 'Scholarships'}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2 rounded-xl">
              <Trash2 className="h-4 w-4" /> {t('admin.button.delete')} ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 rounded-xl bg-gradient-to-r from-primary to-chart-2">
            <Plus className="h-4 w-4" /> {t('admin.button.addNew')}
          </Button>
        </div>
      </div>
      {!loading && total > 0 && (
        <p className="text-xs text-muted-foreground">{t('admin.table.showing', { count: filtered.length, total: total })}</p>
      )}

      {loading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input type="checkbox" className="rounded border-border/60" onChange={(e) => setSelectedIds(e.target.checked ? filtered.map(i => i.id) : [])} checked={filtered.length > 0 && selectedIds.length === filtered.length} />
                  </th>
                  {displayFields.map((f) => (
                    <th key={f} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{f}</th>
                  ))}
                  {showStatus && <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('admin.table.status')}</th>}
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.length === 0 && (
                  <tr><td colSpan={displayFields.length + 2} className="px-4 py-12 text-center text-muted-foreground">{t('admin.table.noItems')}</td></tr>
                )}
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-border/60" checked={selectedIds.includes(item.id)} onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== item.id));
                      }} />
                    </td>
                    {displayFields.map((f) => (
                      <td key={f} className="max-w-[200px] px-4 py-3">
                        {renderCell(item, f, handleToggle)}
                      </td>
                    ))}
                    {showStatus && <td className="px-4 py-3">{renderCell(item, 'status')}</td>}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(item); setShowForm(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <CrudForm model={model} fields={fields} item={editing} label={label} statusOptions={statusOptions} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }} />
      )}

      {/* Pagination Controls */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{t('admin.table.rowsPerPage') || 'Rows per page:'}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1000</SelectItem>
                <SelectItem value="10000">All (Max 10k)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs">
              Showing {Math.min((page - 1) * pageSize + 1, total)} - {Math.min(page * pageSize, total)} of {total}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs font-medium">
              Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage(Math.ceil(total / pageSize))}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderCell(item: any, field: string, onToggle?: (item: any, field: string) => void) {
  const val = item[field];
  if (val === true || val === false) {
    if (['enabled', 'visible', 'featured', 'isMain', 'isDefault'].includes(field) && onToggle) {
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(item, field); }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-all hover:scale-105 select-none border',
            val
              ? 'border-chart-3/30 bg-chart-3/15 text-chart-3 hover:bg-chart-3/25'
              : 'border-muted-foreground/20 bg-muted text-muted-foreground hover:bg-muted/80'
          )}
          title={`Click to ${val ? 'disable / hide' : 'enable / show'}`}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', val ? 'bg-chart-3' : 'bg-muted-foreground')} />
          {val ? 'Enabled' : 'Disabled'}
        </button>
      );
    }
    if (val === true) return <span className="rounded-full bg-chart-3/15 px-2 py-0.5 text-xs font-semibold text-chart-3">Yes</span>;
    return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">No</span>;
  }
  if (val === null || val === undefined) return <span className="text-muted-foreground">—</span>;
  if (field === 'image' || field === 'avatar' || field === 'photo' || field === 'logo') {
    return val ? <img src={val} alt="" className="h-8 w-8 rounded object-cover" /> : <span className="text-muted-foreground">—</span>;
  }
  if (typeof val === 'string' && val.length > 60) return <span className="line-clamp-2 text-xs">{val}</span>;
  if (field === 'status') return <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', val === 'published' || val === 'active' ? 'bg-chart-3/15 text-chart-3' : 'bg-muted text-muted-foreground')}>{val}</span>;
  if (typeof val === 'object') return <span className="text-xs text-muted-foreground">{val.name || JSON.stringify(val).slice(0, 30)}</span>;
  return <span className="text-xs">{String(val)}</span>;
}

// ─── CRUD Form ─────────────────────────────────────────────────
function CrudForm({ model, fields, item, label, statusOptions, onClose, onSaved }: {
  model: string; fields: string[]; item: any | null; label: string; statusOptions?: string[]; onClose: () => void; onSaved: () => void;
}) {
  const t = useT();
  const [data, setData] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    for (const f of fields) {
      init[f] = item?.[f] ?? '';
      // Also initialize i18n fields if they exist
      const i18nField = `${f}I18n`;
      if (item?.[i18nField]) {
        init[i18nField] = item[i18nField];
      }
    }
    // defaults for new items
    if (!item) {
      if (fields.includes('status')) init.status = 'published';
      if (fields.includes('order')) init.order = 0;
      if (fields.includes('featured')) init.featured = false;
      if (fields.includes('enabled')) init.enabled = true;
      if (fields.includes('visible')) init.visible = true;
      if (fields.includes('isMain')) init.isMain = false;
      // R21-c: model-specific sane defaults
      if (model === 'contactMessage' && fields.includes('status')) init.status = 'new';
      if (model === 'subscriber' && fields.includes('status')) init.status = 'active';
      if (model === 'templateComment' && fields.includes('status')) init.status = 'approved';
      if (model === 'importSource') {
        if (fields.includes('scheduleMinutes')) init.scheduleMinutes = 60;
        if (fields.includes('autoPublish')) init.autoPublish = false;
      }
      if (model === 'interviewSession') {
        if (fields.includes('mode')) init.mode = 'practice';
        if (fields.includes('status')) init.status = 'in_progress';
      }
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const { toast } = useToast();

  // One-click AI translation for News rows: fills title/excerpt/content
  // فارسی + پښتو drafts from the English values via /api/admin/ai-translate.
  const autoTranslateNews = async () => {
    const payload: Record<string, string> = {};
    for (const f of ['title', 'excerpt', 'content']) {
      const i18nMap = data[`${f}I18n`] as Record<string, string> | undefined;
      const en = (i18nMap?.en || data[f] || '').trim();
      if (en) payload[f] = en;
    }
    if (!payload.title && !payload.content) {
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
      setData((d: Record<string, any>) => {
        const next = { ...d };
        for (const f of ['title', 'excerpt', 'content']) {
          const fa = (result.fa as Record<string, string> | undefined)?.[f];
          const ps = (result.ps as Record<string, string> | undefined)?.[f];
          if (!fa && !ps) continue;
          const current = (next[`${f}I18n`] as Record<string, string>) || {};
          const base = (next[f] as string) || current.en || '';
          next[`${f}I18n`] = { en: base, fa: fa || current.fa || '', ps: ps || current.ps || '' };
          if (f === 'title' && fa && !next.title) next.title = base;
        }
        return next;
      });
      toast({ title: 'Farsi + Pashto drafts filled — review and save.' });
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally {
      setTranslating(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Check if this is a multilingual update (contains both base field and i18n field)
      const keys = Object.keys(value);
      const hasBaseField = keys.some(k => !k.endsWith('I18n'));
      const hasI18nField = keys.some(k => k.endsWith('I18n'));
      
      if (hasBaseField && hasI18nField) {
        // Multilingual update - spread all keys into state
        const updatedData = { ...data, ...value };
        
        // Auto-generate slug from title if title is being updated and slug is empty
        if ('title' in value && fields.includes('slug') && !data.slug) {
          updatedData.slug = generateSlug(value.title);
        }
        
        setData(updatedData);
        return;
      }
    }
    
    // Regular field update
    const updatedData = { ...data, [field]: value };
    
    // Auto-generate slug from title if title is being updated and slug is empty
    if (field === 'title' && fields.includes('slug') && !data.slug) {
      updatedData.slug = generateSlug(value);
    }
    
    setData(updatedData);
  };
  
  // Helper function to generate slug from title
  const generateSlug = (title: string): string => {
    if (!title) return '';
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_]+/g, '-')  // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Clean up empty i18n fields before submission
    const payload = { ...data };
    Object.keys(payload).forEach(key => {
      if (key.endsWith('I18n')) {
        // Remove i18n field if it's empty or has no translations
        if (!payload[key] || 
            (typeof payload[key] === 'object' && Object.keys(payload[key]).length === 0) ||
            (typeof payload[key] === 'object' && Object.values(payload[key]).every(v => !v))
        ) {
          delete payload[key];
        }
      }
    });
    
    const method = item ? 'PUT' : 'POST';
    const body = item ? { model, id: item.id, data: payload } : { model, data: payload };
    try {
      const res = await fetch('/api/admin/crud', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: item ? t('admin.toast.updated') : t('admin.toast.created') });
      onSaved();
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? t('admin.form.edit') : t('admin.form.add')} {label.replace(/s$/, '')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {(model === 'news' || model === 'successStory') && (
            <div className="flex justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={autoTranslateNews} disabled={translating || saving}>
                {translating ? '⏳ Translating…' : '✨ AI translate (فارسی / پښتو)'}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <FieldInput key={f} field={f} value={data[f]} item={data} model={model} allFields={fields} statusOptions={statusOptions} onChange={(v) => handleFieldChange(f, v)} />
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('admin.button.cancel')}</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-chart-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {item ? t('admin.button.save') : t('admin.button.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({ field, value, item, model, allFields = [], statusOptions, onChange }: { field: string; value: any; item?: any; model: string; allFields?: string[]; statusOptions?: string[]; onChange: (v: any) => void }) {
  const t = useT();
  
  // Define required fields by model (must match backend exactly)
  const getRequiredFields = (modelName: string): string[] => {
    const requiredFields: Record<string, string[]> = {
      service: ['title', 'slug', 'excerpt', 'description', 'status', 'sort'],
      visa: ['country', 'visaType', 'slug', 'status', 'sort'],
      opportunity: ['title', 'slug', 'description', 'status', 'sort'],
      news: ['title', 'slug', 'excerpt', 'content', 'status', 'publishedAt'],
      testimonial: ['name', 'rating', 'content', 'status', 'order'],
      partner: ['name', 'status', 'order'],
      counter: ['label', 'value', 'order'],
      faq: ['question', 'answer', 'order', 'status'],
      galleryItem: ['title', 'type', 'url', 'order'],
      paymentMethod: ['name', 'slug', 'status', 'order'],
      socialLink: ['platform', 'label', 'url', 'enabled', 'order'],
      footerLink: ['column', 'label', 'url', 'order'],
      whyChooseUsFeature: ['title', 'description', 'icon', 'color', 'glow', 'enabled', 'order'],
      department: ['name', 'order'],
      branch: ['name', 'address', 'isMain', 'order'],
      processStep: ['title', 'description', 'order', 'status'],
      pricingPackage: ['name', 'slug', 'price', 'period', 'ctaLabel', 'ctaUrl', 'order', 'status'],
      teamMember: ['name', 'role', 'order', 'featured', 'status'],
      comparisonRow: ['feature', 'ariaValue', 'othersValue', 'order', 'status'],
      ctaBanner: ['title', 'buttonText', 'buttonUrl', 'accent', 'order', 'status'],
      menuItem: ['label', 'order', 'visible', 'openInNewTab'],
      page: ['title', 'slug', 'content', 'status'],
      section: ['key', 'title', 'enabled', 'order'],
      language: ['code', 'name', 'nativeName', 'direction', 'enabled', 'isDefault', 'order'],
      serviceCategory: ['name', 'slug', 'order'],
      opportunityCategory: ['name', 'slug', 'order'],
      newsCategory: ['name', 'slug'],
      advertisement: ['company', 'title', 'description', 'package', 'startDate', 'endDate', 'status', 'order'],
      successStory: ['title', 'storyType', 'country', 'year', 'content', 'status'],
      visaRejection: ['section', 'title', 'status', 'order'],
      // R21-c completeness additions
      galleryAlbum: ['title', 'slug', 'order'],
      contactMessage: ['name', 'email', 'message', 'status'],
      subscriber: ['email', 'status'],
      templateComment: ['content', 'templateId', 'status'],
      templateRating: ['score', 'templateId', 'userId'],
      importSource: ['name', 'type', 'scraperKey', 'baseUrl', 'scheduleMinutes'],
      importRun: ['sourceId', 'status'],
      interviewSession: ['mode', 'status'],
    };
    return requiredFields[modelName] || [];
  };
  
  const isRequired = getRequiredFields(model).includes(field);
  
  // Define multilingual fields
  const multilingualFields = [
    'title', 'excerpt', 'description', 'content', 
    'name', 'role', 'company', 'bio',
    'question', 'answer',
    'country', 'visaType', 'eligibility', 'requirements', 'documents', 'applicationProcess',
    'benefits', 'subtitle', 'buttonText', 'features',
    'label', 'caption', 'ariaValue', 'feature', 'othersValue', 'secondaryText', 'suffix'
  ];
  
  const isMultilingual = multilingualFields.includes(field);
  const isLong = ['description', 'content', 'answer', 'message', 'instructions', 'bio', 'eligibility', 'benefits', 'applicationProcess', 'requirements', 'documents', 'gallery', 'tags', 'features', 'faqs', 'attachments', 'translations'].includes(field);
  const isBool = ['featured', 'enabled', 'visible', 'isMain', 'isDefault', 'openInNewTab', 'socialHideOnScroll', 'maintenanceMode', 'isRequired', 'autoPublish'].includes(field);
  const isNumber = ['order', 'sort', 'value', 'rating', 'score', 'duration', 'scheduleMinutes', 'found', 'imported', 'updated', 'skipped', 'duplicates', 'failed', 'processingMs'].includes(field);
  const isStatus = field === 'status';
  const isDirection = field === 'direction';
  const isType = field === 'type';
  const isAccent = field === 'accent';
  const isJson = ['extractedData', 'filters', 'mitigation'].includes(field); // real Json columns — parse to object
  const isRawLong = ['config', 'errors', 'lastRunStats'].includes(field); // String columns holding JSON text — keep raw

  // Try to get translation for field label, fallback to capitalized field name
  const getFieldLabel = () => {
    const key = `admin.form.${field}`;
    const translated = t(key);
    // If translation returns the key itself (not found), use capitalized field name
    const label = translated !== key ? translated : field.charAt(0).toUpperCase() + field.slice(1);
    return isRequired ? `${label} *` : label;
  };

  // i18n JSON fields: when the plain base field exists and is rendered as a
  // MultilingualInput (3 language tabs), the raw *I18n duplicate is skipped —
  // otherwise it would render a broken "[object Object]" input.
  if (field.endsWith('I18n')) {
    const base = field.slice(0, -4);
    if (allFields.includes(base) && multilingualFields.includes(base)) return null;
    const stringValue = typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : (value || '');
    return (
      <div className="sm:col-span-2">
        <Label className="mb-1.5 block text-sm font-medium">{getFieldLabel()} (JSON: en / fa / ps)</Label>
        <Textarea
          value={stringValue}
          onChange={(e) => {
            const val = e.target.value;
            try { onChange(JSON.parse(val)); } catch { onChange(val); }
          }}
          rows={4}
          dir="ltr"
          className="font-mono text-xs"
        />
      </div>
    );
  }

  // Render MultilingualInput for multilingual text fields
  if (isMultilingual) {
    const i18nField = `${field}I18n`;
    const i18nValue = item?.[i18nField];
    
    return (
      <div className={isLong ? 'sm:col-span-2' : ''}>
        <MultilingualInput
          field={field}
          value={value}
          i18nValue={i18nValue}
          isLong={isLong}
          onChange={(baseValue, i18nValue) => {
            // Update both base field and i18n field
            onChange({ [field]: baseValue, [i18nField]: i18nValue });
          }}
        />
      </div>
    );
  }

  if (isBool) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <Label className="text-sm font-medium">{getFieldLabel()}</Label>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  }

  if (isStatus) {
    const opts = statusOptions && statusOptions.length ? statusOptions : ['published', 'draft', 'archived', 'active'];
    return (
      <div>
        <Label className="mb-1.5 block text-sm font-medium">{getFieldLabel()}</Label>
        <Select value={value || opts[0]} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isType) {
    return (
      <div>
        <Label className="mb-1.5 block text-sm font-medium">{getFieldLabel()}</Label>
        <Select value={value || 'image'} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="image">image</SelectItem>
            <SelectItem value="video">video</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isAccent) {
    return (
      <div>
        <Label className="mb-1.5 block text-sm font-medium">{getFieldLabel()}</Label>
        <Select value={value || 'primary'} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">primary</SelectItem>
            <SelectItem value="secondary">secondary</SelectItem>
            <SelectItem value="accent">accent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isDirection) {
    return (
      <div>
        <Label className="mb-1.5 block text-sm font-medium">{getFieldLabel()}</Label>
        <Select value={value || 'ltr'} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ltr">ltr</SelectItem>
            <SelectItem value="rtl">rtl</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isRawLong) {
    return (
      <div className="sm:col-span-2">
        <Label className="mb-1.5 block text-sm font-medium">{getFieldLabel()} (JSON text)</Label>
        <Textarea
          value={typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : (value || '')}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          dir="ltr"
          className="font-mono text-xs"
        />
      </div>
    );
  }

  if (isJson) {
    const stringValue = typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : value || '';
    return (
      <div className="sm:col-span-2">
        <Label className="mb-1.5 block text-sm font-medium">{getFieldLabel()} (JSON format)</Label>
        <Textarea 
          value={stringValue} 
          onChange={(e) => {
            const val = e.target.value;
            try { onChange(JSON.parse(val)); } catch { onChange(val); }
          }} 
          rows={6} 
          className="font-mono text-xs"
        />
      </div>
    );
  }

  return (
    <div className={isLong ? 'sm:col-span-2' : ''}>
      <Label className="mb-1.5 block text-sm font-medium">{getFieldLabel()}</Label>
      {isLong ? (
        <RichTextEditor 
          value={value || ''} 
          onChange={(val) => onChange(val)} 
          className={isRequired && !value ? 'border-orange-500 border-2 rounded-md' : ''}
        />
      ) : (
        <Input
          type={isNumber ? 'number' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(isNumber ? (e.target.value ? Number(e.target.value) : 0) : e.target.value)}
          placeholder={field === 'slug' ? 'Auto-generated from title' : undefined}
          className={isRequired && !value ? 'border-orange-500 border-2' : ''}
        />
      )}
      {field === 'slug' && !value && (
        <p className="mt-1 text-xs text-muted-foreground">
          Will be auto-generated from title if left empty
        </p>
      )}
      {isRequired && !value && field !== 'slug' && (
        <p className="mt-1 text-xs text-orange-500">
          This field is required
        </p>
      )}
    </div>
  );
}

// ─── Settings Panel ────────────────────────────────────────────
function SettingsPanel() {
  const t = useT();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => { setSettings(d.settings); setLoading(false); })
      .catch(() => { setLoading(false); setSettings(null); });
  }, []);

  const set = (f: string, v: any) => setSettings((s: any) => ({ ...s, [f]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t('admin.toast.failed'));
      }
      toast({ title: t('admin.toast.saved') });
    } catch (e: any) {
      toast({ title: e.message || t('admin.toast.failedSave'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!settings) return <p className="text-sm text-muted-foreground">{t('admin.panel.failedLoadSettings')}</p>;

  const textFields = [
    { f: 'siteName', labelKey: 'admin.settings.siteName' },
    { f: 'tagline', labelKey: 'admin.settings.tagline' },
    { f: 'email', labelKey: 'admin.settings.email' },
    { f: 'phone', labelKey: 'admin.settings.phone' },
    { f: 'currency', labelKey: 'admin.settings.currency' },
    { f: 'timezone', labelKey: 'admin.settings.timezone' },
    { f: 'dateFormat', labelKey: 'admin.settings.dateFormat' },
    { f: 'fontFamily', labelKey: 'admin.settings.fontFamily' },
    { f: 'gaId', labelKey: 'admin.settings.gaId' },
    { f: 'fbPixelId', labelKey: 'admin.settings.fbPixelId' },
    { f: 'logoUrl', labelKey: 'admin.settings.logoUrl' },
    { f: 'logoDarkUrl', labelKey: 'admin.settings.logoDarkUrl' },
    { f: 'faviconUrl', labelKey: 'admin.settings.faviconUrl' },
    { f: 'appleIconUrl', labelKey: 'admin.settings.appleIconUrl' },
  ];

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      {/* Branding */}
      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="text-sm font-bold">{t('admin.settings.branding')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {textFields.map(({ f, labelKey }) => (
            <div key={f}>
              <MultilingualInput
                field={f}
                value={settings[f]}
                i18nValue={settings[`${f}I18n`]}
                isLong={false}
                onChange={(baseValue, i18nValue) => {
                  set(f, baseValue);
                  set(`${f}I18n`, i18nValue);
                }}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <MultilingualInput
              field="description"
              value={settings.description}
              i18nValue={settings.descriptionI18n}
              isLong={true}
              onChange={(baseValue, i18nValue) => {
                set('description', baseValue);
                set('descriptionI18n', i18nValue);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <MultilingualInput
              field="address"
              value={settings.address}
              i18nValue={settings.addressI18n}
              isLong={true}
              onChange={(baseValue, i18nValue) => {
                set('address', baseValue);
                set('addressI18n', i18nValue);
              }}
            />
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="text-sm font-bold">{t('admin.settings.themeColors')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { f: 'primaryColor', labelKey: 'admin.settings.primaryColor' },
            { f: 'secondaryColor', labelKey: 'admin.settings.secondaryColor' },
            { f: 'accentColor', labelKey: 'admin.settings.accentColor' },
          ].map(({ f, labelKey }) => (
            <div key={f}>
              <Label className="mb-1.5 block text-sm font-medium">{t(labelKey)}</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings[f] || '#0A66C2'} onChange={(e) => set(f, e.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-transparent" aria-label={t(labelKey)} />
                <Input value={settings[f] || ''} onChange={(e) => set(f, e.target.value)} className="flex-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Layout & Behavior */}
      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="text-sm font-bold">{t('admin.settings.layoutBehavior')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">{t('admin.settings.socialPosition')}</Label>
            <Select value={settings.socialPosition || 'left'} onValueChange={(v) => set('socialPosition', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">{t('admin.settings.socialPositionLeft')}</SelectItem>
                <SelectItem value="right">{t('admin.settings.socialPositionRight')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label className="text-sm font-medium">{t('admin.settings.socialHideOnScroll')}</Label>
            <Switch checked={!!settings.socialHideOnScroll} onCheckedChange={(v) => set('socialHideOnScroll', v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2">
            <div>
              <Label className="text-sm font-medium">{t('admin.settings.maintenanceMode')}</Label>
              <p className="text-xs text-muted-foreground">{t('admin.settings.maintenanceDesc')}</p>
            </div>
            <Switch checked={!!settings.maintenanceMode} onCheckedChange={(v) => set('maintenanceMode', v)} />
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="text-sm font-bold">{t('admin.settings.mapEmbed')}</h3>
        <Textarea value={settings.mapEmbed || ''} onChange={(e) => set('mapEmbed', e.target.value)} rows={3} placeholder={t('admin.settings.mapEmbedPlaceholder')} />
      </section>

      {/* Database Operations */}
      <section className="space-y-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
        <h3 className="text-sm font-bold text-destructive">Database Operations</h3>
        <p className="text-sm text-muted-foreground">Run the database seed script to insert default data and missing &quot;Tools&quot; menus (CV Builder, Opportunity Matcher).</p>
        <Button 
          type="button" 
          variant="destructive" 
          onClick={async () => {
            if(!confirm("Are you sure you want to run the database seed? This will insert missing menus.")) return;
            toast({ title: 'Seeding database...' });
            try {
              const res = await fetch('/api/admin/seed');
              const data = await res.json();
              if (res.ok) toast({ title: 'Database Seeded Successfully! Refreshing...' });
              else throw new Error(data.error);
              setTimeout(() => window.location.reload(), 1500);
            } catch (e: any) {
              toast({ title: e.message || 'Seed failed', variant: 'destructive' });
            }
          }}
        >
          Run Database Seed
        </Button>
      </section>

      <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-chart-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t('admin.settings.saveSettings')}
      </Button>
    </form>
  );
}

// ─── Change Password Dialog ─────────────────────────────────────
function ChangePasswordDialog({ open, onClose, toast }: { open: boolean; onClose: () => void; toast: (opts: any) => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'New passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'New password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      toast({ title: 'Password changed successfully!' });
      handleClose();
    } catch (e: any) {
      toast({ title: e.message || 'Failed to change password', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change Password
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-chart-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Change Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
