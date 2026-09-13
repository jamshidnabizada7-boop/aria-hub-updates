'use client';

/**
 * ARIA HUB — Brand Studio template library (100% code-driven).
 *
 * Seven deterministic branded layouts + the existing OpportunityPoster
 * (spotlight). Every layout shares the identical brand chrome — logo lockup,
 * navy/gold palette, gold kicker chip, ONE gold accent word per headline, gold
 * CTA band — so any post type is instantly recognisable as ARIA HUB (the
 * world-brand pattern: one visual signature, many recurring series formats).
 *
 * All canvases are fixed-pixel (1080×1080 / 1080×1350) with inline styles for
 * pixel-exact html-to-image PNG export. Text is pre-localized by the caller;
 * small UI labels come from the `social.post.*` i18n keys.
 */

import type { ReactNode } from 'react';
import {
  AlarmClock, BarChart3, CalendarDays, CheckCircle2, GraduationCap,
  Lightbulb, Newspaper, Quote as QuoteGlyph, Sparkles,
} from 'lucide-react';
import { translate } from '@/lib/i18n';
import { formatDateLong, toEasternDigits } from '@/lib/date-format';
import { BRAND, headlineSize, splitAccent, type PostTemplate } from '@/lib/social/brand';
import type { Lang } from '@/lib/lang-route';

export type PosterSize = 'square' | 'portrait';

const W = 1080;
const H: Record<PosterSize, number> = { square: 1080, portrait: 1350 };

export interface SocialCanvasProps {
  template: PostTemplate;
  lang: Lang;
  size: PosterSize;
  /** Pre-localized headline (single line). */
  title: string;
  /** Pre-localized secondary line. */
  note?: string;
  /** Series counter for numbered formats (tip #7 etc.). */
  seriesNo?: number;
  qrDataUrl?: string | null;
  /** ISO deadline (deadline template countdown). */
  deadlineDate?: string | null;
  /** Spotlight: full opportunity fields (already localized). */
  spotlight?: {
    category: string;
    organization: string;
    country: string;
    salary: string;
    featured: boolean;
  };
  /** Stat template: pre-localized value + label. */
  stat?: { value: string; label: string; sub?: string };
  /** Promo template: pre-localized checklist rows. */
  checklist?: string[];
  /** Story template: person chip. */
  person?: { name: string; meta: string };
  /** News template: publish date ISO. */
  newsDate?: string | null;
}

// ─── shared pieces ───────────────────────────────────────────────────────────

function Ambience({ portrait }: { portrait: boolean }) {
  return (
    <>
      <div
        style={{
          position: 'absolute', top: -200, insetInlineEnd: -170, width: 560, height: 560,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(248,216,152,0.14) 0%, rgba(248,216,152,0) 68%)',
        }}
      />
      <div
        style={{
          position: 'absolute', bottom: -240, insetInlineStart: -190, width: 660, height: 660,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1.4px, transparent 1.4px)',
          backgroundSize: '36px 36px', opacity: 0.3,
        }}
      />
      <img
        src={BRAND.logoSrc} alt="" aria-hidden="true"
        style={{
          position: 'absolute', bottom: portrait ? -150 : -130, insetInlineEnd: -140,
          width: 640, height: 640, opacity: 0.06, pointerEvents: 'none',
        }}
      />
    </>
  );
}

/** Headline with the ONE-gold-accent-word brand signature. */
function AccentHeadline({ text, max }: { text: string; max: number }) {
  const parts = splitAccent(text, 'x');
  return (
    <div
      style={{
        fontSize: headlineSize(text),
        fontWeight: 800, lineHeight: 1.26, letterSpacing: -0.5,
        display: '-webkit-box', WebkitLineClamp: max, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', textShadow: '0 6px 30px rgba(0,0,0,0.4)',
      }}
    >
      {parts.before}
      <span style={{ color: BRAND.gold }}>{parts.accent}</span>
      {parts.after}
    </div>
  );
}

function KickerChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        fontSize: 25, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
        padding: '12px 28px', borderRadius: 999,
        background: BRAND.goldFaint, border: `1.5px solid ${BRAND.goldLine}`, color: BRAND.gold,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

/** Shared brand shell: canvas + ambience + header lockup + footer CTA band. */
export function BrandShell({
  lang, size, kicker, kickerIcon, ctaLabel, qrDataUrl, children,
}: {
  lang: Lang;
  size: PosterSize;
  kicker: ReactNode;
  kickerIcon?: ReactNode;
  ctaLabel?: string;
  qrDataUrl?: string | null;
  children: ReactNode;
}) {
  const t = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
  const rtl = lang !== 'en';
  const h = H[size];
  const portrait = size === 'portrait';
  const pad = portrait ? 84 : 72;

  return (
    <div
      data-studio-canvas="1"
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        width: W, height: h, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(168deg, ${BRAND.bgTop} 0%, ${BRAND.bgMid} 46%, ${BRAND.bgBottom} 100%)`,
        fontFamily: 'var(--font-vazirmatn), sans-serif',
        color: BRAND.white, display: 'flex', flexDirection: 'column',
        flexShrink: 0, flexGrow: 0,
      }}
    >
      <Ambience portrait={portrait} />

      {/* top gold hairline */}
      <div
        style={{
          position: 'absolute', top: 0, insetInlineStart: 0, width: '100%', height: 10,
          background: `linear-gradient(90deg, ${BRAND.gold} 0%, ${BRAND.gold} 34%, rgba(248,216,152,0.25) 70%, rgba(248,216,152,0.08) 100%)`,
        }}
      />

      {/* header lockup — identical on every template */}
      <div
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 24,
          padding: `${portrait ? 74 : 62}px ${pad}px 0`,
        }}
      >
        <div
          style={{
            width: 88, height: 88, borderRadius: 24, overflow: 'hidden', flexShrink: 0,
            boxShadow: '0 14px 36px rgba(0,0,0,0.42)',
            outline: `2px solid ${BRAND.goldLine}`, outlineOffset: -2,
          }}
        >
          <img src={BRAND.logoSrc} alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 3, lineHeight: 1, direction: 'ltr', textAlign: rtl ? 'right' : 'left' }}>
            ARIA HUB
          </div>
          <div style={{ fontSize: 21, color: BRAND.goldSoft, fontWeight: 500 }}>{t('poster.tagline')}</div>
        </div>
      </div>

      {/* kicker */}
      <div style={{ position: 'relative', padding: `0 ${pad}px`, marginTop: portrait ? 50 : 38 }}>
        <KickerChip icon={kickerIcon} label={String(kicker)} />
      </div>

      {/* content zone */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* footer CTA band — fixed brand signature */}
      <div
        style={{
          position: 'relative', margin: `0 ${pad}px ${portrait ? 66 : 54}px`,
          background: `linear-gradient(135deg, ${BRAND.gold} 0%, #F3D08A 100%)`,
          color: BRAND.navyDeep, borderRadius: 24, padding: '22px 30px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: 32, fontWeight: 800, direction: 'ltr', textAlign: rtl ? 'right' : 'left', letterSpacing: 0.5 }}>
            {BRAND.site}
          </span>
          <span style={{ fontSize: 21, fontWeight: 700, color: 'rgba(27,36,64,0.72)' }}>
            {ctaLabel ?? t('poster.cta')}
          </span>
        </div>
        {qrDataUrl ? (
          <div
            style={{
              background: '#FFFBF2', borderRadius: 16, padding: 8, flexShrink: 0,
              boxShadow: 'inset 0 0 0 1.5px rgba(27,36,64,0.14)',
            }}
          >
            <img src={qrDataUrl} alt="QR" style={{ width: 84, height: 84, display: 'block' }} />
          </div>
        ) : (
          <div
            style={{
              width: 66, height: 66, borderRadius: 18, overflow: 'hidden', flexShrink: 0,
              outline: '2px solid rgba(27,36,64,0.35)', outlineOffset: -2,
            }}
          >
            <img src={BRAND.logoSrc} alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
      </div>

      {/* bottom gold strip */}
      <div
        style={{
          position: 'absolute', bottom: 0, insetInlineStart: 0, width: '100%', height: 12,
          background: `linear-gradient(90deg, ${BRAND.gold} 0%, ${BRAND.gold} 55%, rgba(248,216,152,0.35) 100%)`,
        }}
      />
    </div>
  );
}

// ─── per-template content zones ──────────────────────────────────────────────

function ContentFrame({ size, children }: { size: PosterSize; children: ReactNode }) {
  const pad = size === 'portrait' ? 84 : 72;
  return (
    <div
      style={{
        padding: `34px ${pad}px 34px`, flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26,
      }}
    >
      {children}
    </div>
  );
}

function GoldRule() {
  return (
    <div
      style={{
        width: 64, height: 7, borderRadius: 999,
        background: `linear-gradient(90deg, ${BRAND.gold}, rgba(248,216,152,0.35))`,
      }}
    />
  );
}

function daysLabelOf(lang: Lang, deadline: Date | null): { label: string; days: number | null; expired: boolean } {
  if (!deadline) return { label: '', days: null, expired: false };
  const days = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
  const expired = days < 0;
  const label = expired
    ? t('poster.expired')
    : days === 0
      ? t('poster.today')
      : days === 1
        ? t('poster.dayLeft')
        : t('poster.daysLeft', { n: toEasternDigits(String(days), lang) });
  return { label, days, expired };
}

// ─── main dispatcher ─────────────────────────────────────────────────────────

export function SocialCanvas(props: SocialCanvasProps) {
  const { template, lang, size, title, note, seriesNo, qrDataUrl } = props;
  const t = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
  const portrait = size === 'portrait';

  // Spotlight delegates to the proven opportunity poster (QR + deadline card).
  // if (template === 'spotlight') — handled by the caller (needs PosterData).
  const kickerKey = `social.post.kicker.${template}`;

  if (template === 'deadline') {
    const dl = props.deadlineDate ? new Date(props.deadlineDate) : null;
    const { label, days, expired } = daysLabelOf(lang, dl);
    const urgent = !expired && days !== null && days <= 7;
    const numColor = expired ? '#f87171' : BRAND.gold;
    return (
      <BrandShell
        lang={lang} size={size}
        kicker={t('social.post.kicker.deadline')}
        kickerIcon={<AlarmClock style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size}>
          <GoldRule />
          {/* typographic countdown card — Vazirmatn's lone Eastern digits read
              ambiguously at giant sizes, so the label IS the hero text */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
              background: expired ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.07)',
              border: `2px solid ${expired ? 'rgba(248,113,113,0.45)' : urgent ? 'rgba(251,191,36,0.5)' : BRAND.goldLine}`,
              borderRadius: 28, padding: '26px 34px',
            }}
          >
            <AlarmClock style={{ width: 52, height: 52, color: numColor, flexShrink: 0 }} />
            <span style={{ fontSize: 60, fontWeight: 900, lineHeight: 1.1, color: numColor, textShadow: '0 6px 30px rgba(0,0,0,0.4)' }}>
              {label}
            </span>
            {dl ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 26, color: BRAND.textDim, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <CalendarDays style={{ width: 28, height: 28, color: BRAND.gold }} />
                {formatDateLong(dl, lang)}
              </span>
            ) : null}
          </div>
          <AccentHeadline text={title} max={portrait ? 3 : 2} />
          {note ? (
            <div style={{ fontSize: 27, color: BRAND.textDim, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {note}
            </div>
          ) : null}
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'tip') {
    return (
      <BrandShell
        lang={lang} size={size}
        kicker={t('social.post.tipLabel', { n: toEasternDigits(String(seriesNo ?? 1), lang) })}
        kickerIcon={<Lightbulb style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size}>
          <div
            style={{
              width: 116, height: 116, borderRadius: '50%', flexShrink: 0,
              background: BRAND.goldFaint, border: `2px solid ${BRAND.goldLine}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Lightbulb style={{ width: 56, height: 56, color: BRAND.gold }} />
          </div>
          <GoldRule />
          <AccentHeadline text={title} max={portrait ? 4 : 3} />
          {note ? (
            <div style={{ fontSize: 27, color: BRAND.textDim, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {note}
            </div>
          ) : null}
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'quote') {
    return (
      <BrandShell
        lang={lang} size={size}
        kicker={t('social.post.kicker.quote')}
        kickerIcon={<QuoteGlyph style={{ width: 26, height: 26 }} />}
        ctaLabel={t('social.post.quoteCta')}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size}>
          <div style={{ fontSize: 170, lineHeight: 0.6, color: BRAND.gold, fontWeight: 900, direction: 'ltr', textAlign: lang === 'en' ? 'left' : 'right' }}>
            &ldquo;
          </div>
          <div
            style={{
              fontSize: headlineSize(title, 76), fontWeight: 800, lineHeight: 1.32,
              display: '-webkit-box', WebkitLineClamp: portrait ? 5 : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 56, height: 4, borderRadius: 999, background: BRAND.goldLine }} />
            <div style={{ fontSize: 26, fontWeight: 700, color: BRAND.goldSoft, direction: 'ltr' }}>
              {t('social.post.quoteBy')}
            </div>
          </div>
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'promo') {
    const rows = props.checklist && props.checklist.length ? props.checklist : [];
    return (
      <BrandShell
        lang={lang} size={size}
        kicker={t('social.post.kicker.promo')}
        kickerIcon={<Sparkles style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size}>
          <GoldRule />
          <AccentHeadline text={title} max={portrait ? 4 : 3} />
          {note ? (
            <div style={{ fontSize: 27, color: BRAND.textDim, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {note}
            </div>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 6 }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <CheckCircle2 style={{ width: 34, height: 34, color: BRAND.gold, flexShrink: 0 }} />
                <span style={{ fontSize: 30, fontWeight: 700 }}>{row}</span>
              </div>
            ))}
          </div>
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'news') {
    const nd = props.newsDate ? new Date(props.newsDate) : null;
    return (
      <BrandShell
        lang={lang} size={size}
        kicker={t('social.post.kicker.news')}
        kickerIcon={<Newspaper style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size}>
          <GoldRule />
          <AccentHeadline text={title} max={portrait ? 4 : 3} />
          {note ? (
            <div style={{ fontSize: 28, color: BRAND.textDim, fontWeight: 500, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: portrait ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {note}
            </div>
          ) : null}
          {nd ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 24, color: BRAND.goldSoft, fontWeight: 600 }}>
              <CalendarDays style={{ width: 26, height: 26, color: BRAND.gold }} />
              {formatDateLong(nd, lang)}
            </div>
          ) : null}
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'stat') {
    const stat = props.stat ?? { value: '', label: '', sub: undefined };
    return (
      <BrandShell
        lang={lang} size={size}
        kicker={t('social.post.kicker.stat')}
        kickerIcon={<BarChart3 style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size}>
          <GoldRule />
          <div
            style={{
              fontSize: portrait ? 140 : 124, fontWeight: 800, lineHeight: 1.05,
              color: BRAND.gold, direction: 'ltr',
              textAlign: lang === 'en' ? 'left' : 'right',
              textShadow: '0 10px 44px rgba(0,0,0,0.45)',
            }}
          >
            {stat.value}
          </div>
          <div style={{ fontSize: 42, fontWeight: 800 }}>{stat.label}</div>
          {stat.sub ? (
            <div style={{ fontSize: 27, color: BRAND.textDim, fontWeight: 500 }}>{stat.sub}</div>
          ) : null}
        </ContentFrame>
      </BrandShell>
    );
  }

  // story
  const person = props.person;
  return (
    <BrandShell
      lang={lang} size={size}
      kicker={t('social.post.kicker.story')}
      kickerIcon={<GraduationCap style={{ width: 26, height: 26 }} />}
      qrDataUrl={qrDataUrl}
    >
      <ContentFrame size={size}>
        <div style={{ fontSize: 130, lineHeight: 0.55, color: BRAND.gold, fontWeight: 900, direction: 'ltr', textAlign: lang === 'en' ? 'left' : 'right' }}>
          &ldquo;
        </div>
        <div
          style={{
            fontSize: headlineSize(title, 66), fontWeight: 700, lineHeight: 1.4, color: 'rgba(255,255,255,0.95)',
            display: '-webkit-box', WebkitLineClamp: portrait ? 5 : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {title}
        </div>
        {person ? (
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 16, alignSelf: 'flex-start',
              background: 'rgba(255,255,255,0.07)', border: `1.5px solid ${BRAND.goldLine}`,
              borderRadius: 18, padding: '14px 24px',
            }}
          >
            <GraduationCap style={{ width: 32, height: 32, color: BRAND.gold }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 26, fontWeight: 800 }}>{person.name}</span>
              <span style={{ fontSize: 21, color: BRAND.textDim, fontWeight: 600 }}>{person.meta}</span>
            </div>
          </div>
        ) : null}
      </ContentFrame>
    </BrandShell>
  );
}
