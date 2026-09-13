'use client';

/**
 * ARIA HUB — Brand Studio template library (100% code-driven).
 *
 * Eight deterministic branded layouts + the existing OpportunityPoster
 * (spotlight). Every layout shares the brand chrome — logo lockup, kicker
 * chip, ONE accent word per headline, CTA band — but now renders through a
 * THEME SYSTEM (src/lib/social/themes.ts): four full palettes × three layout
 * variants per format, so the studio is a design tool instead of a single
 * fixed skin.
 *
 * All canvases are fixed-pixel (1080×1080 / 1080×1350 / 1080×1920) with
 * inline styles for pixel-exact html-to-image PNG export. Text is
 * pre-localized by the caller; small UI labels come from `social.post.*`.
 */

import type { ReactNode } from 'react';
import {
  AlarmClock, BarChart3, CalendarDays, CheckCircle2, GraduationCap,
  Lightbulb, Newspaper, Quote as QuoteGlyph, Sparkles,
} from 'lucide-react';
import { translate } from '@/lib/i18n';
import { formatDateLong, toEasternDigits } from '@/lib/date-format';
import { BRAND, headlineSize, splitAccent, type PostTemplate } from '@/lib/social/brand';
import {
  CANVAS_SIZES, resolveLayout, resolveTheme,
  type StudioLayout, type StudioTheme,
} from '@/lib/social/themes';
import type { Lang } from '@/lib/lang-route';

export type PosterSize = 'square' | 'portrait' | 'story';

const W = 1080;
const H: Record<PosterSize, number> = {
  square: CANVAS_SIZES.square.h,
  portrait: CANVAS_SIZES.portrait.h,
  story: CANVAS_SIZES.story.h,
};

export interface SocialCanvasProps {
  template: PostTemplate;
  lang: Lang;
  size: PosterSize;
  /** Studio theme id — resolved to a palette (midnight default). */
  themeId?: string;
  /** Layout variant id — classic | minimal | bold. */
  layout?: string;
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

function Ambience({ portrait, theme, layout }: { portrait: boolean; theme: StudioTheme; layout: StudioLayout }) {
  const minimal = layout === 'minimal';
  return (
    <>
      {!minimal && (
        <>
          <div
            style={{
              position: 'absolute', top: -200, insetInlineEnd: -170, width: 560, height: 560,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.glowA} 0%, rgba(0,0,0,0) 68%)`,
            }}
          />
          <div
            style={{
              position: 'absolute', bottom: -240, insetInlineStart: -190, width: 660, height: 660,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.glowB} 0%, rgba(0,0,0,0) 70%)`,
            }}
          />
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `radial-gradient(${theme.dots} 1.4px, transparent 1.4px)`,
              backgroundSize: '36px 36px', opacity: 0.3,
            }}
          />
        </>
      )}
      <img
        src="/images/logo-mark.png" alt="" aria-hidden="true"
        style={{
          position: 'absolute', bottom: portrait ? -150 : -130, insetInlineEnd: -140,
          width: 640, height: 640, opacity: minimal ? 0.035 : 0.06, pointerEvents: 'none',
        }}
      />
    </>
  );
}

/** Headline with the ONE-accent-word brand signature. */
function AccentHeadline({
  text, max, theme, layout, baseSize,
}: { text: string; max: number; theme: StudioTheme; layout: StudioLayout; baseSize?: number }) {
  const parts = splitAccent(text, 'x');
  const minimal = layout === 'minimal';
  const bold = layout === 'bold';
  const size = baseSize ?? headlineSize(text);
  return (
    <div
      style={{
        fontSize: bold ? Math.round(size * 1.18) : size,
        fontWeight: bold ? 900 : 800,
        lineHeight: minimal ? 1.22 : 1.26, letterSpacing: -0.5,
        display: '-webkit-box', WebkitLineClamp: max, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textShadow: layout === 'minimal' ? 'none' : '0 6px 30px rgba(0,0,0,0.4)',
      }}
    >
      {parts.before}
      <span style={{ color: theme.accent }}>{parts.accent}</span>
      {parts.after}
    </div>
  );
}

function KickerChip({ icon, label, theme, layout }: { icon: ReactNode; label: string; theme: StudioTheme; layout: StudioLayout }) {
  if (layout === 'minimal') {
    return (
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          fontSize: 24, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase',
          color: theme.accent,
          borderBottom: `2px solid ${theme.accentLine}`, paddingBottom: 8,
        }}
      >
        {icon}
        {label}
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        fontSize: 25, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
        padding: '12px 28px', borderRadius: 999,
        background: theme.accentFaint, border: `1.5px solid ${theme.accentLine}`, color: theme.accent,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

/** Shared brand shell: canvas + ambience + header lockup + footer CTA band. */
export function BrandShell({
  lang, size, kicker, kickerIcon, ctaLabel, qrDataUrl, theme, layout, children,
}: {
  lang: Lang;
  size: PosterSize;
  kicker: ReactNode;
  kickerIcon?: ReactNode;
  ctaLabel?: string;
  qrDataUrl?: string | null;
  theme: StudioTheme;
  layout: StudioLayout;
  children: ReactNode;
}) {
  const t = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
  const rtl = lang !== 'en';
  const h = H[size];
  const portrait = size === 'portrait';
  const story = size === 'story';
  const minimal = layout === 'minimal';
  const pad = story ? 96 : portrait ? 84 : 72;

  return (
    <div
      data-studio-canvas="1"
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        width: W, height: h, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(168deg, ${theme.bgTop} 0%, ${theme.bgMid} 46%, ${theme.bgBottom} 100%)`,
        fontFamily: 'var(--font-vazirmatn), sans-serif',
        color: theme.text, display: 'flex', flexDirection: 'column',
        flexShrink: 0, flexGrow: 0,
      }}
    >
      <Ambience portrait={portrait} theme={theme} layout={layout} />

      {/* top accent hairline */}
      <div
        style={{
          position: 'absolute', top: 0, insetInlineStart: 0, width: '100%', height: minimal ? 6 : 10,
          background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accent} 34%, ${theme.accentSoft} 70%, ${theme.accentFaint} 100%)`,
        }}
      />

      {/* header lockup — identical on every template */}
      <div
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 24,
          padding: `${story ? 92 : portrait ? 74 : 62}px ${pad}px 0`,
        }}
      >
        <div
          style={{
            width: 88, height: 88, borderRadius: 24, overflow: 'hidden', flexShrink: 0,
            background: theme.logoBg,
            boxShadow: theme.dark ? '0 14px 36px rgba(0,0,0,0.42)' : '0 10px 28px rgba(0,0,0,0.18)',
            outline: `2px solid ${theme.accentLine}`, outlineOffset: -2,
          }}
        >
          <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 3, lineHeight: 1, direction: 'ltr', textAlign: rtl ? 'right' : 'left', color: theme.text }}>
            ARIA HUB
          </div>
          <div style={{ fontSize: 21, color: theme.textDim, fontWeight: 500 }}>{t('poster.tagline')}</div>
        </div>
      </div>

      {/* kicker */}
      <div style={{ position: 'relative', padding: `0 ${pad}px`, marginTop: story ? 64 : portrait ? 50 : 38 }}>
        <KickerChip icon={kickerIcon} label={String(kicker)} theme={theme} layout={layout} />
      </div>

      {/* content zone */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* footer CTA band — the brand signature; minimal gets an editorial strip */}
      {minimal ? (
        <div
          style={{
            position: 'relative', margin: `0 ${pad}px ${story ? 84 : portrait ? 66 : 54}px`,
            borderTop: `2px solid ${theme.accentLine}`, paddingTop: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 30, fontWeight: 800, direction: 'ltr', textAlign: rtl ? 'right' : 'left', letterSpacing: 0.5, color: theme.text }}>
              {BRAND.site}
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: theme.textDim }}>
              {ctaLabel ?? t('poster.cta')}
            </span>
          </div>
          {qrDataUrl ? (
            <div style={{ background: theme.qrLight, borderRadius: 14, padding: 7, flexShrink: 0 }}>
              <img src={qrDataUrl} alt="QR" style={{ width: 78, height: 78, display: 'block' }} />
            </div>
          ) : (
            <div
              style={{
                width: 60, height: 60, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: theme.logoBg,
              }}
            >
              <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            position: 'relative', margin: `0 ${pad}px ${story ? 84 : portrait ? 66 : 54}px`,
            background: `linear-gradient(135deg, ${theme.ctaFrom} 0%, ${theme.ctaTo} 100%)`,
            color: theme.ctaText, borderRadius: 24, padding: '22px 30px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
            boxShadow: theme.dark ? '0 20px 50px rgba(0,0,0,0.4)' : '0 16px 40px rgba(0,0,0,0.16)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 32, fontWeight: 800, direction: 'ltr', textAlign: rtl ? 'right' : 'left', letterSpacing: 0.5, color: theme.ctaText }}>
              {BRAND.site}
            </span>
            <span style={{ fontSize: 21, fontWeight: 700, color: theme.ctaText, opacity: 0.78 }}>
              {ctaLabel ?? t('poster.cta')}
            </span>
          </div>
          {qrDataUrl ? (
            <div
              style={{
                background: theme.qrLight, borderRadius: 16, padding: 8, flexShrink: 0,
                boxShadow: `inset 0 0 0 1.5px ${theme.surfaceBorder}`,
              }}
            >
              <img src={qrDataUrl} alt="QR" style={{ width: 84, height: 84, display: 'block' }} />
            </div>
          ) : (
            <div
              style={{
                width: 66, height: 66, borderRadius: 18, overflow: 'hidden', flexShrink: 0, background: theme.logoBg,
                outline: `2px solid ${theme.surfaceBorder}`, outlineOffset: -2,
              }}
            >
              <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
        </div>
      )}

      {/* bottom accent strip */}
      {!minimal && (
        <div
          style={{
            position: 'absolute', bottom: 0, insetInlineStart: 0, width: '100%', height: 12,
            background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accent} 55%, ${theme.accentSoft} 100%)`,
          }}
        />
      )}
    </div>
  );
}

// ─── per-template content zones ──────────────────────────────────────────────

function ContentFrame({
  size, layout, align = 'center', children,
}: { size: PosterSize; layout: StudioLayout; align?: 'center' | 'start'; children: ReactNode }) {
  const pad = size === 'story' ? 96 : size === 'portrait' ? 84 : 72;
  const minimal = layout === 'minimal';
  return (
    <div
      style={{
        padding: `${size === 'story' ? 56 : 34}px ${pad}px ${size === 'story' ? 56 : 34}px`,
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: align === 'start' ? 'flex-start' : 'center',
        alignItems: minimal ? 'flex-start' : 'stretch',
        gap: minimal ? 24 : 26,
      }}
    >
      {children}
    </div>
  );
}

function GoldRule({ theme, layout }: { theme: StudioTheme; layout: StudioLayout }) {
  if (layout === 'minimal') {
    return <div style={{ width: 64, height: 4, borderRadius: 999, background: theme.accent }} />;
  }
  return (
    <div
      style={{
        width: 64, height: 7, borderRadius: 999,
        background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentSoft})`,
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

function NoteLine({ text, theme, clamp }: { text: string; theme: StudioTheme; clamp: number }) {
  return (
    <div
      style={{
        fontSize: 27, color: theme.textDim, fontWeight: 500,
        display: '-webkit-box', WebkitLineClamp: clamp, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}
    >
      {text}
    </div>
  );
}

// ─── main dispatcher ─────────────────────────────────────────────────────────

export function SocialCanvas(props: SocialCanvasProps) {
  const { template, lang, size, title, note, seriesNo, qrDataUrl } = props;
  const t = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
  const portrait = size === 'portrait';
  const story = size === 'story';
  const theme = resolveTheme(props.themeId);
  const layout = resolveLayout(props.layout);

  // Spotlight delegates to the proven opportunity poster (QR + deadline card).
  // if (template === 'spotlight') — handled by the caller (needs PosterData).
  const kickerKey = `social.post.kicker.${template}`;

  if (template === 'deadline') {
    const dl = props.deadlineDate ? new Date(props.deadlineDate) : null;
    const { label, days, expired } = daysLabelOf(lang, dl);
    const urgent = !expired && days !== null && days <= 7;
    const numColor = expired ? '#f87171' : theme.accent;
    const bold = layout === 'bold';
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout}
        kicker={t('social.post.kicker.deadline')}
        kickerIcon={<AlarmClock style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout}>
          <GoldRule theme={theme} layout={layout} />
          {/* typographic countdown card — Vazirmatn's lone Eastern digits read
              ambiguously at giant sizes, so the label IS the hero text */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
              background: layout === 'minimal'
                ? 'transparent'
                : expired
                  ? 'rgba(248,113,113,0.10)'
                  : layout === 'bold'
                    ? theme.accentSoft
                    : 'rgba(255,255,255,0.07)',
              border: layout === 'minimal'
                ? 'none'
                : `2px solid ${expired ? 'rgba(248,113,113,0.45)' : urgent ? 'rgba(251,191,36,0.5)' : theme.accentLine}`,
              borderRadius: 28, padding: layout === 'minimal' ? '0' : '26px 34px',
              borderTop: layout === 'minimal' ? `2px solid ${theme.accentLine}` : undefined,
              borderBottom: layout === 'minimal' ? `2px solid ${theme.accentLine}` : undefined,
            }}
          >
            <AlarmClock style={{ width: bold ? 64 : 52, height: bold ? 64 : 52, color: numColor, flexShrink: 0 }} />
            <span style={{ fontSize: bold ? 78 : 60, fontWeight: 900, lineHeight: 1.1, color: numColor, textShadow: layout === 'minimal' ? 'none' : '0 6px 30px rgba(0,0,0,0.4)' }}>
              {label}
            </span>
            {dl ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 26, color: theme.textDim, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <CalendarDays style={{ width: 28, height: 28, color: theme.accent }} />
                {formatDateLong(dl, lang)}
              </span>
            ) : null}
          </div>
          <AccentHeadline text={title} max={story ? 4 : portrait ? 3 : 2} theme={theme} layout={layout} />
          {note ? <NoteLine text={note} theme={theme} clamp={2} /> : null}
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'tip') {
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout}
        kicker={t('social.post.tipLabel', { n: toEasternDigits(String(seriesNo ?? 1), lang) })}
        kickerIcon={<Lightbulb style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout} align={layout === 'minimal' ? 'start' : 'center'}>
          {layout !== 'minimal' && (
            <div
              style={{
                width: 116, height: 116, borderRadius: '50%', flexShrink: 0,
                background: theme.accentFaint, border: `2px solid ${theme.accentLine}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Lightbulb style={{ width: 56, height: 56, color: theme.accent }} />
            </div>
          )}
          <GoldRule theme={theme} layout={layout} />
          <AccentHeadline text={title} max={story ? 5 : portrait ? 4 : 3} theme={theme} layout={layout} />
          {note ? <NoteLine text={note} theme={theme} clamp={2} /> : null}
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'quote') {
    const glyphSize = layout === 'bold' ? 220 : 170;
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout}
        kicker={t('social.post.kicker.quote')}
        kickerIcon={<QuoteGlyph style={{ width: 26, height: 26 }} />}
        ctaLabel={t('social.post.quoteCta')}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout}>
          <div
            style={{
              fontSize: glyphSize, lineHeight: 0.6, color: theme.accent, fontWeight: 900,
              direction: 'ltr', textAlign: lang === 'en' ? 'left' : 'right',
            }}
          >
            &ldquo;
          </div>
          <div
            style={{
              fontSize: headlineSize(title, layout === 'bold' ? 92 : 76),
              fontWeight: layout === 'bold' ? 900 : 800, lineHeight: 1.32,
              color: layout === 'minimal' ? theme.text : undefined,
              display: '-webkit-box', WebkitLineClamp: story ? 6 : portrait ? 5 : 4,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 56, height: 4, borderRadius: 999, background: theme.accentLine }} />
            <div style={{ fontSize: 26, fontWeight: 700, color: theme.accent, direction: 'ltr' }}>
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
        lang={lang} size={size} theme={theme} layout={layout}
        kicker={t('social.post.kicker.promo')}
        kickerIcon={<Sparkles style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout} align={layout === 'minimal' ? 'start' : 'center'}>
          <GoldRule theme={theme} layout={layout} />
          <AccentHeadline text={title} max={story ? 5 : portrait ? 4 : 3} theme={theme} layout={layout} />
          {note ? <NoteLine text={note} theme={theme} clamp={2} /> : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 6 }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <CheckCircle2 style={{ width: 34, height: 34, color: theme.accent, flexShrink: 0 }} />
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
        lang={lang} size={size} theme={theme} layout={layout}
        kicker={t('social.post.kicker.news')}
        kickerIcon={<Newspaper style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout} align={layout === 'minimal' ? 'start' : 'center'}>
          <GoldRule theme={theme} layout={layout} />
          <AccentHeadline text={title} max={story ? 5 : portrait ? 4 : 3} theme={theme} layout={layout} />
          {note ? (
            <div
              style={{
                fontSize: 28, color: theme.textDim, fontWeight: 500, lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: story ? 4 : portrait ? 3 : 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}
            >
              {note}
            </div>
          ) : null}
          {nd ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 24, color: theme.accent, fontWeight: 600 }}>
              <CalendarDays style={{ width: 26, height: 26, color: theme.accent }} />
              {formatDateLong(nd, lang)}
            </div>
          ) : null}
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'stat') {
    const stat = props.stat ?? { value: '', label: '', sub: undefined };
    const bold = layout === 'bold';
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout}
        kicker={t('social.post.kicker.stat')}
        kickerIcon={<BarChart3 style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout} align={layout === 'minimal' ? 'start' : 'center'}>
          <GoldRule theme={theme} layout={layout} />
          <div
            style={{
              fontSize: bold ? 190 : story ? 170 : portrait ? 140 : 124,
              fontWeight: 900, lineHeight: 1.05,
              color: theme.accent, direction: 'ltr',
              textAlign: lang === 'en' ? 'left' : 'right',
              textShadow: layout === 'minimal' ? 'none' : '0 10px 44px rgba(0,0,0,0.45)',
            }}
          >
            {stat.value}
          </div>
          <div style={{ fontSize: 42, fontWeight: 800 }}>{stat.label}</div>
          {stat.sub ? (
            <div style={{ fontSize: 27, color: theme.textDim, fontWeight: 500 }}>{stat.sub}</div>
          ) : null}
        </ContentFrame>
      </BrandShell>
    );
  }

  // story
  const person = props.person;
  return (
    <BrandShell
      lang={lang} size={size} theme={theme} layout={layout}
      kicker={t('social.post.kicker.story')}
      kickerIcon={<GraduationCap style={{ width: 26, height: 26 }} />}
      qrDataUrl={qrDataUrl}
    >
      <ContentFrame size={size} layout={layout} align={layout === 'minimal' ? 'start' : 'center'}>
        <div
          style={{
            fontSize: 130, lineHeight: 0.55, color: theme.accent, fontWeight: 900,
            direction: 'ltr', textAlign: lang === 'en' ? 'left' : 'right',
          }}
        >
          &ldquo;
        </div>
        <div
          style={{
            fontSize: headlineSize(title, 66), fontWeight: 700, lineHeight: 1.4,
            color: theme.dark ? 'rgba(255,255,255,0.95)' : theme.text,
            display: '-webkit-box', WebkitLineClamp: story ? 6 : portrait ? 5 : 4,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {title}
        </div>
        {person ? (
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 16, alignSelf: layout === 'minimal' ? 'flex-start' : 'center',
              background: theme.surface, border: `1.5px solid ${theme.accentLine}`,
              borderRadius: 18, padding: '14px 24px',
            }}
          >
            <GraduationCap style={{ width: 32, height: 32, color: theme.accent }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 26, fontWeight: 800 }}>{person.name}</span>
              <span style={{ fontSize: 21, color: theme.textDim, fontWeight: 600 }}>{person.meta}</span>
            </div>
          </div>
        ) : null}
      </ContentFrame>
    </BrandShell>
  );
}
