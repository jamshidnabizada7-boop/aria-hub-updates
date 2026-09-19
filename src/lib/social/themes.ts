/**
 * Studio theme system — palettes for the social-media canvases.
 *
 * The original design hardcoded ONE navy/gold palette in inline styles (a
 * requirement: canvases must render pixel-exactly for html-to-image and the
 * playwright renderer, so CSS classes/variables are off-limits). This module
 * turns that palette into DATA: every template reads its colors from a
 * StudioTheme instance, which makes whole design families a one-line switch.
 *
 * Token contract (what each key paints):
 *   bgTop/bgMid/bgBottom — the vertical background gradient stops
 *   deep                 — darkest panel/chip color (also QR dark)
 *   accent               — THE brand accent of this theme (headline keyword,
 *                          hairlines, kicker chip, CTA band base)
 *   accentSoft/Line/Faint— translucent accent variants (chips, dividers, glows)
 *   text / textDim       — primary and secondary copy on the background
 *   onAccent             — text color painted ON accent surfaces
 *   glowA/glowB          — the two radial ambience glows
 *   dots                 — the dot-grid overlay
 *   ctaFrom/ctaTo/ctaText— the bottom CTA band gradient + its text
 *   qrDark/qrLight       — QR code module colors
 *   logoBg               — chip behind the logo mark (keeps the logo legible
 *                          on light themes)
 *   surface/surfaceBorder— card surface for content blocks (deadline cards,
 *                          story chips, checklist rows)
 */

export type StudioThemeId = 'midnight' | 'emerald' | 'sunset' | 'ivory' | 'crimson';

export interface StudioTheme {
  id: StudioThemeId;
  label: string;
  dark: boolean;
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  deep: string;
  accent: string;
  accentSoft: string;
  accentLine: string;
  accentFaint: string;
  text: string;
  textDim: string;
  onAccent: string;
  glowA: string;
  glowB: string;
  dots: string;
  ctaFrom: string;
  ctaTo: string;
  ctaText: string;
  qrDark: string;
  qrLight: string;
  logoBg: string;
  surface: string;
  surfaceBorder: string;
}

export const STUDIO_THEMES: Record<StudioThemeId, StudioTheme> = {
  midnight: {
    id: 'midnight',
    label: 'Midnight (brand)',
    dark: true,
    bgTop: '#141F3D',
    bgMid: '#283868',
    bgBottom: '#16223F',
    deep: '#1B2440',
    accent: '#F8D898',
    accentSoft: 'rgba(248, 216, 152, 0.14)',
    accentLine: 'rgba(248, 216, 152, 0.45)',
    accentFaint: 'rgba(248, 216, 152, 0.08)',
    text: '#FFFFFF',
    textDim: 'rgba(255, 255, 255, 0.72)',
    onAccent: '#1B2440',
    glowA: 'rgba(248, 216, 152, 0.16)',
    glowB: 'rgba(96, 130, 255, 0.13)',
    dots: 'rgba(255, 255, 255, 0.05)',
    ctaFrom: '#F3D08A',
    ctaTo: '#F8D898',
    ctaText: '#1B2440',
    qrDark: '#1B2440',
    qrLight: '#FFFBF2',
    logoBg: '#F8D898',
    surface: 'rgba(255, 255, 255, 0.06)',
    surfaceBorder: 'rgba(248, 216, 152, 0.28)',
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald',
    dark: true,
    bgTop: '#06231C',
    bgMid: '#0D3D30',
    bgBottom: '#07281F',
    deep: '#0A2E24',
    accent: '#7FE7C4',
    accentSoft: 'rgba(127, 231, 196, 0.14)',
    accentLine: 'rgba(127, 231, 196, 0.45)',
    accentFaint: 'rgba(127, 231, 196, 0.08)',
    text: '#FFFFFF',
    textDim: 'rgba(234, 255, 247, 0.72)',
    onAccent: '#06231C',
    glowA: 'rgba(127, 231, 196, 0.16)',
    glowB: 'rgba(24, 190, 130, 0.14)',
    dots: 'rgba(255, 255, 255, 0.05)',
    ctaFrom: '#34D399',
    ctaTo: '#7FE7C4',
    ctaText: '#06231C',
    qrDark: '#06231C',
    qrLight: '#EFFFF8',
    logoBg: '#7FE7C4',
    surface: 'rgba(255, 255, 255, 0.06)',
    surfaceBorder: 'rgba(127, 231, 196, 0.28)',
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    dark: true,
    bgTop: '#2A1533',
    bgMid: '#4C2442',
    bgBottom: '#241226',
    deep: '#331A2E',
    accent: '#FFC08A',
    accentSoft: 'rgba(255, 192, 138, 0.15)',
    accentLine: 'rgba(255, 192, 138, 0.45)',
    accentFaint: 'rgba(255, 192, 138, 0.08)',
    text: '#FFFFFF',
    textDim: 'rgba(255, 240, 230, 0.72)',
    onAccent: '#331A2E',
    glowA: 'rgba(255, 150, 100, 0.18)',
    glowB: 'rgba(255, 90, 140, 0.13)',
    dots: 'rgba(255, 255, 255, 0.05)',
    ctaFrom: '#FF9E6E',
    ctaTo: '#FFC08A',
    ctaText: '#331A2E',
    qrDark: '#331A2E',
    qrLight: '#FFF4EC',
    logoBg: '#FFC08A',
    surface: 'rgba(255, 255, 255, 0.06)',
    surfaceBorder: 'rgba(255, 192, 138, 0.28)',
  },
  ivory: {
    id: 'ivory',
    label: 'Ivory (light)',
    dark: false,
    bgTop: '#F7F4EC',
    bgMid: '#FDFBF6',
    bgBottom: '#F0EBDF',
    deep: '#23201A',
    accent: '#A5822F',
    accentSoft: 'rgba(165, 130, 47, 0.12)',
    accentLine: 'rgba(165, 130, 47, 0.4)',
    accentFaint: 'rgba(165, 130, 47, 0.08)',
    text: '#1F1B12',
    textDim: 'rgba(31, 27, 18, 0.66)',
    onAccent: '#F7F4EC',
    glowA: 'rgba(176, 141, 62, 0.10)',
    glowB: 'rgba(120, 100, 60, 0.07)',
    dots: 'rgba(31, 27, 18, 0.05)',
    ctaFrom: '#23201A',
    ctaTo: '#3A352B',
    ctaText: '#F7F4EC',
    qrDark: '#23201A',
    qrLight: '#F7F4EC',
    logoBg: '#23201A',
    surface: 'rgba(255, 255, 255, 0.72)',
    surfaceBorder: 'rgba(31, 27, 18, 0.16)',
  },
  crimson: {
    id: 'crimson',
    label: 'Crimson cinema',
    dark: true,
    bgTop: '#2A070F',
    bgMid: '#7E1523',
    bgBottom: '#1C040A',
    deep: '#240610',
    accent: '#FFD24A',
    accentSoft: 'rgba(255, 210, 74, 0.14)',
    accentLine: 'rgba(255, 210, 74, 0.45)',
    accentFaint: 'rgba(255, 210, 74, 0.08)',
    text: '#FFFFFF',
    textDim: 'rgba(255, 235, 230, 0.75)',
    onAccent: '#2A070F',
    glowA: 'rgba(255, 96, 96, 0.22)',
    glowB: 'rgba(255, 210, 74, 0.10)',
    dots: 'rgba(255, 255, 255, 0.05)',
    ctaFrom: '#F3C64C',
    ctaTo: '#FFD24A',
    ctaText: '#2A070F',
    qrDark: '#2A070F',
    qrLight: '#FFF6EC',
    logoBg: '#FFD24A',
    surface: 'rgba(255, 255, 255, 0.07)',
    surfaceBorder: 'rgba(255, 150, 150, 0.30)',
  },
};

export const STUDIO_THEME_LIST = Object.values(STUDIO_THEMES);

export const DEFAULT_THEME_ID: StudioThemeId = 'midnight';

/** Resolve a theme id (from JSON props/DB) to its palette, with fallback. */
export function resolveTheme(id: string | null | undefined): StudioTheme {
  if (id && id in STUDIO_THEMES) return STUDIO_THEMES[id as StudioThemeId];
  return STUDIO_THEMES[DEFAULT_THEME_ID];
}

/**
 * Layout variants per canvas — genuinely different compositions, not recolors.
 * classic/minimal/bold are the originals; the rest are distinct design
 * families (split side-panel, framed classic, Swiss big-type, glass card,
 * top banner, perforated ticket). Every family shares the brand chrome
 * (logo lockup, accent word, QR/CTA) but composes it differently.
 */
export type StudioLayout =
  | 'classic' | 'minimal' | 'bold'
  | 'split' | 'frame' | 'stack' | 'glass' | 'banner' | 'ticket'
  | 'cinema';

export const LAYOUTS: { id: StudioLayout; label: string }[] = [
  { id: 'classic', label: 'Classic card' },
  { id: 'minimal', label: 'Minimal editorial' },
  { id: 'bold', label: 'Bold display' },
  { id: 'split', label: 'Split panel' },
  { id: 'frame', label: 'Framed' },
  { id: 'stack', label: 'Big-type stack' },
  { id: 'glass', label: 'Glass card' },
  { id: 'banner', label: 'Top banner' },
  { id: 'ticket', label: 'Ticket stub' },
  { id: 'cinema', label: 'Cinema (vignette + props)' },
];

export const DEFAULT_LAYOUT: StudioLayout = 'classic';

const LAYOUT_IDS = new Set<string>(LAYOUTS.map((l) => l.id));

export function resolveLayout(id: string | null | undefined): StudioLayout {
  if (id && LAYOUT_IDS.has(id)) return id as StudioLayout;
  return DEFAULT_LAYOUT;
}

/** Canvas dimensions per size, including the new 1080×1920 story format. */
export type PosterSizeId = 'square' | 'portrait' | 'story';

export const CANVAS_SIZES: Record<PosterSizeId, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: 'Square 1080×1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080×1350' },
  story: { w: 1080, h: 1920, label: 'Story 1080×1920' },
};

export function canvasHeight(size: string | null | undefined): number {
  if (size === 'story') return 1920;
  if (size === 'portrait') return 1350;
  return 1080;
}

export function resolveSize(size: string | null | undefined): PosterSizeId {
  if (size === 'story' || size === 'portrait') return size;
  return 'square';
}
