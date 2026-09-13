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

import { cloneElement, isValidElement } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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

// ─── distinct composition shells ─────────────────────────────────────────────
// Each shell is a genuinely different poster composition (side panel, frame,
// big-type stack, glass card, top banner, perforated ticket). They share the
// brand chrome — logo lockup, kicker, ONE accent word, QR/CTA — but place it
// differently. All colors come from StudioTheme tokens so every palette works.

interface ShellProps {
  lang: Lang;
  size: PosterSize;
  theme: StudioTheme;
  layout: StudioLayout;
  kicker: string;
  kickerIcon?: ReactNode;
  cta: string;
  tagline: string;
  qrDataUrl?: string | null;
  children: ReactNode;
}

const SHELL_LAYOUTS = new Set<StudioLayout>(['split', 'frame', 'stack', 'glass', 'banner', 'ticket']);

function ShellRoot({ lang, size, theme, style, children }: {
  lang: Lang; size: PosterSize; theme: StudioTheme; style?: CSSProperties; children: ReactNode;
}) {
  const rtl = lang !== 'en';
  return (
    <div
      data-studio-canvas="1"
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        width: W, height: H[size], position: 'relative', overflow: 'hidden',
        background: `linear-gradient(168deg, ${theme.bgTop} 0%, ${theme.bgMid} 46%, ${theme.bgBottom} 100%)`,
        fontFamily: 'var(--font-vazirmatn), sans-serif',
        color: theme.text, flexShrink: 0, flexGrow: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Dots({ theme, opacity = 0.28 }: { theme: StudioTheme; opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(${theme.dots} 1.4px, transparent 1.4px)`,
        backgroundSize: '36px 36px', opacity, pointerEvents: 'none',
      }}
    />
  );
}

function Watermark({ portrait, theme }: { portrait: boolean; theme: StudioTheme }) {
  return (
    <img
      src="/images/logo-mark.png" alt="" aria-hidden="true"
      style={{
        position: 'absolute', bottom: portrait ? -150 : -130, insetInlineEnd: -140,
        width: 640, height: 640, opacity: 0.05, pointerEvents: 'none',
      }}
    />
  );
}

function QrChip({ qrDataUrl, theme, size = 84, radius = 16 }: {
  qrDataUrl?: string | null; theme: StudioTheme; size?: number; radius?: number;
}) {
  if (qrDataUrl) {
    return (
      <div style={{ background: theme.qrLight, borderRadius: radius, padding: 8, flexShrink: 0, boxShadow: `inset 0 0 0 1.5px ${theme.surfaceBorder}` }}>
        <img src={qrDataUrl} alt="QR" style={{ width: size, height: size, display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius - 2, overflow: 'hidden', flexShrink: 0, background: theme.logoBg, outline: `2px solid ${theme.surfaceBorder}`, outlineOffset: -2 }}>
      <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
}

function Lockup({ theme, rtl, tagline, logoSize = 76, nameSize = 38, taglineSize = 20, center = false }: {
  theme: StudioTheme; rtl: boolean; tagline: string;
  logoSize?: number; nameSize?: number; taglineSize?: number; center?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(logoSize * 0.26), justifyContent: center ? 'center' : 'flex-start' }}>
      <div
        style={{
          width: logoSize, height: logoSize, borderRadius: Math.round(logoSize * 0.28), overflow: 'hidden', flexShrink: 0,
          background: theme.logoBg,
          boxShadow: theme.dark ? '0 12px 30px rgba(0,0,0,0.4)' : '0 10px 26px rgba(0,0,0,0.16)',
          outline: `2px solid ${theme.accentLine}`, outlineOffset: -2,
        }}
      >
        <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, alignItems: center ? 'center' : 'flex-start' }}>
        <div style={{ fontSize: nameSize, fontWeight: 800, letterSpacing: 3, lineHeight: 1, direction: 'ltr', textAlign: rtl ? 'right' : 'left', color: theme.text }}>
          ARIA HUB
        </div>
        <div style={{ fontSize: taglineSize, color: theme.textDim, fontWeight: 500 }}>{tagline}</div>
      </div>
    </div>
  );
}

/** Content flow inside a shell (ContentFrame steps aside for shell layouts). */
function ShellFlow({ children, justify = 'center', align = 'stretch', pad = '0', gap = 26 }: {
  children: ReactNode;
  justify?: 'center' | 'start';
  align?: 'stretch' | 'start' | 'center';
  pad?: string;
  gap?: number;
}) {
  return (
    <div
      style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        justifyContent: justify === 'start' ? 'flex-start' : 'center',
        alignItems: align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'stretch',
        gap, padding: pad,
      }}
    >
      {children}
    </div>
  );
}

function bigGlyph(icon: ReactNode, px: number, color: string, opacity = 1): ReactNode {
  if (!isValidElement(icon)) return null;
  return (
    <span style={{ lineHeight: 1, opacity, color, pointerEvents: 'none' }}>
      {cloneElement(icon as React.ReactElement<{ width?: number | string; height?: number | string; strokeWidth?: number }>, {
        width: px, height: px, strokeWidth: 1,
      })}
    </span>
  );
}

// ── Split panel: solid accent side column + content column ──────────────────

function SplitShell({ lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const portrait = size === 'portrait';
  const panelW = story ? 316 : 282;
  const pad = story ? 84 : portrait ? 70 : 58;
  return (
    <ShellRoot lang={lang} size={size} theme={theme} style={{ display: 'flex', flexDirection: 'row' }}>
      {/* accent side panel — flips sides automatically under dir=rtl */}
      <div
        style={{
          width: panelW, flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(180deg, ${theme.ctaFrom} 0%, ${theme.ctaTo} 100%)`,
          color: theme.ctaText,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
          padding: `${story ? 72 : 54}px 34px`,
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(${theme.dark ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.28)'} 1.6px, transparent 1.6px)`,
            backgroundSize: '30px 30px',
          }}
        />
        <div style={{ position: 'relative', width: 96, height: 96, borderRadius: 26, overflow: 'hidden', background: theme.deep, flexShrink: 0, boxShadow: '0 16px 38px rgba(0,0,0,0.35)' }}>
          <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ writingMode: 'vertical-rl', fontSize: 52, fontWeight: 900, letterSpacing: 12, direction: 'ltr', lineHeight: 1 }}>
            ARIA HUB
          </div>
          <div style={{ width: 56, height: 5, borderRadius: 999, background: theme.ctaText, opacity: 0.75 }} />
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 700, opacity: 0.85 }}>{tagline}</div>
          <div style={{ fontSize: 18, fontWeight: 800, direction: 'ltr', letterSpacing: 1 }}>{BRAND.site}</div>
        </div>
      </div>

      {/* content column */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <Watermark portrait={portrait} theme={theme} />
        <Dots theme={theme} opacity={0.2} />
        <div style={{ position: 'relative', padding: `${story ? 72 : 56}px ${pad}px 0` }}>
          <KickerChip icon={kickerIcon} label={kicker} theme={theme} layout="classic" />
        </div>
        <ShellFlow pad={`${26}px ${pad}px 0`}>{children}</ShellFlow>
        <div
          style={{
            position: 'relative', margin: `0 ${pad}px ${story ? 78 : 60}px`,
            background: theme.deep, border: `1.5px solid ${theme.accentLine}`, borderRadius: 22,
            padding: '20px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 30, fontWeight: 800, direction: 'ltr', textAlign: rtl ? 'right' : 'left', letterSpacing: 0.5, color: theme.accent }}>{BRAND.site}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: theme.textDim }}>{cta}</span>
          </div>
          <QrChip qrDataUrl={qrDataUrl} theme={theme} size={78} />
        </div>
      </div>
    </ShellRoot>
  );
}

// ── Framed: double-line frame, corner ticks, centered composition ───────────

function FrameShell({ lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const margin = story ? 84 : size === 'portrait' ? 72 : 62;
  const corner = 46;
  const tick = (pos: 'ts' | 'te' | 'bs' | 'be') => {
    const base: CSSProperties = { position: 'absolute', width: corner, height: corner };
    if (pos[0] === 't') { base.top = margin - 13; base.borderTop = `6px solid ${theme.accent}`; }
    else { base.bottom = margin - 13; base.borderBottom = `6px solid ${theme.accent}`; }
    if (pos[1] === 's') { base.insetInlineStart = margin - 13; base.borderInlineStart = `6px solid ${theme.accent}`; }
    else { base.insetInlineEnd = margin - 13; base.borderInlineEnd = `6px solid ${theme.accent}`; }
    return <div key={pos} style={base} />;
  };
  return (
    <ShellRoot lang={lang} size={size} theme={theme}>
      <Dots theme={theme} opacity={0.15} />
      <div style={{ position: 'absolute', inset: margin, border: `2.5px solid ${theme.accentLine}`, borderRadius: 8, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: margin + 14, border: `1px solid ${theme.accentFaint}`, borderRadius: 3, pointerEvents: 'none' }} />
      {tick('ts')}{tick('te')}{tick('bs')}{tick('be')}
      <div style={{ position: 'absolute', inset: margin, display: 'flex', flexDirection: 'column', padding: `${story ? 56 : 42}px ${story ? 62 : 52}px` }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Lockup theme={theme} rtl={rtl} tagline={tagline} center logoSize={70} nameSize={34} taglineSize={18} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: story ? 46 : 32 }}>
          <KickerChip icon={kickerIcon} label={kicker} theme={theme} layout="classic" />
        </div>
        <ShellFlow pad="18px 6px 0">{children}</ShellFlow>
        <div
          style={{
            alignSelf: 'center', width: '84%',
            background: `linear-gradient(135deg, ${theme.ctaFrom} 0%, ${theme.ctaTo} 100%)`, color: theme.ctaText,
            borderRadius: 18, padding: '17px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 28, fontWeight: 800, direction: 'ltr', textAlign: rtl ? 'right' : 'left', letterSpacing: 0.5, color: theme.ctaText }}>{BRAND.site}</span>
            <span style={{ fontSize: 19, fontWeight: 700, color: theme.ctaText, opacity: 0.78 }}>{cta}</span>
          </div>
          <QrChip qrDataUrl={qrDataUrl} theme={theme} size={70} radius={14} />
        </div>
      </div>
    </ShellRoot>
  );
}

// ── Big-type stack: Swiss poster, oversized glyph, rule lines ────────────────

function StackShell({ lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const portrait = size === 'portrait';
  const pad = story ? 96 : portrait ? 84 : 72;
  return (
    <ShellRoot lang={lang} size={size} theme={theme}>
      <div style={{ position: 'absolute', top: -190, insetInlineEnd: -260, width: 560, height: 330, background: theme.accentFaint, transform: 'rotate(-18deg)', borderRadius: 44 }} />
      <div style={{ position: 'absolute', top: -110, insetInlineEnd: -310, width: 560, height: 54, background: theme.accentSoft, transform: 'rotate(-18deg)', borderRadius: 999 }} />
      <div style={{ position: 'absolute', bottom: story ? 320 : 160, insetInlineEnd: -70, opacity: 0.55, pointerEvents: 'none' }}>
        {bigGlyph(kickerIcon, 320, theme.accentSoft)}
      </div>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: `${story ? 88 : 64}px ${pad}px ${story ? 82 : 58}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, overflow: 'hidden', flexShrink: 0, background: theme.logoBg, outline: `2px solid ${theme.accentLine}`, outlineOffset: -2 }}>
            <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 3, direction: 'ltr', textAlign: rtl ? 'right' : 'left' }}>ARIA HUB</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 18, color: theme.textDim, fontWeight: 600 }}>{tagline}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: story ? 62 : 44 }}>
          <span style={{ fontSize: 25, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: theme.accent, whiteSpace: 'nowrap' }}>{kicker}</span>
          <div style={{ flex: 1, height: 2, background: theme.accentLine }} />
        </div>

        <ShellFlow justify="center" align="stretch" pad="26px 0 0" gap={24}>{children}</ShellFlow>

        <div style={{ borderTop: `2px solid ${theme.accentLine}`, paddingTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 38, fontWeight: 900, direction: 'ltr', textAlign: rtl ? 'right' : 'left', letterSpacing: 0.5, color: theme.text }}>{BRAND.site}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: theme.textDim }}>{cta}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <QrChip qrDataUrl={qrDataUrl} theme={theme} size={76} />
            <div style={{ width: 62, height: 62, borderRadius: 18, background: theme.accent, color: theme.onAccent, display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 900 }}>
              {rtl ? '←' : '→'}
            </div>
          </div>
        </div>
      </div>
    </ShellRoot>
  );
}

// ── Glass card: floating panel with overlapping badge ────────────────────────

function GlassShell({ lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const portrait = size === 'portrait';
  const pad = story ? 88 : portrait ? 76 : 64;
  return (
    <ShellRoot lang={lang} size={size} theme={theme}>
      <div style={{ position: 'absolute', top: -200, insetInlineEnd: -170, width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle, ${theme.glowA} 0%, rgba(0,0,0,0) 68%)` }} />
      <div style={{ position: 'absolute', bottom: -240, insetInlineStart: -190, width: 660, height: 660, borderRadius: '50%', background: `radial-gradient(circle, ${theme.glowB} 0%, rgba(0,0,0,0) 70%)` }} />
      <Dots theme={theme} opacity={0.24} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: `${story ? 82 : 60}px ${pad}px ${story ? 78 : 56}px` }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Lockup theme={theme} rtl={rtl} tagline={tagline} center logoSize={68} nameSize={32} taglineSize={17} />
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: story ? 78 : 58 }}>
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: 44,
              background: theme.dark ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.62)',
              border: `1.5px solid ${theme.surfaceBorder}`,
              boxShadow: theme.dark ? '0 40px 90px rgba(0,0,0,0.45)' : '0 34px 80px rgba(31,27,18,0.14)',
            }}
          />
          <div style={{ position: 'absolute', top: -30, insetInlineStart: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                fontSize: 23, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
                padding: '13px 32px', borderRadius: 999,
                background: theme.accent, color: theme.onAccent,
                boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
              }}
            >
              {kickerIcon}
              {kicker}
            </span>
          </div>
          <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: `${story ? 74 : 54}px ${story ? 60 : 46}px ${story ? 54 : 40}px` }}>
            <ShellFlow>{children}</ShellFlow>
            <div
              style={{
                background: `linear-gradient(135deg, ${theme.ctaFrom} 0%, ${theme.ctaTo} 100%)`,
                color: theme.ctaText, borderRadius: 20, padding: '18px 26px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
                boxShadow: theme.dark ? '0 20px 50px rgba(0,0,0,0.4)' : '0 16px 40px rgba(0,0,0,0.16)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 28, fontWeight: 800, direction: 'ltr', textAlign: rtl ? 'right' : 'left', letterSpacing: 0.5, color: theme.ctaText }}>{BRAND.site}</span>
                <span style={{ fontSize: 19, fontWeight: 700, color: theme.ctaText, opacity: 0.78 }}>{cta}</span>
              </div>
              <QrChip qrDataUrl={qrDataUrl} theme={theme} size={72} />
            </div>
          </div>
        </div>
      </div>
    </ShellRoot>
  );
}

// ── Top banner: solid header band + flush CTA strip ──────────────────────────

function BannerShell({ lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const portrait = size === 'portrait';
  const pad = story ? 96 : portrait ? 84 : 72;
  const band = story ? 470 : portrait ? 384 : 330;
  return (
    <ShellRoot lang={lang} size={size} theme={theme} style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: band, flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.ctaFrom} 0%, ${theme.ctaTo} 100%)`, color: theme.ctaText,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: `${story ? 64 : 46}px ${pad}px`,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(0,0,0,0.10) 1.6px, transparent 1.6px)', backgroundSize: '30px 30px' }} />
        <div style={{ position: 'absolute', insetInlineEnd: -44, bottom: -66, opacity: 0.16, pointerEvents: 'none' }}>
          {bigGlyph(kickerIcon, story ? 300 : 240, theme.ctaText)}
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 58, height: 58, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: theme.deep, boxShadow: '0 12px 30px rgba(0,0,0,0.3)' }}>
            <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 3, direction: 'ltr', textAlign: rtl ? 'right' : 'left', lineHeight: 1 }}>ARIA HUB</div>
            <div style={{ fontSize: 17, fontWeight: 600, opacity: 0.82 }}>{tagline}</div>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ fontSize: story ? 42 : 33, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', lineHeight: 1.15 }}>{kicker}</div>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `${story ? 56 : 40}px ${pad}px 0` }}>
        <ShellFlow>{children}</ShellFlow>
      </div>

      <div
        style={{
          position: 'relative', flexShrink: 0, height: story ? 170 : 138, background: theme.deep,
          borderTop: `5px solid ${theme.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `0 ${pad}px`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 36, fontWeight: 900, direction: 'ltr', textAlign: rtl ? 'right' : 'left', letterSpacing: 0.5, color: theme.accent }}>{BRAND.site}</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: theme.textDim }}>{cta}</span>
        </div>
        <QrChip qrDataUrl={qrDataUrl} theme={theme} size={92} radius={18} />
      </div>
    </ShellRoot>
  );
}

// ── Ticket stub: perforated card with QR stub ────────────────────────────────

function TicketShell({ lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const inset = story ? 76 : 56;
  const pad = story ? 64 : 50;
  const stubW = 196;
  const hole = (top: boolean): ReactNode => (
    <div
      style={{
        position: 'absolute', [top ? 'top' : 'bottom']: -19, insetInlineEnd: stubW - 19,
        width: 38, height: 38, borderRadius: '50%',
        background: top ? theme.bgTop : theme.bgBottom,
        border: `1.5px solid ${theme.surfaceBorder}`,
      }}
    />
  );
  return (
    <ShellRoot lang={lang} size={size} theme={theme}>
      <Dots theme={theme} opacity={0.2} />
      <Watermark portrait={size === 'portrait'} theme={theme} />
      <div
        style={{
          position: 'absolute', top: inset, bottom: inset, insetInlineStart: inset, insetInlineEnd: inset,
          borderRadius: 30, overflow: 'visible',
          background: theme.dark ? theme.deep : 'rgba(255,255,255,0.72)',
          border: `1.5px solid ${theme.surfaceBorder}`,
          boxShadow: theme.dark ? '0 34px 80px rgba(0,0,0,0.45)' : '0 30px 70px rgba(31,27,18,0.12)',
          display: 'flex',
        }}
      >
        {hole(true)}
        {hole(false)}
        {/* main panel */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: `${story ? 60 : 44}px ${pad}px` }}>
          <Lockup theme={theme} rtl={rtl} tagline={tagline} logoSize={62} nameSize={31} taglineSize={17} />
          <div style={{ marginTop: story ? 44 : 30 }}>
            <KickerChip icon={kickerIcon} label={kicker} theme={theme} layout="classic" />
          </div>
          <ShellFlow pad="16px 0 0">{children}</ShellFlow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 16, borderTop: `1px solid ${theme.accentFaint}` }}>
            <span style={{ fontSize: 26, fontWeight: 800, direction: 'ltr', color: theme.accent, letterSpacing: 0.5 }}>{BRAND.site}</span>
            <span style={{ fontSize: 19, fontWeight: 700, color: theme.textDim }}>{cta}</span>
          </div>
        </div>
        {/* stub */}
        <div
          style={{
            width: stubW, flexShrink: 0, borderInlineStart: `3px dashed ${theme.accentLine}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
            padding: `${story ? 54 : 40}px 22px`, textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: 2, direction: 'ltr', color: theme.accent }}>ARIA HUB</div>
          <QrChip qrDataUrl={qrDataUrl} theme={theme} size={124} radius={20} />
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.textDim, lineHeight: 1.35 }}>{tagline}</div>
        </div>
      </div>
    </ShellRoot>
  );
}

function StudioShell(props: ShellProps) {
  switch (props.layout) {
    case 'split': return <SplitShell {...props} />;
    case 'frame': return <FrameShell {...props} />;
    case 'stack': return <StackShell {...props} />;
    case 'glass': return <GlassShell {...props} />;
    case 'banner': return <BannerShell {...props} />;
    case 'ticket': return <TicketShell {...props} />;
    default: return null;
  }
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
  // Distinct composition families — each is its own shell, not a reskin.
  if (layout === 'split' || layout === 'frame' || layout === 'stack'
    || layout === 'glass' || layout === 'banner' || layout === 'ticket') {
    return (
      <StudioShell
        lang={lang} size={size} theme={theme} layout={layout}
        kicker={String(kicker)} kickerIcon={kickerIcon}
        cta={ctaLabel ?? translate(lang, 'poster.cta')}
        tagline={translate(lang, 'poster.tagline')}
        qrDataUrl={qrDataUrl}
      >
        {children}
      </StudioShell>
    );
  }

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
  if (SHELL_LAYOUTS.has(layout)) {
    // Shell layouts own the content container geometry — step aside entirely.
    return <div style={{ display: 'contents' }}>{children}</div>;
  }
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
