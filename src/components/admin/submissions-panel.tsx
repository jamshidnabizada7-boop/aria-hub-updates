'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';
import { cn } from '@/lib/utils';

/* ─── Types ────────────────────────────────────────────────────────────── */

interface Submission {
  id: string;
  title: string;
  organization: string | null;
  categorySlug: string;
  country: string | null;
  deadline: string | null;
  applyUrl: string | null;
  applyEmail: string | null;
  description: string;
  contactName: string | null;
  contactEmail: string;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  submitterType: string; // community | employer
  referenceCode: string;
  jobType: string | null;
  salaryRange: string | null;
  location: string | null;
  companyWebsite: string | null;
}

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
  employers: number;
  pendingEmployers: number;
}

type Tab = 'pending' | 'approved' | 'rejected';
type TypeFilter = 'all' | 'community' | 'employer';

/* ─── Component ─────────────────────────────────────────────────────────── */

export function SubmissionsPanel() {
  const { toast } = useToast();
  const t = useT();

  const [items, setItems] = useState<Submission[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0, employers: 0, pendingEmployers: 0 });
  const [tab, setTab] = useState<Tab>('pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchItems = useCallback(
    async (status: Tab, type: TypeFilter) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/submissions?status=${status}&type=${type}`, { cache: 'no-store' });
        const data = await res.json();
        setItems(data.items || []);
        setCounts(
          data.counts || { pending: 0, approved: 0, rejected: 0, employers: 0, pendingEmployers: 0 }
        );
      } catch {
        // network error — keep previous list
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchItems(tab, typeFilter);
  }, [tab, typeFilter, fetchItems]);

  async function moderate(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: 'Error', description: data.error || 'Action failed', variant: 'destructive' });
        return;
      }
      toast({
        title: action === 'approve' ? t('admin.submissions.approved') : t('admin.submissions.rejected'),
        description:
          action === 'approve' && data.slug
            ? t('admin.submissions.publishedAs', { slug: `/opportunities/${data.slug}` })
            : undefined,
      });
      await fetchItems(tab, typeFilter);
    } finally {
      setBusyId(null);
    }
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'pending', label: t('admin.submissions.pending'), count: counts.pending },
    { key: 'approved', label: t('admin.submissions.approved'), count: counts.approved },
    { key: 'rejected', label: t('admin.submissions.rejected'), count: counts.rejected },
  ];

  const TYPES: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: t('admin.submissions.type.all') },
    { key: 'community', label: t('admin.submissions.type.community') },
    { key: 'employer', label: counts.pendingEmployers > 0 && typeFilter !== 'employer' ? `${t('admin.submissions.type.employer')} · ${counts.pendingEmployers}` : t('admin.submissions.type.employer') },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              tab === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-bold',
                tab === key ? 'bg-primary-foreground/20' : 'bg-muted'
              )}
            >
              {count}
            </span>
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ms-auto gap-2"
          onClick={() => fetchItems(tab, typeFilter)}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          {t('admin.submissions.refresh')}
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Submission type">
        {TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            aria-pressed={typeFilter === key}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors',
              typeFilter === key
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {key === 'employer' && <Briefcase className="h-3 w-3" aria-hidden="true" />}
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid place-items-center rounded-xl border border-dashed py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed py-20 text-center text-muted-foreground">
          <Inbox className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm font-medium">
            {t('admin.submissions.empty', { tab: TABS.find((x) => x.key === tab)?.label.toLowerCase() ?? tab })}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => {
            const isEmployer = s.submitterType === 'employer';
            return (
              <Card key={s.id} className="overflow-hidden">
                <CardHeader className="cursor-pointer py-4" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 truncate text-base">
                        {isEmployer && (
                          <span
                            title={t('admin.submissions.employerBadge')}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400"
                          >
                            <Briefcase className="h-3 w-3" aria-hidden="true" />
                            {t('admin.submissions.employerBadge')}
                          </span>
                        )}
                        <span className="truncate">{s.title}</span>
                        {s.referenceCode && (
                          <code
                            dir="ltr"
                            title={t('admin.submissions.refCode')}
                            className="ms-1 hidden shrink-0 rounded bg-muted px-1.5 py-0.5 align-middle font-mono text-[10px] font-bold tracking-wider text-muted-foreground sm:inline"
                          >
                            {s.referenceCode}
                          </code>
                        )}
                      </CardTitle>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[s.organization, s.location, s.country, s.categorySlug].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant={s.status === 'pending' ? 'secondary' : s.status === 'approved' ? 'default' : 'destructive'}
                        className="capitalize"
                      >
                        {s.status}
                      </Badge>
                      <span className="hidden text-[11px] text-muted-foreground sm:inline">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {expanded === s.id && (
                  <CardContent className="border-t border-border/60 pt-4">
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.deadline')}</dt>
                        <dd className="mt-0.5 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {s.deadline ? new Date(s.deadline).toLocaleDateString() : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.category')}</dt>
                        <dd className="mt-0.5">{s.categorySlug}</dd>
                      </div>
                      {isEmployer && s.jobType && (
                        <div>
                          <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.jobType')}</dt>
                          <dd className="mt-0.5 flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                            {s.jobType}
                          </dd>
                        </div>
                      )}
                      {isEmployer && s.salaryRange && (
                        <div>
                          <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.salary')}</dt>
                          <dd className="mt-0.5 flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                            <span dir="auto">{s.salaryRange}</span>
                          </dd>
                        </div>
                      )}
                      {isEmployer && s.location && (
                        <div>
                          <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.location')}</dt>
                          <dd className="mt-0.5 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span dir="auto">{s.location}</span>
                          </dd>
                        </div>
                      )}
                      {isEmployer && s.companyWebsite && (
                        <div>
                          <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.website')}</dt>
                          <dd className="mt-0.5 flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <a
                              href={s.companyWebsite}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="text-primary hover:underline"
                            >
                              {s.companyWebsite.replace(/^https?:\/\//, '')}
                            </a>
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.apply')}</dt>
                        <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                          {s.applyUrl && (
                            <a
                              href={s.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> link
                            </a>
                          )}
                          {s.applyEmail && (
                            <a href={`mailto:${s.applyEmail}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Mail className="h-3 w-3" /> {s.applyEmail}
                            </a>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.contact')}</dt>
                        <dd className="mt-0.5">
                          {s.contactName ? `${s.contactName} — ` : ''}
                          <a href={`mailto:${s.contactEmail}`} className="text-primary hover:underline">
                            {s.contactEmail}
                          </a>
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.description')}</dt>
                        <dd className="mt-0.5 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/50 bg-muted/30 p-3 text-sm leading-relaxed">
                          {s.description}
                        </dd>
                      </div>
                      {s.reviewNote && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-semibold uppercase text-muted-foreground">{t('admin.submissions.reviewNote')}</dt>
                          <dd className="mt-0.5">{s.reviewNote}</dd>
                        </div>
                      )}
                    </dl>

                    {s.status === 'pending' && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => moderate(s.id, 'approve')}
                          disabled={busyId === s.id}
                          className="gap-1.5"
                        >
                          {busyId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-3.5 w-3.5" />
                          )}
                          {t('admin.submissions.approvePublish')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(s.id, 'reject')}
                          disabled={busyId === s.id}
                          className="gap-1.5"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                          {t('admin.submissions.reject')}
                        </Button>
                      </div>
                    )}
                    {s.status === 'approved' && s.reviewedBy && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {t('admin.submissions.reviewedBy', { name: s.reviewedBy })}
                        {s.reviewedAt ? ` · ${new Date(s.reviewedAt).toLocaleDateString()}` : ''}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
