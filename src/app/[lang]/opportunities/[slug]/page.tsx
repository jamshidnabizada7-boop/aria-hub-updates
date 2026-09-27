import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { formatDateLong, formatDateShort } from '@/lib/date-format';
import {
  ArrowUpRight,
  Banknote,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  GraduationCap,
  FileText,
  Info,
  ListChecks,
  Mail,
  MapPin,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { OpportunityCard } from '@/components/site/opportunity-card';
import { AdSlot } from '@/components/site/ad-slot';
import { ShareBar } from '@/components/site/share-bar';
import { DetailSaveButton } from '@/components/site/save-button';
import { CalendarButton } from '@/components/site/calendar-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { translate } from '@/lib/i18n';
import { getLocalizedContent } from '@/lib/i18n-content';
import { removeLeadingTitle, renderListingContent } from '@/lib/content-html';
import { isLang, type Lang } from '@/lib/lang-route';
import {
  categoryLabel,
  cleanSummary,
  daysUntilDeadline,
  getOpportunityBySlug,
  getRelatedOpportunities,
  isOpportunityExpired,
  resolveSummary,
  type OpportunityDetail,
} from '@/lib/opportunity-queries';
import { cn } from '@/lib/utils';
import { ensureSeoDescription } from '@/lib/seo-metadata';

const SITE_URL = 'https://www.myariahub.com';

// React cache(): generateMetadata + the page body share one DB query per request.
const getOpportunity = cache((slug: string) => getOpportunityBySlug(slug));

// Opportunity content changes with imports + AI enrichment backfills —
// re-render at most 60s stale so deadline counts and cleaned content stay
// fresh without sacrificing the static-render performance win.
export const revalidate = 600;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

type I18nJson = Record<string, string> | null | undefined;

function localize(base: string | null, i18n: I18nJson, lang: Lang): string {
  return getLocalizedContent(base, i18n, lang);
}

const FORM_URL_RE =
  /kobotoolbox|docs\.google\.com\/forms|forms\.gle|forms\.office|typeform|jotform|survey|webform/i;

interface ApplyInfo {
  /** Exact application link (email/form/portal). NEVER the scraped source page. */
  primaryHref: string | null;
  primaryLabelKey: string;
  isMailto: boolean;
  /** Email address behind a mailto: apply URL. */
  email: string | null;
}

function getApplyInfo(opp: OpportunityDetail): ApplyInfo {
  const applyUrl = opp.applyUrl?.trim() || null;
  const isMailto = !!applyUrl?.toLowerCase().startsWith('mailto:');
  const isHttp = !!applyUrl && /^https?:\/\//i.test(applyUrl);

  let primaryLabelKey = 'detail.applyNow';
  if (isMailto) primaryLabelKey = 'detail.applyEmail';
  else if (isHttp && FORM_URL_RE.test(applyUrl!)) primaryLabelKey = 'detail.applyForm';

  const email = isMailto ? applyUrl!.replace(/^mailto:/i, '').split('?')[0] : null;

  return { primaryHref: applyUrl, primaryLabelKey, isMailto, email };
}

// ---------------------------------------------------------------------------
// metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const opp = await getOpportunity(slug);
  if (!opp) return {};

  const title = localize(opp.title, opp.titleI18n as I18nJson, lang);
  const rawDesc = resolveSummary(opp, lang) || cleanSummary(localize(opp.description, opp.descriptionI18n as I18nJson, lang), 155);
  const description = ensureSeoDescription(
    rawDesc,
    lang,
    lang === 'fa'
      ? 'جزئیات کامل، شرایط ثبت‌نام و راهنمای اپلای این موقعیت در آریا هاب.'
      : lang === 'ps'
      ? 'بشپړ معلومات، شرایط او د غوښتنلیک لارښود په آریا هاب کې ترلاسه کړئ.'
      : 'Find eligibility requirements, deadline, and application instructions on ARIA HUB.'
  );

  const pageTitle = title.length < 24
    ? `${title} — Scholarship & Job Listing | ARIA HUB`
    : `${title} | ARIA HUB`;

  return {
    metadataBase: new URL(SITE_URL),
    title: pageTitle,
    description,
    alternates: {
      canonical: `/${lang}/opportunities/${slug}`,
      languages: {
        en: `/en/opportunities/${slug}`,
        fa: `/fa/opportunities/${slug}`,
        ps: `/ps/opportunities/${slug}`,
      },
    },
    openGraph: {
      title: pageTitle,
      description,
      url: `/${lang}/opportunities/${slug}`,
      siteName: 'ARIA HUB',
      locale: lang,
      type: 'article',
    },
  };
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string, p?: Record<string, string | number>) => translate(lang, key, p);

  const [data, opp] = await Promise.all([getSiteData(), getOpportunity(slug)]);
  if (!opp) notFound();

  const related = await getRelatedOpportunities(opp, lang, 4);

  // ---- localized content ----------------------------------------------------
  const title = localize(opp.title, opp.titleI18n as I18nJson, lang);
  const organization = opp.organization;
  const jobType = localize(opp.jobType, opp.jobTypeI18n as I18nJson, lang) || null;
  const salary = localize(opp.salary, opp.salaryI18n as I18nJson, lang) || null;
  const educationReq = localize(opp.educationReq, opp.educationReqI18n as I18nJson, lang) || null;
  const experience = localize(opp.experience, opp.experienceI18n as I18nJson, lang) || null;

  const rawDescription = localize(opp.description, opp.descriptionI18n as I18nJson, lang);
  const requirements = localize(opp.requirements, opp.requirementsI18n as I18nJson, lang);
  const responsibilities = localize(opp.responsibilities, opp.responsibilitiesI18n as I18nJson, lang);
  const eligibility = localize(opp.eligibility, opp.eligibilityI18n as I18nJson, lang);
  const benefits = localize(opp.benefits, opp.benefitsI18n as I18nJson, lang);
  const guidelines = localize(opp.guidelines, opp.guidelinesI18n as I18nJson, lang);
  const summary = cleanSummary(
    localize(opp.aiSummary, opp.aiSummaryI18n as I18nJson, lang),
    800
  );

  const expired = isOpportunityExpired(opp.status, opp.deadline);
  const daysLeft = opp.deadline ? daysUntilDeadline(opp.deadline) : null;
  const apply = getApplyInfo(opp);
  // ICS download only makes sense for a deadline still ahead of us.
  const showCalendar = !!opp.deadline && !expired;

  const postedDateIso = opp.publishedDate || opp.createdAt.toISOString().slice(0, 10);
  const postedDate = postedDateIso
    ? formatDateLong(new Date(`${postedDateIso}T00:00:00Z`), lang)
    : '';

  const pageUrl = `${SITE_URL}/${lang}/opportunities/${opp.slug}`;
  const cvPurpose =
    /scholar|fellow|academic|research/i.test(opp.jobType || '') ? 'scholarship'
      : /intern|student|trainee/i.test(opp.jobType || '') ? 'student'
        : 'professional';
  const cvBuilderHref =
    `/${lang}/cv-builder?purpose=${cvPurpose}&opportunity=${encodeURIComponent(opp.slug)}&title=${encodeURIComponent(title)}&returnTo=${encodeURIComponent(`/${lang}/opportunities/${opp.slug}`)}`;
  const cvBuilderLabel =
    lang === 'fa' ? 'ساخت CV برای این فرصت'
      : lang === 'ps' ? 'د دې فرصت لپاره CV جوړ کړئ'
        : 'Build a CV for this opportunity';

  // ---- JSON-LD (JobPosting + BreadcrumbList) --------------------------------
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description: summary || renderListingContent(rawDescription).replace(/<[^>]+>/g, ' ').slice(0, 300),
    url: pageUrl,
    identifier: { '@type': 'PropertyValue', name: title, value: opp.slug },
    directApply: !!apply.primaryHref,
  };
  if (organization) jsonLd.hiringOrganization = { '@type': 'Organization', name: organization };
  if (postedDateIso) jsonLd.datePosted = postedDateIso;
  if (opp.deadline) jsonLd.validThrough = opp.deadline.toISOString();
  if (opp.country) {
    jsonLd.jobLocation = {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressCountry: opp.country },
    };
  }
  if (opp.jobType) {
    jsonLd.employmentType = opp.jobType.toUpperCase().includes('FULL')
      ? 'FULL_TIME'
      : opp.jobType.toUpperCase().includes('PART')
        ? 'PART_TIME'
        : opp.jobType.toUpperCase().includes('INTERNSHIP')
          ? 'INTERN'
          : 'CONTRACTOR';
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('nav.home') === 'nav.home' ? 'Home' : t('nav.home'), item: `${SITE_URL}/${lang}` },
      { '@type': 'ListItem', position: 2, name: t('opportunities.title') === 'opportunities.title' ? 'Opportunities' : t('opportunities.title'), item: `${SITE_URL}/${lang}/opportunities` },
      { '@type': 'ListItem', position: 3, name: title, item: pageUrl },
    ],
  };

  // ---- structured sections (sanitized, professional HTML) --------------------
  // Overview is dropped entirely when the "description" carries no real
  // information beyond repeating the title (bad scrapes, stub records).
  const titleNorm = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const descNorm = rawDescription.replace(/<[^>]+>/g, ' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const descIsTitleDup =
    descNorm.length === 0 ||
    (titleNorm.length >= 12 && (descNorm === titleNorm || (descNorm.length <= titleNorm.length + 12 && descNorm.includes(titleNorm))));

  const sections: { icon: LucideIcon; heading: string; html: string; isGuidelines?: boolean }[] = [
    { icon: Info, heading: t('opportunities.overview'), html: descIsTitleDup ? '' : renderListingContent(removeLeadingTitle(rawDescription, opp.title)) },
    { icon: ListChecks, heading: t('opportunities.requirements'), html: renderListingContent(requirements) },
    { icon: Briefcase, heading: t('opportunities.responsibilities'), html: renderListingContent(responsibilities) },
    { icon: CheckCircle2, heading: t('opportunities.eligibility'), html: renderListingContent(eligibility) },
    { icon: Trophy, heading: t('opportunities.benefits'), html: renderListingContent(benefits) },
    { icon: ArrowUpRight, heading: t('detail.howToApply'), html: renderListingContent(guidelines), isGuidelines: true },
  ].filter((s) => s.html && s.html.replace(/<[^>]+>/g, '').trim().length > 0);

  // ---- key facts (the scannable strip at the very top) ----------------------
  const factTone = daysLeft === null
    ? 'text-foreground'
    : daysLeft <= 3
      ? 'text-destructive'
      : daysLeft <= 7
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-primary';
  const keyFacts: { icon: LucideIcon; label: string; value: string; emphasis?: boolean; href?: string }[] = [
    { icon: Building2, label: t('opportunities.organization'), value: organization || '' },
    { icon: MapPin, label: t('opportunities.location'), value: opp.country || '' },
    { icon: Briefcase, label: t('detail.jobType'), value: jobType || '' },
    { icon: Banknote, label: t('opportunities.salary'), value: salary || '' },
    { icon: GraduationCap, label: t('opportunities.education'), value: educationReq || '' },
    { icon: Clock, label: t('opportunities.experience'), value: experience || '' },
    {
      icon: CalendarDays,
      label: t('opportunities.deadline'),
      value: opp.deadline ? formatDateLong(opp.deadline, lang) : '',
      emphasis: true,
    },
    { icon: CalendarDays, label: t('opportunities.posted'), value: postedDate || '' },
  ].filter((f) => f.value && f.value.trim());

  // ---- extra scraped fact sheet (extractedData) ------------------------------
  // Every fact the import pipeline captured that isn't already shown in the
  // key-facts strip above gets a compact two-column table here (vacancy
  // number, gender, nationality, contract duration, opportunity ID, …).
  const shownFactKeys = new Set([
    'location', 'city', 'category', 'employment type', 'type', 'salary',
    'education', 'experience', 'closing date', 'deadline', 'published',
    'organization', 'company', 'job type', 'slug', 'url', 'link',
    'source', 'sourceurl', 'source name',
  ]);
  // Raw scraper keys (workType, functionalAreas, …) → human labels.
  const FACT_LABELS: Record<string, string> = {
    worktype: 'Work type',
    functionalareas: 'Functional areas',
    'functional area': 'Functional areas',
    probationperiod: 'Probation period',
    contracttype: 'Contract type',
    contractduration: 'Contract duration',
    contractextension: 'Contract extension',
    referencenumber: 'Reference number',
    reference: 'Reference number',
    numberofvacancies: 'Vacancies',
    vacancies: 'Vacancies',
    announcementtype: 'Announcement type',
    salaryrange: 'Salary range',
    experiencerequired: 'Experience required',
    'yearsofexperience': 'Years of experience',
    languages: 'Languages',
    nationality: 'Nationality',
    travelrequired: 'Travel required',
    gender: 'Gender',
    'education level': 'Education level',
    submission: 'Submission',
    submissionemail: 'Submission email',
    opportunityid: 'Opportunity ID',
    degree: 'Degree',
    'no. of opportunity': 'No. of opportunities',
    'no. of jobs': 'No. of vacancies',
    'number of fellowships': 'Number of fellowships',
    duration: 'Duration',
    languageofinstruction: 'Language of instruction',
    'application fee required': 'Application fee',
    fundingtype: 'Funding type',
    studylevel: 'Study level',
    hostcountry: 'Host country',
    hostinstitution: 'Host institution',
  };
  const keyFactValues = new Set(
    keyFacts.map((f) => f.value.trim().toLowerCase()).filter(Boolean),
  );
  const extraFacts: { label: string; value: string }[] = [];
  const rawFacts = (opp.extractedData ?? {}) as Record<string, unknown>;
  for (const [label, value] of Object.entries(rawFacts)) {
    const v = Array.isArray(value)
      ? value.filter((x) => typeof x === 'string' || typeof x === 'number').join(', ')
      : typeof value === 'string' || typeof value === 'number'
        ? String(value).trim()
        : '';
    if (!v || v.length > 300) continue;
    const key = label.trim().toLowerCase();
    if (shownFactKeys.has(key)) continue;
    if (keyFactValues.has(v.toLowerCase())) continue;
    extraFacts.push({ label: FACT_LABELS[key] ?? label.trim(), value: v });
  }

  const catLabel = categoryLabel(
    lang,
    opp.category?.slug,
    opp.category?.name,
    opp.category?.nameI18n
  );

  const countdownTone =
    daysLeft === null
      ? null
      : daysLeft <= 3
        ? 'border-destructive/30 bg-destructive/5 text-destructive'
        : daysLeft <= 7
          ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'
          : 'border-primary/25 bg-primary/5 text-primary';
  const countdownPct =
    daysLeft === null ? 0 : Math.max(4, Math.min(100, Math.round((daysLeft / 30) * 100)));

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([jsonLd, breadcrumbLd]).replace(/</g, '\\u003c'),
        }}
      />

      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />

      <main className="flex-1 pt-24 pb-28 lg:pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${lang}`}>{t('detail.home')}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${lang}/opportunities`}>{t('opportunities.title')}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage dir="auto" className="max-w-[14rem] truncate sm:max-w-[22rem]">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* ---- main column ---- */}
            <div className="min-w-0">
              {expired && (
                <Alert variant="destructive" className="mb-6">
                  <CalendarClock className="h-4 w-4" />
                  <AlertTitle>{t('detail.deadlinePassed')}</AlertTitle>
                  <AlertDescription>{t('detail.deadlinePassedHint')}</AlertDescription>
                </Alert>
              )}

              <header>
                {catLabel && (
                  <p dir="auto" className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {catLabel}
                  </p>
                )}
                <h1
                  dir="auto"
                  className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-3xl"
                >
                  {title}
                </h1>
              </header>

              {/* ── KEY FACTS — the scannable summary strip, always at the top ── */}
              {keyFacts.length > 0 && (
                <Card className="mt-5 overflow-hidden border-border/70 p-0">
                  <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-2.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {t('detail.keyFacts')}
                    </h2>
                  </div>
                  {/* Column count adapts to the number of facts so rows look
                      intentional (static classes for Tailwind JIT). */}
                  <dl
                    className={
                      keyFacts.length <= 1
                        ? 'grid grid-cols-1 gap-3'
                        : keyFacts.length === 2
                          ? 'grid grid-cols-2 gap-3'
                          : keyFacts.length === 3
                            ? 'grid grid-cols-2 gap-3 sm:grid-cols-3'
                            : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'
                    }
                  >
                    {keyFacts.map((fact) => (
                      <div
                        key={fact.label}
                        className="rounded-lg border border-border/60 bg-card px-3.5 py-3 transition-colors hover:border-primary/30"
                      >
                        <dt className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                          <fact.icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                          {fact.label}
                        </dt>
                        <dd
                          dir="auto"
                          className={cn(
                            'mt-1 break-words text-[13px] font-semibold leading-snug',
                            fact.emphasis ? factTone : 'text-foreground'
                          )}
                        >
                          {fact.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}

              {/* Scraped fact sheet — remaining import-captured fields, merged
                  into the top Key Information area per the redesigned layout */}
              {extraFacts.length > 0 && (
                <Card className="mt-5 overflow-hidden border-border/70 p-0">
                  <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-2.5">
                    <ListChecks className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {t('opportunities.keyDetails')}
                    </h2>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-8 px-4 py-2 sm:grid-cols-2">
                    {extraFacts.map((fact) => (
                      <div
                        key={fact.label}
                        className="flex gap-3 border-b border-border/40 py-2 text-sm last:border-b-0"
                      >
                        <dt
                          dir="auto"
                          className="w-2/5 shrink-0 font-medium text-foreground/55"
                        >
                          {fact.label}
                        </dt>
                        <dd dir="auto" className="flex-1 break-words text-foreground/85">
                          {fact.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}

              {/* Deadline countdown */}
              {opp.deadline && !expired && daysLeft !== null && countdownTone && (
                <div className={cn('mt-5 rounded-xl border p-4', countdownTone)} role="status">
                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-6 w-6 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p dir="auto" className="text-sm font-bold leading-snug">
                        {daysLeft === 0
                          ? t('detail.deadlineToday')
                          : t('detail.deadlineIn', { count: daysLeft })}
                      </p>
                      <p className="text-xs opacity-80">
                        {t('opportunities.deadline')}: {formatDateLong(opp.deadline, lang)}
                      </p>
                    </div>
                  </div>
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-current/15"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-current transition-all"
                      style={{ width: `${countdownPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* AI summary */}
              {summary && (
                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    {t('detail.aiSummary')}
                  </h2>
                  <p dir="auto" className="mt-2 text-sm leading-relaxed text-foreground/90">
                    {summary}
                  </p>
                  <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {t('detail.aiSummaryNote')}
                  </p>
                </div>
              )}

              {/* Mid ad — after the summary, before any apply CTA (policy-safe:
                  renders nothing until NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_MID). */}
              <AdSlot
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_MID}
                className="mt-6"
                label={t('common.advertisement')}
              />

              {/* Apply CTA — mobile position (desktop lives in the sidebar) */}
              <ApplyCard apply={apply} lang={lang} className="mt-6 lg:hidden print:hidden" />
              <Button asChild variant="outline" className="mt-3 h-11 w-full rounded-xl lg:hidden print:hidden">
                <Link href={cvBuilderHref}>
                  <FileText className="me-1.5 h-4 w-4" aria-hidden="true" />
                  {cvBuilderLabel}
                </Link>
              </Button>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 lg:hidden">
                <ShareBar url={pageUrl} title={title} lang={lang} />
                <div className="flex items-center gap-2">
                  <DetailSaveButton slug={opp.slug} />
                  {showCalendar && <CalendarButton slug={opp.slug} lang={lang} />}
                </div>
              </div>

              {/* Structured content */}
              {sections.length > 0 && (
                <div className="mt-8 space-y-8">
                  {sections.map((section) => (
                    <section key={section.heading}>
                      <h2
                        dir="auto"
                        className="flex items-center gap-2 text-lg font-bold tracking-tight"
                      >
                        <section.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                        {section.heading}
                      </h2>
                      <div
                        dir="auto"
                        className="prose-listing mt-3 max-w-prose text-sm leading-relaxed text-foreground/80"
                        dangerouslySetInnerHTML={{ __html: section.html }}
                      />
                    </section>
                  ))}
                </div>
              )}

              {/* End-of-content ad — after content, before share bar (policy-safe:
                  renders nothing until NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_END). */}
              <AdSlot
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_END}
                className="mt-8"
                label={t('common.advertisement')}
              />

              {/* Share + calendar — bottom of content for discoverability */}
              <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
                <ShareBar url={pageUrl} title={title} lang={lang} />
                {showCalendar && <CalendarButton slug={opp.slug} lang={lang} />}
              </div>
            </div>

            {/* ---- sidebar (desktop; also the print-time apply source) ---- */}
            <aside className="hidden space-y-4 lg:block print:block">
              <div className="sticky top-24 space-y-4 print:static">
                <ApplyCard apply={apply} lang={lang} />
                <Button asChild variant="outline" className="w-full print:hidden">
                  <Link href={cvBuilderHref}>
                    <FileText className="me-1.5 h-4 w-4" aria-hidden="true" />
                    {cvBuilderLabel}
                  </Link>
                </Button>
                <Card className="p-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    {t('detail.share')}
                  </h2>
                  <ShareBar url={pageUrl} title={title} lang={lang} className="mt-3" />
                  <div className="mt-3 grid grid-cols-1 gap-2 print:hidden">
                    <DetailSaveButton slug={opp.slug} className="w-full" />
                    {showCalendar && (
                      <CalendarButton slug={opp.slug} lang={lang} className="w-full justify-center" />
                    )}
                  </div>
                </Card>
                <Card className="p-4 print:hidden">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    {t('detail.related')}
                  </h2>
                  <ul className="mt-3 space-y-1.5">
                    {related.slice(0, 4).map((item) => {
                      // Urgency chip: days left when ≤14, else localized short date.
                      const dl =
                        item.deadline && item.deadline.getTime() >= Date.now() - 86400000
                          ? Math.max(0, Math.ceil((item.deadline.getTime() - Date.now()) / 86400000))
                          : null;
                      const urgent = dl !== null && dl <= 7;
                      return (
                        <li key={item.id}>
                          <Link
                            href={`/${lang}/opportunities/${item.slug}`}
                            className="group flex items-start justify-between gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent/60"
                          >
                            <span
                              dir="auto"
                              className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground/80 transition-colors group-hover:text-primary"
                            >
                              {getLocalizedContent(item.title, (item as { titleI18n?: unknown }).titleI18n as I18nJson, lang)}
                            </span>
                            {dl !== null && (
                              <span
                                className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                                  urgent
                                    ? 'bg-red-500/10 text-red-600'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {dl <= 14 ? t('opportunities.daysLeft', { count: dl }) : formatDateShort(item.deadline!, lang)}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    href={`/${lang}/opportunities`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {t('detail.backToList')}
                    <ArrowUpRight className="h-3 w-3 rtl-flip" aria-hidden="true" />
                  </Link>
                </Card>
              </div>
            </aside>
          </div>

          {/* Related opportunities */}
          {related.length > 0 && (
            <section className="mt-14">
              <h2 dir="auto" className="text-xl font-bold tracking-tight">
                {t('detail.related')}
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                {related.map((item) => (
                  <OpportunityCard key={item.id} opportunity={item} lang={lang} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer settings={data.settings} footer={data.footer} socialLinks={data.socialLinks} />

      {/* Spacer so the fixed mobile action bar never covers footer content */}
      <div aria-hidden="true" className="h-[4.25rem] bg-card/40 lg:hidden print:hidden" />

      {/* Sticky mobile action bar — Apply + Save */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden print:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {apply.primaryHref ? (
            <Button asChild className="h-11 flex-1 rounded-xl bg-gradient-to-r from-primary to-chart-2 font-bold shadow-float transition-opacity hover:opacity-90">
              <a href={apply.primaryHref} target="_blank" rel="noopener noreferrer">
                {apply.isMailto ? <Mail className="me-1.5 h-4 w-4" aria-hidden="true" /> : null}
                {t(apply.primaryLabelKey)}
                {!apply.isMailto && <ArrowUpRight className="ms-1.5 h-4 w-4 rtl-flip" aria-hidden="true" />}
              </a>
            </Button>
          ) : null}
          <DetailSaveButton slug={opp.slug} className="h-11 shrink-0" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// apply CTA card — the ONLY outgoing application path we show users.
// No source-site link, no "view original" — ever.
// ---------------------------------------------------------------------------

function ApplyCard({
  apply,
  lang,
  className,
}: {
  apply: ApplyInfo;
  lang: Lang;
  className?: string;
}) {
  const t = (key: string) => translate(lang, key);

  if (!apply.primaryHref) {
    // No verified application link: guide the user without any misleading link.
    return (
      <Card className={cn('border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-chart-2/[0.06] p-5 shadow-sm', className)}>
        <div className="flex flex-col gap-2.5">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            {t('detail.howToApply')}
          </h3>
          <p dir="auto" className="text-[13px] leading-relaxed text-foreground/80">
            {t('detail.noApplyBody')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-chart-2/[0.06] p-4 shadow-sm', className)}>
      <div className="flex flex-col gap-3">
        <Button asChild size="lg" className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-chart-2 text-base font-bold shadow-float transition-opacity hover:opacity-90">
          <a href={apply.primaryHref} target="_blank" rel="noopener noreferrer">
            {apply.isMailto ? <Mail className="me-1.5 h-4 w-4" aria-hidden="true" /> : null}
            {t(apply.primaryLabelKey)}
            {!apply.isMailto && <ArrowUpRight className="ms-1.5 h-4 w-4 rtl-flip" aria-hidden="true" />}
          </a>
        </Button>

        {apply.email && (
          <p dir="ltr" className="break-all text-center text-xs text-muted-foreground">
            <Globe className="me-1 inline h-3 w-3" aria-hidden="true" />
            {apply.email}
          </p>
        )}

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          {t('detail.officialLinkNote')}
        </p>
      </div>
    </Card>
  );
}
