'use client';
import { AriPosterFrame } from '@/lib/social/ari-poster-frame';
import type { AriPosterConfig } from '@/lib/social/ari-poster';

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
  AlarmClock, BarChart3, Briefcase, CalendarDays, CheckCircle2, Facebook,
  GraduationCap, Heart, Instagram, Lightbulb, Megaphone, Moon,
  MousePointerClick, Newspaper, Package, Quote as QuoteGlyph, Send, Sparkles,
  Telescope, UserPlus,
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
  ari?: AriPosterConfig;
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
  /** Packages template: 1–2 offer cards (value is the hero glyph/number). */
  packages?: { value: string; label: string; sub?: string }[];
  /** Day template: date badge above the headline (e.g. "۱۴ ژوئن" / "14 June"). */
  dateBadge?: { big: string; small?: string };
  /** Studio visual (statue/scientist/flag…) layered behind the poster. */
  visualUrl?: string | null;
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
  visualUrl?: string | null;
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

const SHELL_LAYOUTS = new Set<StudioLayout>(['split', 'frame', 'stack', 'glass', 'banner', 'ticket', 'cinema']);

function ShellRoot({ lang, size, theme, style, visualUrl, children }: {
  lang: Lang; size: PosterSize; theme: StudioTheme; style?: CSSProperties; visualUrl?: string | null; children: ReactNode;
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
      {visualUrl ? (
        <>
          <img src={visualUrl} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.38 }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${theme.bgTop}66 0%, ${theme.bgMid}AA 55%, ${theme.bgBottom}F2 100%)` }} />
        </>
      ) : null}
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

function SplitShell({ visualUrl, lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const portrait = size === 'portrait';
  const panelW = story ? 316 : 282;
  const pad = story ? 84 : portrait ? 70 : 58;
  return (
    <ShellRoot visualUrl={visualUrl} lang={lang} size={size} theme={theme} style={{ display: 'flex', flexDirection: 'row' }}>
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

function FrameShell({ visualUrl, lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
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
    <ShellRoot visualUrl={visualUrl} lang={lang} size={size} theme={theme}>
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

function StackShell({ visualUrl, lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const portrait = size === 'portrait';
  const pad = story ? 96 : portrait ? 84 : 72;
  return (
    <ShellRoot visualUrl={visualUrl} lang={lang} size={size} theme={theme}>
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

function GlassShell({ visualUrl, lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const portrait = size === 'portrait';
  const pad = story ? 88 : portrait ? 76 : 64;
  return (
    <ShellRoot visualUrl={visualUrl} lang={lang} size={size} theme={theme}>
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

function BannerShell({ visualUrl, lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const portrait = size === 'portrait';
  const pad = story ? 96 : portrait ? 84 : 72;
  const band = story ? 470 : portrait ? 384 : 330;
  return (
    <ShellRoot visualUrl={visualUrl} lang={lang} size={size} theme={theme} style={{ display: 'flex', flexDirection: 'column' }}>
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

function TicketShell({ visualUrl, lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
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
    <ShellRoot visualUrl={visualUrl} lang={lang} size={size} theme={theme}>
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

// ── Cinema: spotlight vignette, glossy floating props, white contact bar ────
// Modelled on the showcase-poster school (deep radial spotlight, floating 3D
// spheres, double-chevron brand mark, white footer strip). Colors stay on the
// StudioTheme tokens — pair with the `crimson` theme for the classic look.

function CinemaShell({ visualUrl, lang, size, theme, kicker, kickerIcon, cta, tagline, qrDataUrl, children }: ShellProps) {
  const rtl = lang !== 'en';
  const story = size === 'story';
  const portrait = size === 'portrait';
  const pad = story ? 88 : portrait ? 76 : 64;
  const barBg = theme.dark ? '#FFFFFF' : theme.deep;
  const barFg = theme.dark ? '#1C040A' : '#FFFFFF';
  const orb = (px: number): CSSProperties => ({
    width: px, height: px, borderRadius: '50%',
    background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, ${theme.accentSoft} 34%, ${theme.ctaFrom} 62%, ${theme.bgTop} 100%)`,
    boxShadow: '0 26px 60px rgba(0,0,0,0.45), inset -14px -18px 44px rgba(0,0,0,0.35)',
    opacity: 0.9,
  });
  const chev = (opacity: number, key: string): ReactNode => (
    <div
      key={key}
      style={{
        width: 46, height: 46, borderRadius: 8,
        borderInlineStart: `11px solid ${theme.accent}`,
        borderTop: `11px solid ${theme.accent}`,
        transform: rtl ? 'rotate(225deg)' : 'rotate(45deg)',
        opacity,
      }}
    />
  );
  return (
    <ShellRoot
      visualUrl={visualUrl} lang={lang} size={size} theme={theme}
      style={{
        background: `radial-gradient(ellipse 130% 92% at 50% 34%, ${theme.bgMid} 0%, ${theme.bgTop} 52%, ${theme.bgBottom} 100%)`,
      }}
    >
      {/* spotlight glow behind the content */}
      <div
        style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 920, height: story ? 900 : 660, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${theme.glowA} 0%, rgba(0,0,0,0) 68%)`,
        }}
      />
      <Dots theme={theme} opacity={0.14} />
      <Watermark portrait={portrait} theme={theme} />

      {/* floating glossy spheres */}
      <div style={{ position: 'absolute', top: story ? 540 : portrait ? 400 : 316, insetInlineStart: 54, ...orb(story ? 150 : 116) }} />
      <div style={{ position: 'absolute', bottom: story ? 600 : portrait ? 470 : 366, insetInlineEnd: 66, ...orb(story ? 102 : 82) }} />

      {/* double-chevron brand mark */}
      <div style={{ position: 'absolute', top: story ? 300 : portrait ? 240 : 200, insetInlineEnd: pad, display: 'flex', flexDirection: 'column', gap: -14 }}>
        {chev(0.95, 'a')}
        {chev(0.45, 'b')}
      </div>

      {/* content column */}
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: `${story ? 78 : 56}px ${pad}px ${story ? 70 : 52}px` }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Lockup theme={theme} rtl={rtl} tagline={tagline} center logoSize={72} nameSize={34} taglineSize={18} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: story ? 66 : 44 }}>
          <div style={{ width: 64, height: 2, background: theme.accentLine }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: theme.accent, whiteSpace: 'nowrap' }}>
            {kickerIcon}
            {kicker}
          </span>
          <div style={{ width: 64, height: 2, background: theme.accentLine }} />
        </div>

        <ShellFlow justify="center" align="center" pad="18px 0 0" gap={24}>{children}</ShellFlow>

        {/* white contact bar — the signature of this family */}
        <div
          style={{
            background: barBg, color: barFg, borderRadius: 24, padding: '18px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
            boxShadow: '0 24px 60px rgba(0,0,0,0.45)', borderTop: `4px solid ${theme.accent}`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 30, fontWeight: 800, direction: 'ltr', textAlign: rtl ? 'right' : 'left', letterSpacing: 0.5 }}>{BRAND.site}</span>
            <span style={{ fontSize: 19, fontWeight: 700, opacity: 0.75 }}>{cta}</span>
          </div>
          <QrChip qrDataUrl={qrDataUrl} theme={theme} size={80} />
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
    case 'cinema': return <CinemaShell {...props} />;
    default: return null;
  }
}

/** Shared brand shell: canvas + ambience + header lockup + footer CTA band. */
export function BrandShell({
  lang, size, kicker, kickerIcon, ctaLabel, qrDataUrl, theme, layout, visualUrl, children,
}: {
  lang: Lang;
  size: PosterSize;
  kicker: ReactNode;
  kickerIcon?: ReactNode;
  ctaLabel?: string;
  qrDataUrl?: string | null;
  theme: StudioTheme;
  layout: StudioLayout;
  visualUrl?: string | null;
  children: ReactNode;
}) {
  // Distinct composition families — each is its own shell, not a reskin.
  if (layout === 'split' || layout === 'frame' || layout === 'stack'
    || layout === 'glass' || layout === 'banner' || layout === 'ticket'
    || layout === 'cinema') {
    return (
      <StudioShell
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
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
      {visualUrl ? (
        <img src={visualUrl} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.32 }} />
      ) : null}

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

function BaseSocialCanvas(props: SocialCanvasProps) {
  const { template, lang, size, title, note, seriesNo, qrDataUrl } = props;
  const t = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
  const portrait = size === 'portrait';
  const story = size === 'story';
  const theme = resolveTheme(props.themeId);
  const layout = resolveLayout(props.layout);
  const visualUrl = props.visualUrl ?? null;

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
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
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
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
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
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
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
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
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
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
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
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
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

  // ── showcase formats (studio-exclusive, modelled on the reference posters) ──

  if (template === 'packages') {
    const cards = (props.packages ?? []).filter((c) => c && (c.value || c.label));
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
        kicker={t('social.post.kicker.packages')}
        kickerIcon={<Package style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout}>
          <GoldRule theme={theme} layout={layout} />
          <AccentHeadline text={title} max={story ? 4 : portrait ? 3 : 2} theme={theme} layout={layout} />
          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', alignItems: 'stretch', flexWrap: 'wrap' }}>
            {cards.map((card, i) => (
              <div
                key={i}
                style={{
                  flex: cards.length === 1 ? '0 1 460px' : '1 1 0', minWidth: 240, maxWidth: 460,
                  borderRadius: 38,
                  background: theme.dark ? 'rgba(255,255,255,0.07)' : theme.surface,
                  border: `2.5px solid ${theme.accentLine}`,
                  boxShadow: '0 26px 70px rgba(0,0,0,0.4)',
                  padding: `${story ? 46 : 36}px 28px`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: story ? 138 : 116, fontWeight: 900, lineHeight: 1,
                    direction: 'ltr', color: theme.text,
                    textShadow: '0 10px 44px rgba(0,0,0,0.45)',
                  }}
                >
                  {card.value}
                </div>
                <div style={{ width: 52, height: 4, borderRadius: 999, background: theme.accent }} />
                <div style={{ fontSize: 28, fontWeight: 700, color: theme.textDim, textAlign: 'center', lineHeight: 1.4 }}>
                  {card.label}
                </div>
                {card.sub ? (
                  <div style={{ fontSize: 21, fontWeight: 600, color: theme.textDim, opacity: 0.8, textAlign: 'center' }}>{card.sub}</div>
                ) : null}
              </div>
            ))}
          </div>
          {note ? (
            <div style={{ fontSize: 32, fontWeight: 800, color: theme.accent, textAlign: 'center', lineHeight: 1.45 }}>
              {note}
            </div>
          ) : null}
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'teaser') {
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
        kicker={t('social.post.kicker.teaser')}
        kickerIcon={<Telescope style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 54, height: 2, background: theme.accentLine }} />
              <Telescope style={{ width: 44, height: 44, color: theme.accent }} />
              <div style={{ width: 54, height: 2, background: theme.accentLine }} />
            </div>
            <div
              style={{
                fontSize: headlineSize(title, story ? 100 : 86), fontWeight: 900, lineHeight: 1.16,
                display: '-webkit-box', WebkitLineClamp: story ? 4 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                textShadow: '0 8px 36px rgba(0,0,0,0.4)',
              }}
            >
              {title}
            </div>
            {note ? (
              <div style={{ fontSize: 40, fontStyle: 'italic', fontWeight: 700, color: theme.accent, lineHeight: 1.35 }}>
                {note}
              </div>
            ) : null}
          </div>
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'greeting') {
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
        kicker={t('social.post.kicker.greeting')}
        kickerIcon={<Moon style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: story ? 30 : 22 }}>
            {/* ornament arch with crescent — occasion neutral, works for Eid,
                Mawlid, Friday and national-day greetings alike */}
            <div
              style={{
                width: 290, height: story ? 400 : 330,
                borderRadius: '145px 145px 26px 26px',
                border: `3px solid ${theme.accentLine}`,
                background: theme.accentFaint,
                display: 'grid', placeItems: 'center', position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', inset: 14, borderRadius: '131px 131px 16px 16px', border: `1px solid ${theme.accentFaint}` }} />
              <Moon style={{ width: 96, height: 96, color: theme.accent }} />
              <Sparkles style={{ position: 'absolute', top: 42, insetInlineEnd: 52, width: 32, height: 32, color: theme.accent }} />
              <Sparkles style={{ position: 'absolute', bottom: 58, insetInlineStart: 46, width: 24, height: 24, color: theme.accent, opacity: 0.7 }} />
            </div>
            <div
              style={{
                fontSize: headlineSize(title, 62), fontWeight: 900, lineHeight: 1.28, textAlign: 'center',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                textShadow: '0 8px 36px rgba(0,0,0,0.4)',
              }}
            >
              {title}
            </div>
            {note ? (
              <div style={{ fontSize: 27, fontWeight: 600, color: theme.textDim, textAlign: 'center', maxWidth: 760, lineHeight: 1.55 }}>
                {note}
              </div>
            ) : null}
          </div>
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'hiring') {
    const callouts = (props.checklist ?? []).slice(0, 3);
    const rtlFlip = lang !== 'en';
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
        kicker={t('social.post.kicker.hiring')}
        kickerIcon={<Megaphone style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, textAlign: 'center' }}>
            <Megaphone
              style={{
                width: story ? 104 : 88, height: story ? 104 : 88, color: theme.accent,
                transform: `${rtlFlip ? 'scaleX(-1) ' : ''}rotate(-8deg)`,
                filter: 'drop-shadow(0 14px 34px rgba(0,0,0,0.4))',
              }}
            />
            <div
              style={{
                fontSize: headlineSize(title, story ? 116 : 100), fontWeight: 900, lineHeight: 1.08,
                letterSpacing: 1, textTransform: 'uppercase',
                display: '-webkit-box', WebkitLineClamp: story ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                textShadow: '0 10px 44px rgba(0,0,0,0.45)',
              }}
            >
              {title}
            </div>
            {note ? (
              <div style={{ fontSize: 31, fontWeight: 700, color: theme.textDim, lineHeight: 1.4 }}>
                {note}
              </div>
            ) : null}
            {callouts.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                {callouts.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 12,
                      background: theme.dark ? 'rgba(255,255,255,0.07)' : theme.surface,
                      border: `1.5px solid ${theme.accentLine}`,
                      borderRadius: 999, padding: '13px 30px',
                      fontSize: 26, fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 style={{ width: 29, height: 29, color: theme.accent, flexShrink: 0 }} />
                    {row}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </ContentFrame>
      </BrandShell>
    );
  }

  // ── showcase formats round 2 (profile / choice / occasion-day) ──────────────

  if (template === 'follow') {
    // CSS phone mockup with the ARIA HUB profile on screen + glowing orbit
    // rings — the "follow us" hero of the reference posters, fully code-drawn.
    const ring = (rotate: number, color: string, opacity: number, blur: number, key: string): ReactNode => (
      <div
        key={key}
        style={{
          position: 'absolute', left: '50%', top: '50%',
          width: story ? 700 : 600, height: story ? 230 : 190,
          marginLeft: story ? -350 : -300, marginTop: story ? -115 : -95,
          border: `3px solid ${color}`, borderRadius: '50%',
          transform: `rotate(${rotate}deg)`, opacity, filter: blur ? `blur(${blur}px)` : undefined,
          pointerEvents: 'none',
        }}
      />
    );
    const chip = (icon: ReactNode, key: string, style: CSSProperties): ReactNode => (
      <div
        key={key}
        style={{
          width: 84, height: 84, borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.5) 0%, ${theme.accentSoft} 40%, ${theme.bgTop} 100%)`,
          boxShadow: '0 18px 44px rgba(0,0,0,0.45)', color: theme.text, ...style,
        }}
      >
        {icon}
      </div>
    );
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
        kicker={t('social.post.kicker.follow')}
        kickerIcon={<UserPlus style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: story ? 36 : 26 }}>
            {/* phone + orbits stage */}
            <div style={{ position: 'relative', width: '100%', height: story ? 660 : 520, display: 'grid', placeItems: 'center' }}>
              {ring(-16, theme.accent, 0.75, 0, 'r1')}
              {ring(-16, theme.accent, 0.4, 6, 'r1b')}
              {ring(14, 'rgba(255,255,255,0.65)', 0.8, 0, 'r2')}
              {ring(14, 'rgba(255,255,255,0.5)', 0.35, 6, 'r2b')}
              {/* phone */}
              <div
                style={{
                  position: 'relative', width: 264, height: story ? 540 : 430,
                  borderRadius: 42, border: `10px solid ${theme.deep}`,
                  background: `linear-gradient(180deg, ${theme.bgMid} 0%, ${theme.bgTop} 100%)`,
                  boxShadow: '0 40px 90px rgba(0,0,0,0.55)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '44px 20px 20px', gap: 12,
                }}
              >
                <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 84, height: 18, borderRadius: 999, background: theme.deep }} />
                <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', background: theme.logoBg, outline: `3px solid ${theme.accentLine}`, outlineOffset: -3 }}>
                  <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, direction: 'ltr' }}>ARIA HUB</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: theme.textDim, direction: 'ltr' }}>{BRAND.site}</div>
                <div
                  style={{
                    marginTop: 4, background: theme.accent, color: theme.onAccent,
                    fontSize: 20, fontWeight: 800, padding: '9px 34px', borderRadius: 999,
                  }}
                >
                  {t('social.post.followBtn')}
                </div>
                <div style={{ marginTop: 2, display: 'flex', gap: 18, color: theme.textDim }}>
                  <Briefcase style={{ width: 22, height: 22 }} />
                  <GraduationCap style={{ width: 22, height: 22 }} />
                  <Newspaper style={{ width: 22, height: 22 }} />
                </div>
              </div>
              {/* floating platform chips */}
              {chip(<Facebook style={{ width: 38, height: 38 }} />, 'fb', { position: 'absolute', insetInlineStart: 18, top: story ? 120 : 84 })}
              {chip(<Instagram style={{ width: 38, height: 38 }} />, 'ig', { position: 'absolute', insetInlineEnd: 18, top: story ? 330 : 260 })}
              {chip(<Send style={{ width: 38, height: 38 }} />, 'tg', { position: 'absolute', insetInlineStart: 30, bottom: story ? 60 : 40 })}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: headlineSize(title, 54), fontWeight: 900, lineHeight: 1.3, textShadow: '0 8px 36px rgba(0,0,0,0.4)' }}>
                {title}
              </div>
              {note ? (
                <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: theme.textDim, lineHeight: 1.5 }}>
                  {note}
                </div>
              ) : null}
            </div>
          </div>
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'pick') {
    // Three glowing app tiles, centre one elevated — the "they choose us" beat.
    const tiles = (props.checklist ?? []).slice(0, 2);
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
        kicker={t('social.post.kicker.pick')}
        kickerIcon={<MousePointerClick style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: story ? 34 : 24, textAlign: 'center' }}>
            <AccentHeadline text={title} max={story ? 4 : 3} theme={theme} layout={layout} />
            {note ? <NoteLine text={note} theme={theme} clamp={2} /> : null}
            <div style={{ display: 'flex', alignItems: 'center', gap: story ? 34 : 26, marginTop: 8 }}>
              {tiles[0] ? (
                <div
                  style={{
                    width: story ? 190 : 158, height: story ? 190 : 158, borderRadius: 40,
                    background: theme.dark ? 'rgba(255,255,255,0.06)' : theme.surface,
                    border: `2px solid ${theme.surfaceBorder}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                    opacity: 0.92,
                  }}
                >
                  <GraduationCap style={{ width: 64, height: 64, color: theme.text }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: theme.textDim }}>{tiles[0]}</div>
                </div>
              ) : null}
              {/* centre tile — the brand, highlighted */}
              <div
                style={{
                  width: story ? 218 : 182, height: story ? 218 : 182, borderRadius: 44,
                  background: theme.dark ? 'rgba(255,255,255,0.10)' : theme.surface,
                  border: `3px solid ${theme.accent}`,
                  boxShadow: `0 0 70px ${theme.glowA}, 0 26px 70px rgba(0,0,0,0.5)`,
                  transform: 'translateY(-14px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                  position: 'relative',
                }}
              >
                <div style={{ width: 84, height: 84, borderRadius: 24, overflow: 'hidden', background: theme.logoBg }}>
                  <img src="/images/logo-mark.png" alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ fontSize: 21, fontWeight: 800, color: theme.accent, letterSpacing: 1, direction: 'ltr' }}>ARIA HUB</div>
                {/* touch glow */}
                <div style={{ position: 'absolute', bottom: -26, left: '50%', transform: 'translateX(-50%)', width: 120, height: 46, borderRadius: '50%', background: `radial-gradient(ellipse, ${theme.glowA} 0%, rgba(0,0,0,0) 70%)` }} />
              </div>
              {tiles[1] ? (
                <div
                  style={{
                    width: story ? 190 : 158, height: story ? 190 : 158, borderRadius: 40,
                    background: theme.dark ? 'rgba(255,255,255,0.06)' : theme.surface,
                    border: `2px solid ${theme.surfaceBorder}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                    opacity: 0.92,
                  }}
                >
                  <Newspaper style={{ width: 64, height: 64, color: theme.text }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: theme.textDim }}>{tiles[1]}</div>
                </div>
              ) : null}
            </div>
          </div>
        </ContentFrame>
      </BrandShell>
    );
  }

  if (template === 'day') {
    // Occasion-day card: date badge + line-art glyph + bold greeting.
    const badge = props.dateBadge;
    return (
      <BrandShell
        lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
        kicker={t('social.post.kicker.day')}
        kickerIcon={<Sparkles style={{ width: 26, height: 26 }} />}
        qrDataUrl={qrDataUrl}
      >
        <ContentFrame size={size} layout={layout}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: story ? 30 : 22, textAlign: 'center' }}>
            {badge ? (
              <div
                style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 14,
                  background: theme.dark ? 'rgba(255,255,255,0.08)' : theme.surface,
                  border: `2px solid ${theme.accentLine}`, borderRadius: 22,
                  padding: '14px 30px', direction: 'ltr',
                }}
              >
                <span style={{ fontSize: 46, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{badge.big}</span>
                {badge.small ? <span style={{ fontSize: 24, fontWeight: 700, color: theme.textDim }}>{badge.small}</span> : null}
              </div>
            ) : null}
            <Heart style={{ width: story ? 150 : 120, height: story ? 150 : 120, color: theme.text, filter: `drop-shadow(0 0 34px ${theme.glowA})` }} />
            <div
              style={{
                fontSize: headlineSize(title, 64), fontWeight: 900, lineHeight: 1.3,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                textShadow: '0 8px 36px rgba(0,0,0,0.4)',
              }}
            >
              {title}
            </div>
            {note ? (
              <div style={{ fontSize: 27, fontWeight: 600, color: theme.textDim, maxWidth: 760, lineHeight: 1.55 }}>
                {note}
              </div>
            ) : null}
          </div>
        </ContentFrame>
      </BrandShell>
    );
  }

  // story
  const person = props.person;
  return (
    <BrandShell
      lang={lang} size={size} theme={theme} layout={layout} visualUrl={visualUrl}
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

export function SocialCanvas(props: SocialCanvasProps) {
  return <AriPosterFrame ari={props.ari} height={H[props.size]} themeId={props.themeId} rtl={props.lang !== 'en'}><BaseSocialCanvas {...props} /></AriPosterFrame>;
}
