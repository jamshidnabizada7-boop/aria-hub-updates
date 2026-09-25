'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  AlarmClock, ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays,
  FileText, Globe2, GraduationCap, MapPin, Sparkles, Trophy,
} from 'lucide-react';
import type { Lang } from '@/lib/lang-route';
import { BRAND, splitAccent, type PostTemplate } from '@/lib/social/brand';
import type { StudioTheme } from '@/lib/social/themes';
import type { StudioDesignFamilyId } from '@/lib/social/studio/registry';
import {
  normalizeStudioMedia,
  studioVisualLayerStyle,
  type StudioMediaState,
} from '@/lib/social/studio/media';
import { formatDateLong } from '@/lib/date-format';

export interface PremiumTemplateProps {
  template: PostTemplate;
  family: StudioDesignFamilyId;
  lang: Lang;
  size: 'square' | 'portrait' | 'story';
  theme: StudioTheme;
  title: string;
  note?: string;
  eyebrow?: string;
  subheadline?: string;
  badge?: string;
  ctaLabel?: string;
  accentText?: string;
  showFooter?: boolean;
  showQr?: boolean;
  qrDataUrl?: string | null;
  media?: StudioMediaState | null;
  deadlineDate?: string | null;
  newsDate?: string | null;
  checklist?: string[];
  stat?: { value: string; label: string; sub?: string };
  person?: { name: string; meta: string };
  spotlight?: {
    category?: string;
    organization?: string;
    country?: string;
    salary?: string;
    featured?: boolean;
    fundingStatus?: string;
    degreeLevel?: string;
  };
}

const W = 1080;
const HEIGHT = { square: 1080, portrait: 1350, story: 1920 } as const;

function alpha(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(248,216,152,${opacity})`;
  const n = Number.parseInt(clean, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

function PremiumRoot({
  props,
  children,
  style,
  foreground = true,
}: {
  props: PremiumTemplateProps;
  children: ReactNode;
  style?: CSSProperties;
  foreground?: boolean;
}) {
  const h = HEIGHT[props.size];
  const media = normalizeStudioMedia(props.media);
  const background = media.background;
  const texture = media.texture;
  const foregroundLayer = media.foreground;
  return (
    <div
      style={{
        position: 'relative',
        width: W,
        height: h,
        overflow: 'hidden',
        color: props.theme.text,
        direction: props.lang === 'en' ? 'ltr' : 'rtl',
        background: `linear-gradient(155deg, ${props.theme.bgTop} 0%, ${props.theme.bgMid} 48%, ${props.theme.bgBottom} 100%)`,
        fontFamily: 'var(--font-vazirmatn), var(--font-inter), system-ui, sans-serif',
        ...style,
      }}
    >
      {background ? <img src={background.url} alt="" aria-hidden="true" style={studioVisualLayerStyle(background)} /> : null}
      {texture ? <img src={texture.url} alt="" aria-hidden="true" style={studioVisualLayerStyle(texture)} /> : null}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', background: `radial-gradient(circle at 82% 20%, ${props.theme.glowA}, transparent 32%), radial-gradient(circle at 12% 82%, ${props.theme.glowB}, transparent 36%)` }} />
      <div style={{ position: 'relative', zIndex: 5, width: '100%', height: '100%' }}>{children}</div>
      {foreground && foregroundLayer ? <img src={foregroundLayer.url} alt="" aria-hidden="true" style={studioVisualLayerStyle(foregroundLayer, { heroWidth: 760, heroHeight: 760 })} /> : null}
    </div>
  );
}

function LogoLockup({ theme, compact = false }: { theme: StudioTheme; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 12 : 16, direction: 'ltr' }}>
      <div style={{
        width: compact ? 50 : 62, height: compact ? 50 : 62, borderRadius: compact ? 14 : 18,
        overflow: 'hidden', background: theme.logoBg, boxShadow: '0 16px 34px rgba(0,0,0,.22)',
      }}>
        <img src={BRAND.logoSrc} alt="ARIA HUB" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontSize: compact ? 24 : 30, fontWeight: 900, letterSpacing: 1.7, color: theme.text }}>ARIA HUB</div>
        {!compact ? <div style={{ marginTop: 7, fontSize: 15, color: theme.textDim, letterSpacing: .6 }}>OPPORTUNITY INTELLIGENCE</div> : null}
      </div>
    </div>
  );
}

function Footer({ props, inverse = false }: { props: PremiumTemplateProps; inverse?: boolean }) {
  if (props.showFooter === false) return null;
  const qrVisible = props.showQr !== false && props.qrDataUrl;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      direction: props.lang === 'en' ? 'ltr' : 'rtl',
      color: inverse ? props.theme.deep : props.theme.text,
    }}>
      <div>
        <div style={{ fontSize: 27, fontWeight: 900, direction: 'ltr' }}>{BRAND.site}</div>
        <div style={{ marginTop: 5, fontSize: 18, opacity: .68, fontWeight: 650 }}>{props.ctaLabel || 'Discover the opportunity'}</div>
      </div>
      {qrVisible ? (
        <div style={{ padding: 6, borderRadius: 14, background: props.theme.qrLight }}>
          <img src={props.qrDataUrl || ''} alt="QR" style={{ width: 74, height: 74, display: 'block' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', width: 58, height: 58, borderRadius: 18, border: `1px solid ${inverse ? alpha(props.theme.deep, .2) : props.theme.accentLine}` }}>
          <ArrowUpRight size={28} />
        </div>
      )}
    </div>
  );
}

function AccentTitle({
  props,
  size,
  maxWidth,
  color,
}: {
  props: PremiumTemplateProps;
  size: number;
  maxWidth?: number | string;
  color?: string;
}) {
  const exact = props.accentText?.trim();
  let before = '';
  let accent = '';
  let after = '';
  if (exact) {
    const idx = props.title.toLocaleLowerCase().indexOf(exact.toLocaleLowerCase());
    if (idx >= 0) {
      before = props.title.slice(0, idx);
      accent = props.title.slice(idx, idx + exact.length);
      after = props.title.slice(idx + exact.length);
    }
  }
  if (!accent) {
    const parts = splitAccent(props.title, props.lang);
    before = parts.before;
    accent = parts.accent;
    after = parts.after;
  }
  return (
    <div style={{
      maxWidth,
      fontSize: size,
      lineHeight: 1.08,
      fontWeight: 950,
      letterSpacing: props.lang === 'en' ? -2.4 : -1,
      color: color || props.theme.text,
      textWrap: 'balance',
    }}>
      {before}<span style={{ color: props.theme.accent }}>{accent}</span>{after}
    </div>
  );
}

function Eyebrow({ props, dark = false }: { props: PremiumTemplateProps; dark?: boolean }) {
  const label = props.eyebrow || props.badge || props.spotlight?.category || (props.template === 'news' ? 'ARIA HUB UPDATE' : 'ARIA HUB');
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, width: 'fit-content',
      padding: '9px 15px', borderRadius: 999,
      background: dark ? alpha(props.theme.deep, .08) : props.theme.accentFaint,
      border: `1px solid ${dark ? alpha(props.theme.deep, .16) : props.theme.accentLine}`,
      color: dark ? props.theme.deep : props.theme.accent,
      fontSize: 18, fontWeight: 850, letterSpacing: props.lang === 'en' ? 1.1 : 0,
    }}>
      <Sparkles size={17} /> {label}
    </div>
  );
}

function MetaChips({ props, dark = false, limit = 4 }: { props: PremiumTemplateProps; dark?: boolean; limit?: number }) {
  const values = [
    props.spotlight?.organization ? { icon: <Building2 size={18} />, text: props.spotlight.organization } : null,
    props.spotlight?.country ? { icon: <MapPin size={18} />, text: props.spotlight.country } : null,
    props.spotlight?.salary ? { icon: <BriefcaseBusiness size={18} />, text: props.spotlight.salary } : null,
    props.spotlight?.fundingStatus ? { icon: <Trophy size={18} />, text: props.spotlight.fundingStatus } : null,
    props.spotlight?.degreeLevel ? { icon: <GraduationCap size={18} />, text: props.spotlight.degreeLevel } : null,
  ].filter(Boolean).slice(0, limit) as { icon: ReactNode; text: string }[];
  if (!values.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '9px 13px', borderRadius: 999, fontSize: 16, fontWeight: 720,
          background: dark ? alpha(props.theme.deep, .07) : 'rgba(255,255,255,.07)',
          border: `1px solid ${dark ? alpha(props.theme.deep, .14) : props.theme.surfaceBorder}`,
          color: dark ? props.theme.deep : props.theme.text,
        }}>
          {v.icon}{v.text}
        </div>
      ))}
    </div>
  );
}

function DeadlineBadge({ props, dark = false }: { props: PremiumTemplateProps; dark?: boolean }) {
  if (!props.deadlineDate) return null;
  const d = new Date(props.deadlineDate);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, width: 'fit-content',
      padding: '11px 15px', borderRadius: 16,
      background: dark ? props.theme.deep : props.theme.accent,
      color: dark ? props.theme.qrLight : props.theme.onAccent,
      fontSize: 17, fontWeight: 850,
    }}>
      <AlarmClock size={19} />
      {formatDateLong(d, props.lang)}
    </div>
  );
}

function HeroLayer({
  props,
  width = 760,
  height = 760,
  fallback,
}: {
  props: PremiumTemplateProps;
  width?: number;
  height?: number;
  fallback: ReactNode;
}) {
  const media = normalizeStudioMedia(props.media);
  const hero = media.hero;
  return hero ? <img src={hero.url} alt="" aria-hidden="true" style={studioVisualLayerStyle(hero, { heroWidth: width, heroHeight: height })} /> : <>{fallback}</>;
}

function PortalFallback({ theme, story }: { theme: StudioTheme; story: boolean }) {
  return (
    <div style={{ position: 'absolute', right: story ? 72 : 46, top: story ? 360 : 220, width: story ? 690 : 580, height: story ? 920 : 650, zIndex: 6 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '330px 330px 42px 42px', background: `linear-gradient(145deg, ${theme.accent} 0%, #fff3cf 24%, ${theme.deep} 25%, ${theme.bgMid} 100%)`, boxShadow: '0 50px 100px rgba(0,0,0,.45), inset 0 0 0 18px rgba(255,255,255,.08)' }} />
      <div style={{ position: 'absolute', inset: story ? '74px 68px 58px' : '62px 56px 48px', borderRadius: '270px 270px 24px 24px', background: `radial-gradient(circle at 50% 34%, rgba(248,216,152,.75), rgba(40,56,104,.35) 34%, rgba(9,18,40,.96) 75%)`, boxShadow: 'inset 0 0 80px rgba(0,0,0,.65)' }} />
      <Globe2 style={{ position: 'absolute', width: story ? 360 : 300, height: story ? 360 : 300, left: '50%', top: '43%', transform: 'translate(-50%,-50%)', color: theme.accent, opacity: .88, filter: 'drop-shadow(0 25px 45px rgba(0,0,0,.45))' }} />
      <div style={{ position: 'absolute', left: '50%', bottom: story ? 110 : 78, transform: 'translateX(-50%)', width: story ? 300 : 260, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.55)', filter: 'blur(16px)' }} />
    </div>
  );
}

function ObjectFallback({ theme, icon = 'globe', x = 70, y = 45, size = 410 }: { theme: StudioTheme; icon?: 'globe' | 'cap' | 'briefcase' | 'document'; x?: number; y?: number; size?: number }) {
  const Icon = icon === 'cap' ? GraduationCap : icon === 'briefcase' ? BriefcaseBusiness : icon === 'document' ? FileText : Globe2;
  return (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', zIndex: 6 }}>
      <div style={{ position: 'absolute', width: size * 1.18, height: size * 1.18, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: `radial-gradient(circle, ${theme.glowA} 0%, transparent 68%)`, filter: 'blur(6px)' }} />
      <div style={{ display: 'grid', placeItems: 'center', width: size, height: size, borderRadius: '48%', background: `radial-gradient(circle at 30% 24%, #fff7dc 0%, ${theme.accent} 22%, ${theme.ctaFrom} 48%, ${theme.deep} 100%)`, boxShadow: '0 58px 90px rgba(0,0,0,.46), inset -24px -30px 56px rgba(0,0,0,.32), inset 18px 16px 36px rgba(255,255,255,.36)' }}>
        <Icon size={Math.round(size * .52)} strokeWidth={1.5} color={theme.deep} />
      </div>
      <div style={{ position: 'absolute', left: '50%', bottom: -64, width: size * .78, height: 46, transform: 'translateX(-50%)', borderRadius: '50%', background: 'rgba(0,0,0,.34)', filter: 'blur(18px)' }} />
    </div>
  );
}

function ScholarshipPortal(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const pad = story ? 78 : 64;
  return (
    <PremiumRoot props={props} style={{ background: `radial-gradient(circle at 76% 38%, ${alpha(props.theme.accent, .12)}, transparent 28%), linear-gradient(145deg, ${props.theme.bgTop}, ${props.theme.bgBottom})` }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${props.theme.dots} 1px, transparent 1px),linear-gradient(90deg,${props.theme.dots} 1px,transparent 1px)`, backgroundSize: '44px 44px', opacity: .34 }} />
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 9 }}>
        <LogoLockup theme={props.theme} compact />
        <DeadlineBadge props={props} />
      </div>
      <div style={{ position: 'absolute', left: pad, top: story ? 280 : 230, width: story ? 620 : 510, zIndex: 8 }}>
        <Eyebrow props={props} />
        <div style={{ marginTop: 28 }}><AccentTitle props={props} size={story ? 78 : 66} /></div>
        <div style={{ marginTop: 24, fontSize: story ? 28 : 23, lineHeight: 1.5, color: props.theme.textDim, maxWidth: 520 }}>{props.subheadline || props.note}</div>
        <div style={{ marginTop: 30 }}><MetaChips props={props} limit={story ? 5 : 3} /></div>
      </div>
      <HeroLayer props={props} width={story ? 780 : 680} height={story ? 1040 : 760} fallback={<PortalFallback theme={props.theme} story={story} />} />
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 78 : 58, zIndex: 11 }}><Footer props={props} /></div>
    </PremiumRoot>
  );
}

function ScholarshipDocumentDesk(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const h = HEIGHT[props.size];
  const pad = story ? 78 : 68;
  const paper = '#FFFDF8';
  return (
    <PremiumRoot props={props} style={{ background: `linear-gradient(150deg, #F7F1E5 0%, #FFFDF8 48%, #E8E0D1 100%)`, color: props.theme.deep }}>
      <div style={{ position: 'absolute', right: -180, top: -130, width: 620, height: 620, borderRadius: '50%', background: alpha(props.theme.accent, .33), filter: 'blur(1px)', zIndex: 2 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(25,35,60,.08) 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: .28 }} />
      <div style={{ position: 'absolute', left: pad, right: pad, top: pad, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 12 }}>
        <LogoLockup theme={{ ...props.theme, text: props.theme.deep, textDim: alpha(props.theme.deep, .6) }} compact />
        <Eyebrow props={props} dark />
      </div>
      <div style={{ position: 'absolute', left: pad, right: story ? 430 : 470, top: story ? 330 : 250, zIndex: 10 }}>
        <AccentTitle props={{ ...props, theme: { ...props.theme, text: props.theme.deep } }} size={story ? 76 : 64} color={props.theme.deep} />
        <div style={{ marginTop: 26, fontSize: story ? 27 : 22, color: alpha(props.theme.deep, .66), lineHeight: 1.52 }}>{props.subheadline || props.note}</div>
        <div style={{ marginTop: 28 }}><MetaChips props={props} dark limit={3} /></div>
        <div style={{ marginTop: 22 }}><DeadlineBadge props={props} dark /></div>
      </div>
      <div style={{ position: 'absolute', right: story ? 62 : 46, top: story ? 500 : 300, width: story ? 520 : 470, height: story ? 720 : 560, zIndex: 5 }}>
        <div style={{ position: 'absolute', right: 80, top: 60, width: 350, height: 450, borderRadius: 26, background: paper, transform: 'rotate(9deg)', boxShadow: '0 35px 65px rgba(33,28,18,.18)', border: '1px solid rgba(28,36,58,.08)' }}>
          <div style={{ margin: '58px 44px', height: 12, borderRadius: 99, background: alpha(props.theme.deep, .10), boxShadow: `0 34px 0 ${alpha(props.theme.deep, .07)},0 68px 0 ${alpha(props.theme.deep, .07)},0 102px 0 ${alpha(props.theme.deep, .07)}` }} />
          <GraduationCap size={86} color={props.theme.accent} style={{ position: 'absolute', left: 36, bottom: 44 }} />
        </div>
        <div style={{ position: 'absolute', right: 145, top: 20, width: 315, height: 420, borderRadius: 26, background: '#fff', transform: 'rotate(-8deg)', boxShadow: '0 40px 80px rgba(33,28,18,.24)', border: '1px solid rgba(28,36,58,.08)' }}>
          <div style={{ height: 96, background: props.theme.deep, borderRadius: '26px 26px 0 0' }} />
          <div style={{ padding: '36px 32px', fontSize: 20, color: props.theme.deep, fontWeight: 850 }}>SCHOLARSHIP<br /><span style={{ color: props.theme.accent }}>APPLICATION</span></div>
        </div>
        <HeroLayer props={props} width={story ? 600 : 520} height={story ? 700 : 560} fallback={null} />
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 76 : 56, borderTop: `1px solid ${alpha(props.theme.deep, .12)}`, paddingTop: 22, zIndex: 12 }}>
        <Footer props={{ ...props, theme: { ...props.theme, text: props.theme.deep, textDim: alpha(props.theme.deep, .62) } }} inverse />
      </div>
      <div style={{ position: 'absolute', left: 0, top: h - 14, right: 0, height: 14, background: props.theme.accent, zIndex: 13 }} />
    </PremiumRoot>
  );
}

function ScholarshipGlobalObject(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const pad = story ? 80 : 68;
  return (
    <PremiumRoot props={props}>
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
        <LogoLockup theme={props.theme} compact />
        <Eyebrow props={props} />
      </div>
      <HeroLayer props={props} width={story ? 820 : 680} height={story ? 820 : 680} fallback={<ObjectFallback theme={props.theme} icon="globe" x={story ? 50 : 68} y={story ? 42 : 46} size={story ? 500 : 420} />} />
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 260 : 205, zIndex: 9, maxWidth: story ? 900 : 760 }}>
        <AccentTitle props={props} size={story ? 86 : 72} />
        <div style={{ marginTop: 20, maxWidth: 700, fontSize: story ? 27 : 22, lineHeight: 1.48, color: props.theme.textDim }}>{props.subheadline || props.note}</div>
        <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}><MetaChips props={props} limit={3} /><DeadlineBadge props={props} /></div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 72 : 52, zIndex: 10 }}><Footer props={props} /></div>
    </PremiumRoot>
  );
}

function CareerDesk(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const pad = story ? 76 : 62;
  return (
    <PremiumRoot props={props} style={{ background: `linear-gradient(120deg, ${props.theme.bgBottom}, ${props.theme.bgMid})` }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: story ? '70%' : '58%', background: 'linear-gradient(90deg, rgba(7,14,34,.96) 0%, rgba(7,14,34,.86) 62%, rgba(7,14,34,.12) 100%)', zIndex: 4 }} />
      <HeroLayer props={props} width={story ? 920 : 760} height={story ? 1220 : 820} fallback={<ObjectFallback theme={props.theme} icon="briefcase" x={story ? 65 : 74} y={story ? 43 : 50} size={story ? 470 : 400} />} />
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, zIndex: 11 }}><LogoLockup theme={props.theme} compact /></div>
      <div style={{ position: 'absolute', left: pad, top: story ? 330 : 250, width: story ? 660 : 540, zIndex: 11 }}>
        <Eyebrow props={props} />
        <div style={{ marginTop: 25 }}><AccentTitle props={props} size={story ? 80 : 68} /></div>
        <div style={{ marginTop: 22, fontSize: story ? 27 : 22, color: props.theme.textDim, lineHeight: 1.5 }}>{props.subheadline || props.note}</div>
        <div style={{ marginTop: 28 }}><MetaChips props={props} limit={4} /></div>
        <div style={{ marginTop: 20 }}><DeadlineBadge props={props} /></div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 70 : 52, zIndex: 11 }}><Footer props={props} /></div>
    </PremiumRoot>
  );
}

function CareerAscent(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const h = HEIGHT[props.size];
  const pad = story ? 78 : 64;
  const stepW = story ? 250 : 190;
  const stepH = story ? 96 : 72;
  return (
    <PremiumRoot props={props} style={{ background: `radial-gradient(circle at 70% 48%, ${alpha(props.theme.accent, .18)}, transparent 30%), linear-gradient(155deg, ${props.theme.bgTop}, ${props.theme.bgBottom})` }}>
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', zIndex: 11 }}>
        <LogoLockup theme={props.theme} compact />
        <Eyebrow props={props} />
      </div>
      {[0,1,2,3,4].map((i) => (
        <div key={i} style={{
          position: 'absolute', zIndex: 5,
          width: stepW, height: stepH,
          right: story ? 90 + i * 95 : 48 + i * 78,
          bottom: story ? 260 + i * 125 : 170 + i * 92,
          transform: 'skewY(-8deg)',
          borderRadius: 18,
          background: `linear-gradient(145deg, ${i === 4 ? props.theme.accent : alpha(props.theme.accent, .64)} 0%, ${i === 4 ? props.theme.ctaFrom : props.theme.deep} 100%)`,
          boxShadow: '0 26px 48px rgba(0,0,0,.34), inset 0 1px rgba(255,255,255,.22)',
        }} />
      ))}
      <div style={{ position: 'absolute', right: story ? 58 : 36, bottom: story ? 190 : 120, width: story ? 640 : 520, height: 90, borderRadius: '50%', background: 'rgba(0,0,0,.35)', filter: 'blur(28px)', zIndex: 4 }} />
      <HeroLayer props={props} width={story ? 760 : 620} height={story ? 1040 : 760} fallback={null} />
      <div style={{ position: 'absolute', left: pad, top: story ? 300 : 230, width: story ? 620 : 500, zIndex: 12 }}>
        <div style={{ fontSize: story ? 25 : 20, color: props.theme.accent, fontWeight: 900, letterSpacing: props.lang === 'en' ? 1.8 : 0 }}>{props.badge || 'YOUR NEXT MOVE'}</div>
        <div style={{ marginTop: 20 }}><AccentTitle props={props} size={story ? 82 : 67} /></div>
        <div style={{ marginTop: 23, fontSize: story ? 27 : 22, lineHeight: 1.48, color: props.theme.textDim }}>{props.subheadline || props.note}</div>
        <div style={{ marginTop: 27 }}><MetaChips props={props} limit={3} /></div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 72 : 48, zIndex: 12 }}><Footer props={props} /></div>
      <div style={{ position: 'absolute', right: pad, top: h * .14, width: 2, height: h * .15, background: `linear-gradient(${props.theme.accent},transparent)`, zIndex: 9 }} />
    </PremiumRoot>
  );
}

function CareerTalent(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const pad = story ? 76 : 62;
  return (
    <PremiumRoot props={props} style={{ background: `linear-gradient(120deg, ${props.theme.bgTop} 0%, ${props.theme.bgTop} 50%, ${props.theme.bgMid} 50%, ${props.theme.bgBottom} 100%)` }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent 0 49.6%, ${props.theme.accent} 49.6% 50.2%, transparent 50.2%)`, opacity: .9, zIndex: 4 }} />
      <HeroLayer props={props} width={story ? 860 : 700} height={story ? 1260 : 880} fallback={
        <div style={{ position: 'absolute', right: story ? 42 : 24, bottom: 0, width: story ? 500 : 410, height: story ? 1120 : 770, borderRadius: '250px 250px 0 0', background: `linear-gradient(155deg, ${alpha(props.theme.accent, .9)}, ${props.theme.deep})`, boxShadow: '0 0 80px rgba(0,0,0,.35)', zIndex: 6 }}>
          <div style={{ position: 'absolute', left: '50%', top: '20%', transform: 'translateX(-50%)', width: story ? 210 : 170, height: story ? 210 : 170, borderRadius: '50%', background: 'linear-gradient(145deg,#f6d1b8,#c58d6e)', boxShadow: '0 20px 44px rgba(0,0,0,.22)' }} />
          <div style={{ position: 'absolute', left: '50%', top: story ? 360 : 280, transform: 'translateX(-50%)', width: story ? 370 : 300, height: story ? 570 : 390, borderRadius: '170px 170px 38px 38px', background: `linear-gradient(145deg, #ffffff, ${alpha(props.theme.accent, .72)})`, boxShadow: '0 28px 60px rgba(0,0,0,.30)' }} />
        </div>
      } />
      <div style={{ position: 'absolute', left: pad, top: pad, zIndex: 11 }}><LogoLockup theme={props.theme} compact /></div>
      <div style={{ position: 'absolute', left: pad, top: story ? 330 : 250, width: story ? 560 : 480, zIndex: 12 }}>
        <Eyebrow props={props} />
        <div style={{ marginTop: 26 }}><AccentTitle props={props} size={story ? 80 : 66} /></div>
        <div style={{ marginTop: 24, color: props.theme.textDim, fontSize: story ? 26 : 21, lineHeight: 1.5 }}>{props.subheadline || props.note}</div>
        <div style={{ marginTop: 28 }}><MetaChips props={props} limit={4} /></div>
        <div style={{ marginTop: 22 }}><DeadlineBadge props={props} /></div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 72 : 50, zIndex: 12 }}><Footer props={props} /></div>
    </PremiumRoot>
  );
}

function EditorialBreak(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const h = HEIGHT[props.size];
  const imageH = story ? 910 : props.size === 'portrait' ? 620 : 500;
  const pad = story ? 72 : 62;
  const media = normalizeStudioMedia(props.media);
  return (
    <PremiumRoot props={props} foreground={false} style={{ background: '#F9F7F1', color: props.theme.deep }}>
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: imageH, background: `linear-gradient(135deg, ${props.theme.bgMid}, ${props.theme.bgBottom})`, overflow: 'hidden', zIndex: 3 }}>
        {media.background ? <img src={media.background.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${media.background.x}% ${media.background.y}%`, opacity: Math.max(.58, media.background.opacity) }} /> : (
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 75% 28%, ${props.theme.accent}55, transparent 25%),linear-gradient(140deg,${props.theme.bgMid},${props.theme.bgBottom})` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,.55))' }} />
        <div style={{ position: 'absolute', left: pad, right: pad, top: pad, display: 'flex', justifyContent: 'space-between' }}>
          <LogoLockup theme={props.theme} compact />
          <div style={{ padding: '9px 14px', borderRadius: 999, background: props.theme.accent, color: props.theme.onAccent, fontSize: 16, fontWeight: 900 }}>{props.badge || 'LATEST'}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, top: imageH - (story ? 80 : 62), zIndex: 10 }}>
        <div style={{ width: story ? 190 : 150, height: 12, background: props.theme.accent, marginBottom: 28 }} />
        <div style={{ maxWidth: 900 }}><AccentTitle props={{ ...props, theme: { ...props.theme, text: props.theme.deep } }} size={story ? 82 : 66} color={props.theme.deep} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22, color: alpha(props.theme.deep, .62), fontSize: 19, fontWeight: 700 }}>
          <CalendarDays size={20} />
          {props.newsDate ? formatDateLong(new Date(props.newsDate), props.lang) : props.subheadline || props.note}
        </div>
        {props.note && props.newsDate ? <div style={{ marginTop: 22, maxWidth: 820, fontSize: story ? 26 : 21, lineHeight: 1.55, color: alpha(props.theme.deep, .68) }}>{props.note}</div> : null}
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 72 : 52, borderTop: `1px solid ${alpha(props.theme.deep, .14)}`, paddingTop: 20, zIndex: 11 }}>
        <Footer props={{ ...props, theme: { ...props.theme, text: props.theme.deep, textDim: alpha(props.theme.deep, .6) } }} inverse />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12, background: props.theme.accent, zIndex: 14 }} />
    </PremiumRoot>
  );
}

function DocumentAlert(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const pad = story ? 76 : 64;
  return (
    <PremiumRoot props={props} style={{ background: `linear-gradient(155deg, ${props.theme.bgTop}, ${props.theme.bgBottom})` }}>
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', zIndex: 12 }}>
        <LogoLockup theme={props.theme} compact />
        <div style={{ padding: '10px 16px', borderRadius: 12, background: props.theme.accent, color: props.theme.onAccent, fontWeight: 950, fontSize: 17 }}>{props.badge || 'IMPORTANT UPDATE'}</div>
      </div>
      <div style={{ position: 'absolute', right: story ? 80 : 56, top: story ? 370 : 250, width: story ? 500 : 430, height: story ? 690 : 540, zIndex: 6 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 28, background: '#fffdf7', transform: 'rotate(6deg)', boxShadow: '0 42px 86px rgba(0,0,0,.38)', color: props.theme.deep, overflow: 'hidden' }}>
          <div style={{ height: 86, background: props.theme.accent }} />
          <FileText size={88} style={{ position: 'absolute', top: 116, left: 42, color: props.theme.deep }} />
          <div style={{ position: 'absolute', left: 42, right: 42, top: 235, height: 12, borderRadius: 99, background: alpha(props.theme.deep, .12), boxShadow: `0 40px 0 ${alpha(props.theme.deep,.09)},0 80px 0 ${alpha(props.theme.deep,.09)},0 120px 0 ${alpha(props.theme.deep,.09)}` }} />
          <div style={{ position: 'absolute', left: 42, bottom: 42, fontSize: 19, fontWeight: 900, color: props.theme.accent }}>ARIA HUB VERIFIED</div>
        </div>
        <HeroLayer props={props} width={story ? 560 : 480} height={story ? 720 : 570} fallback={null} />
      </div>
      <div style={{ position: 'absolute', left: pad, top: story ? 330 : 245, width: story ? 560 : 500, zIndex: 10 }}>
        <Eyebrow props={props} />
        <div style={{ marginTop: 26 }}><AccentTitle props={props} size={story ? 80 : 66} /></div>
        <div style={{ marginTop: 24, color: props.theme.textDim, fontSize: story ? 26 : 21, lineHeight: 1.5 }}>{props.subheadline || props.note}</div>
        <div style={{ marginTop: 26 }}><DeadlineBadge props={props} /></div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 72 : 52, zIndex: 12 }}><Footer props={props} /></div>
    </PremiumRoot>
  );
}

function StoryCinematic(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const h = HEIGHT[props.size];
  const pad = story ? 72 : 62;
  const media = normalizeStudioMedia(props.media);
  const background = media.background;
  return (
    <PremiumRoot props={props} foreground={false} style={{ background: props.theme.bgBottom }}>
      {background ? <img src={background.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${background.x}% ${background.y}%`, opacity: Math.max(.58, background.opacity), zIndex: 2 }} /> : null}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,10,25,.05) 0%, rgba(5,10,25,.1) 35%, rgba(5,10,25,.93) 82%, rgba(5,10,25,1) 100%)', zIndex: 4 }} />
      <HeroLayer props={props} width={story ? 920 : 720} height={story ? 1450 : 1000} fallback={
        <div style={{ position: 'absolute', left: '50%', top: story ? '43%' : '42%', transform: 'translate(-50%,-50%)', width: story ? 510 : 430, height: story ? 900 : 660, borderRadius: '260px 260px 70px 70px', background: `linear-gradient(160deg,${props.theme.accent},${props.theme.deep})`, boxShadow: '0 50px 100px rgba(0,0,0,.38)', zIndex: 6 }} />
      } />
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, zIndex: 12, display: 'flex', justifyContent: 'space-between' }}>
        <LogoLockup theme={props.theme} compact />
        <Eyebrow props={props} />
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 215 : 170, zIndex: 13 }}>
        <AccentTitle props={props} size={story ? 86 : 70} />
        {props.person ? <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center', fontSize: story ? 25 : 21, fontWeight: 800 }}><GraduationCap size={26} color={props.theme.accent} />{props.person.name}<span style={{ color: props.theme.textDim, fontWeight: 600 }}>• {props.person.meta}</span></div> : null}
        <div style={{ marginTop: 18, maxWidth: 840, color: props.theme.textDim, fontSize: story ? 25 : 20, lineHeight: 1.5 }}>{props.subheadline || props.note}</div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 56 : 42, zIndex: 13 }}><Footer props={props} /></div>
      <div style={{ position: 'absolute', right: 18, top: h * .3, writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 15, letterSpacing: 5, color: props.theme.accent, opacity: .72, zIndex: 12 }}>STORIES OF POSSIBILITY</div>
    </PremiumRoot>
  );
}

function StoryBigType(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const pad = story ? 70 : 60;
  const word = (props.accentText || props.badge || 'OPPORTUNITY').slice(0, 18);
  return (
    <PremiumRoot props={props} style={{ background: `linear-gradient(145deg,${props.theme.bgTop},${props.theme.bgBottom})` }}>
      <div style={{ position: 'absolute', left: -22, top: story ? 260 : 180, fontSize: story ? 250 : 185, lineHeight: .86, fontWeight: 950, letterSpacing: -12, color: 'transparent', WebkitTextStroke: `2px ${props.theme.accentLine}`, opacity: .55, zIndex: 4, direction: 'ltr' }}>{word.toUpperCase()}</div>
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, zIndex: 10, display: 'flex', justifyContent: 'space-between' }}>
        <LogoLockup theme={props.theme} compact />
        <Eyebrow props={props} />
      </div>
      <HeroLayer props={props} width={story ? 580 : 460} height={story ? 580 : 460} fallback={<ObjectFallback theme={props.theme} icon="cap" x={story ? 72 : 78} y={story ? 47 : 48} size={story ? 330 : 270} />} />
      <div style={{ position: 'absolute', left: pad, right: story ? 180 : 130, top: story ? 650 : 470, zIndex: 11 }}>
        <AccentTitle props={props} size={story ? 92 : 76} />
        <div style={{ marginTop: 24, maxWidth: 720, color: props.theme.textDim, fontSize: story ? 27 : 22, lineHeight: 1.5 }}>{props.subheadline || props.note}</div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 74 : 50, zIndex: 12 }}><Footer props={props} /></div>
    </PremiumRoot>
  );
}

function ConceptObjectHero(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const pad = story ? 76 : 64;
  return (
    <PremiumRoot props={props} style={{ background: `radial-gradient(ellipse at 50% 42%, ${alpha(props.theme.accent,.22)} 0%, ${props.theme.bgMid} 30%, ${props.theme.bgBottom} 72%)` }}>
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', zIndex: 12 }}>
        <LogoLockup theme={props.theme} compact />
        <Eyebrow props={props} />
      </div>
      <div style={{ position: 'absolute', left: '50%', top: story ? '46%' : '47%', transform: 'translate(-50%,-50%)', width: story ? 690 : 560, height: story ? 160 : 120, borderRadius: '50%', background: `linear-gradient(180deg,${alpha(props.theme.accent,.36)},rgba(0,0,0,.12))`, border: `1px solid ${props.theme.accentLine}`, boxShadow: '0 45px 85px rgba(0,0,0,.32)', zIndex: 4 }} />
      <HeroLayer props={props} width={story ? 800 : 660} height={story ? 800 : 660} fallback={<ObjectFallback theme={props.theme} icon="document" x={50} y={story ? 42 : 45} size={story ? 440 : 360} />} />
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 260 : 200, zIndex: 11, textAlign: 'center', display: 'grid', justifyItems: 'center' }}>
        <AccentTitle props={props} size={story ? 78 : 64} maxWidth={860} />
        <div style={{ marginTop: 20, maxWidth: 740, color: props.theme.textDim, fontSize: story ? 25 : 20, lineHeight: 1.5 }}>{props.subheadline || props.note}</div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 70 : 48, zIndex: 12 }}><Footer props={props} /></div>
    </PremiumRoot>
  );
}

function ConceptSurreal(props: PremiumTemplateProps) {
  const story = props.size === 'story';
  const pad = story ? 74 : 62;
  const h = HEIGHT[props.size];
  return (
    <PremiumRoot props={props} style={{ background: `linear-gradient(180deg,${props.theme.bgTop} 0%,${props.theme.bgMid} 48%,${props.theme.bgBottom} 100%)` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: story ? 760 : 470, height: 2, background: `linear-gradient(90deg,transparent,${props.theme.accent},transparent)`, opacity: .7, zIndex: 4 }} />
      <div style={{ position: 'absolute', left: '50%', top: story ? 765 : 475, transform: 'translate(-50%,-50%)', width: story ? 680 : 560, height: story ? 680 : 560, borderRadius: '50%', border: `18px solid ${props.theme.accent}`, boxShadow: `0 0 90px ${alpha(props.theme.accent,.38)}, inset 0 0 90px rgba(0,0,0,.45)`, zIndex: 5 }} />
      <div style={{ position: 'absolute', left: '50%', top: story ? 965 : 630, transform: 'translateX(-50%) perspective(700px) rotateX(62deg)', width: story ? 470 : 380, height: story ? 620 : 460, background: `linear-gradient(180deg,${props.theme.accent},transparent)`, opacity: .5, clipPath: 'polygon(35% 0,65% 0,100% 100%,0 100%)', filter: 'blur(1px)', zIndex: 4 }} />
      <HeroLayer props={props} width={story ? 760 : 620} height={story ? 900 : 700} fallback={null} />
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, zIndex: 12, display: 'flex', justifyContent: 'space-between' }}>
        <LogoLockup theme={props.theme} compact />
        <Eyebrow props={props} />
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, top: story ? 250 : 190, zIndex: 12, textAlign: 'center', display: 'grid', justifyItems: 'center' }}>
        <AccentTitle props={props} size={story ? 78 : 64} maxWidth={880} />
        <div style={{ marginTop: 20, maxWidth: 760, color: props.theme.textDim, fontSize: story ? 25 : 20, lineHeight: 1.5 }}>{props.subheadline || props.note}</div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: story ? 72 : 48, zIndex: 12 }}><Footer props={props} /></div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * .12, background: 'linear-gradient(transparent,rgba(0,0,0,.24))', zIndex: 3 }} />
    </PremiumRoot>
  );
}

export function PremiumTemplateCanvas(props: PremiumTemplateProps) {
  switch (props.family) {
    case 'scholarship-global-portal': return <ScholarshipPortal {...props} />;
    case 'scholarship-document-desk': return <ScholarshipDocumentDesk {...props} />;
    case 'scholarship-global-object': return <ScholarshipGlobalObject {...props} />;
    case 'career-desk': return <CareerDesk {...props} />;
    case 'career-ascent': return <CareerAscent {...props} />;
    case 'career-talent': return <CareerTalent {...props} />;
    case 'editorial-break': return <EditorialBreak {...props} />;
    case 'document-alert': return <DocumentAlert {...props} />;
    case 'story-cinematic': return <StoryCinematic {...props} />;
    case 'story-big-type': return <StoryBigType {...props} />;
    case 'concept-object-hero': return <ConceptObjectHero {...props} />;
    case 'concept-surreal': return <ConceptSurreal {...props} />;
    default: return null;
  }
}
